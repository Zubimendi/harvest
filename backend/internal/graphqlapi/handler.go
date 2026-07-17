package graphqlapi

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/harvest-app/backend/graph/resolvers"
)

type requestBody struct {
	Query         string                 `json:"query"`
	Variables     map[string]interface{} `json:"variables"`
	OperationName string                 `json:"operationName"`
}

type responseBody struct {
	Data   interface{} `json:"data,omitempty"`
	Errors []gqlError  `json:"errors,omitempty"`
}

type gqlError struct {
	Message string `json:"message"`
}

// Handler serves a minimal GraphQL HTTP API backed by the existing resolvers.
// Full gqlgen codegen can replace this later; mobile needs a live /query today.
func Handler(res *resolvers.Resolver) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, `{"errors":[{"message":"POST only"}]}`, http.StatusMethodNotAllowed)
			return
		}

		raw, err := io.ReadAll(r.Body)
		if err != nil {
			writeErr(w, err.Error(), http.StatusBadRequest)
			return
		}
		var req requestBody
		if err := json.Unmarshal(raw, &req); err != nil {
			writeErr(w, "invalid JSON body", http.StatusBadRequest)
			return
		}

		op := req.OperationName
		if op == "" {
			op = detectOperation(req.Query)
		}

		ctx := r.Context()
		vars := req.Variables
		if vars == nil {
			vars = map[string]interface{}{}
		}

		var data map[string]interface{}
		var execErr error

		switch op {
		case "NearbyListings":
			lat := asFloat(vars["latitude"])
			lng := asFloat(vars["longitude"])
			radius := asFloat(vars["radiusKm"])
			var cat *string
			if c, ok := vars["category"].(string); ok && c != "" {
				cat = &c
			}
			listings, err := res.NearbyListings(ctx, lat, lng, radius, cat)
			execErr = err
			data = map[string]interface{}{"nearbyListings": listings}

		case "ListingDetail":
			id := asString(vars["id"])
			listing, err := res.GetListing(ctx, id)
			execErr = err
			data = map[string]interface{}{"listing": listing}

		case "PublicProfile":
			id := asString(vars["id"])
			profile, err := res.PublicProfile(ctx, id)
			execErr = err
			data = map[string]interface{}{"publicProfile": profile}

		case "MyConversations":
			convs, err := res.MyConversations(ctx)
			execErr = err
			data = map[string]interface{}{"myConversations": convs}

		case "MyReservations":
			reservations, err := res.MyReservations(ctx)
			execErr = err
			data = map[string]interface{}{"myReservations": reservations}

		case "ConversationMessages":
			id := asString(vars["conversationId"])
			msgs, err := res.ConversationMessages(ctx, id)
			execErr = err
			data = map[string]interface{}{"conversationMessages": msgs}

		case "CreateListing":
			inputMap, _ := vars["input"].(map[string]interface{})
			input, err := mapCreateListingInput(inputMap)
			if err != nil {
				execErr = err
				break
			}
			listing, err := res.CreateListing(ctx, input)
			execErr = err
			data = map[string]interface{}{"createListing": listing}

		case "ReserveListing":
			id := asString(vars["id"])
			listing, err := res.ReserveListing(ctx, id)
			execErr = err
			data = map[string]interface{}{"reserveListing": listing}

		case "CancelReservation":
			id := asString(vars["id"])
			listing, err := res.CancelReservation(ctx, id)
			execErr = err
			data = map[string]interface{}{"cancelReservation": listing}

		case "ConfirmPickup":
			id := asString(vars["id"])
			listing, err := res.ConfirmPickup(ctx, id)
			execErr = err
			data = map[string]interface{}{"confirmPickup": listing}

		case "SendMessage":
			cid := asString(vars["conversationId"])
			body := asString(vars["body"])
			msg, err := res.SendMessage(ctx, cid, body)
			execErr = err
			data = map[string]interface{}{"sendMessage": msg}

		case "SubmitReview":
			lid := asString(vars["listingId"])
			rating := int(asFloat(vars["rating"]))
			var comment *string
			if c, ok := vars["comment"].(string); ok {
				comment = &c
			}
			ok, err := res.SubmitReview(ctx, lid, rating, comment)
			execErr = err
			data = map[string]interface{}{"submitReview": ok}

		case "ReportListing":
			lid := asString(vars["listingId"])
			reason := asString(vars["reason"])
			var details *string
			if d, ok := vars["details"].(string); ok {
				details = &d
			}
			ok, err := res.ReportListing(ctx, lid, reason, details)
			execErr = err
			data = map[string]interface{}{"reportListing": ok}

		case "ReportUser":
			uid := asString(vars["userId"])
			reason := asString(vars["reason"])
			var details *string
			if d, ok := vars["details"].(string); ok {
				details = &d
			}
			ok, err := res.ReportUser(ctx, uid, reason, details)
			execErr = err
			data = map[string]interface{}{"reportUser": ok}

		default:
			// Support anonymous operation documents that only contain nearbyListings
			if strings.Contains(req.Query, "nearbyListings") {
				lat := asFloat(vars["latitude"])
				lng := asFloat(vars["longitude"])
				radius := asFloat(vars["radiusKm"])
				var cat *string
				if c, ok := vars["category"].(string); ok && c != "" {
					cat = &c
				}
				listings, err := res.NearbyListings(ctx, lat, lng, radius, cat)
				execErr = err
				data = map[string]interface{}{"nearbyListings": listings}
			} else {
				writeErr(w, "unsupported operation: "+op, http.StatusBadRequest)
				return
			}
		}

		w.Header().Set("Content-Type", "application/json")
		if execErr != nil {
			_ = json.NewEncoder(w).Encode(responseBody{Errors: []gqlError{{Message: execErr.Error()}}})
			return
		}
		if err := json.NewEncoder(w).Encode(responseBody{Data: data}); err != nil {
			// Avoid silent empty 200s (e.g. historical circular refs)
			http.Error(w, `{"errors":[{"message":"failed to encode response"}]}`, http.StatusInternalServerError)
		}
	}
}

func writeErr(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(responseBody{Errors: []gqlError{{Message: msg}}})
}

func detectOperation(query string) string {
	for _, name := range []string{
		"NearbyListings", "ListingDetail", "PublicProfile", "MyConversations",
		"MyReservations", "ConversationMessages", "CreateListing", "ReserveListing",
		"CancelReservation", "ConfirmPickup", "SendMessage", "SubmitReview",
		"ReportListing", "ReportUser",
	} {
		if strings.Contains(query, name) {
			return name
		}
	}
	return ""
}

func asFloat(v interface{}) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case float32:
		return float64(t)
	case int:
		return float64(t)
	case int64:
		return float64(t)
	case json.Number:
		f, _ := t.Float64()
		return f
	default:
		return 0
	}
}

func asString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func mapCreateListingInput(m map[string]interface{}) (resolvers.CreateListingInput, error) {
	in := resolvers.CreateListingInput{}
	if m == nil {
		return in, nil
	}
	in.Title = asString(m["title"])
	in.Category = asString(m["category"])
	in.Latitude = asFloat(m["latitude"])
	in.Longitude = asFloat(m["longitude"])
	if d, ok := m["description"].(string); ok {
		in.Description = &d
	}
	if q, ok := m["quantity"].(string); ok && q != "" {
		in.Quantity = &q
	}
	if s, ok := m["suggestedDonation"].(string); ok && s != "" {
		in.SuggestedDonation = &s
	}
	if photos, ok := m["photos"].([]interface{}); ok {
		for _, p := range photos {
			if s, ok := p.(string); ok {
				in.Photos = append(in.Photos, s)
			}
		}
	}
	if start, ok := m["pickupWindowStart"].(string); ok {
		if t, err := time.Parse(time.RFC3339, start); err == nil {
			in.PickupWindowStart = t
		}
	}
	if end, ok := m["pickupWindowEnd"].(string); ok {
		if t, err := time.Parse(time.RFC3339, end); err == nil {
			in.PickupWindowEnd = t
		}
	}
	return in, nil
}
