package resolvers

// ============================================================================
// Harvest — GraphQL Resolvers
// ============================================================================
// This file contains the full implementation of every resolver defined in
// schema.graphqls. It is written to be compatible with the types that gqlgen
// will generate once `go run github.com/99designs/gqlgen generate` is executed.
//
// To build:
//   1. cd backend && go mod tidy
//   2. go run github.com/99designs/gqlgen generate
//   3. go build ./cmd/server
//
// Until gqlgen is run, the model types are referenced as inline structs so
// this file serves as a readable, copy-pasteable reference even before
// code-generation. After generation, swap inline structs for model.* types
// and implement the generated interfaces.
// ============================================================================

import (
	"context"
	"fmt"
	"log"
	"math"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/harvest-app/backend/internal/auth"
	"github.com/harvest-app/backend/internal/pubsub"
	"github.com/jackc/pgx/v5"
)

// ── helpers ──────────────────────────────────────────────────────────────────

// requireAuth extracts the authenticated user ID from context or returns an error.
func requireAuth(ctx context.Context) (string, error) {
	uid := auth.GetUserID(ctx)
	if uid == nil {
		return "", fmt.Errorf("authentication required")
	}
	return *uid, nil
}

// jitterCoordinate adds a random offset of ±~100 m to a coordinate for privacy.
func jitterCoordinate(lat, lng float64) (float64, float64) {
	// ~100 m ≈ 0.0009 degrees latitude
	const offset = 0.0009
	jLat := lat + (rand.Float64()*2-1)*offset
	jLng := lng + (rand.Float64()*2-1)*offset/math.Cos(lat*math.Pi/180)
	return jLat, jLng
}

// ── Listing types (mirrors model.* after gqlgen runs) ────────────────────────

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type User struct {
	ID          string    `json:"id"`
	DisplayName string    `json:"displayName"`
	AvatarURL   *string   `json:"avatarUrl"`
	Bio         *string   `json:"bio"`
	IsBusiness  bool      `json:"isBusiness"`
	RatingAvg   float64   `json:"ratingAvg"`
	RatingCount int       `json:"ratingCount"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Listing struct {
	ID                string    `json:"id"`
	Owner             *User     `json:"owner"`
	Title             string    `json:"title"`
	Description       *string   `json:"description"`
	Category          string    `json:"category"`
	Photos            []string  `json:"photos"`
	Quantity          *string   `json:"quantity"`
	SuggestedDonation *string   `json:"suggestedDonation"`
	Status            string    `json:"status"`
	PickupWindowStart time.Time `json:"pickupWindowStart"`
	PickupWindowEnd   time.Time `json:"pickupWindowEnd"`
	DisplayLocation   Location  `json:"displayLocation"`
	TrueLocation      *Location `json:"trueLocation"`
	ReservedBy        *User     `json:"reservedBy"`
	Conversation      *Conversation `json:"conversation"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type Message struct {
	ID        string    `json:"id"`
	Sender    *User     `json:"sender"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"createdAt"`
}

type Conversation struct {
	ID           string     `json:"id"`
	Listing      *Listing   `json:"listing"`
	Messages     []*Message `json:"messages"`
	Participants []*User    `json:"participants"`
}

type CreateListingInput struct {
	Title             string  `json:"title"`
	Description       *string `json:"description"`
	Category          string  `json:"category"`
	Photos            []string `json:"photos"`
	Quantity          *string `json:"quantity"`
	SuggestedDonation *string `json:"suggestedDonation"`
	PickupWindowStart time.Time `json:"pickupWindowStart"`
	PickupWindowEnd   time.Time `json:"pickupWindowEnd"`
	Latitude          float64 `json:"latitude"`
	Longitude         float64 `json:"longitude"`
}

// ── Query Resolvers ──────────────────────────────────────────────────────────

// NearbyListings returns active listings within radiusKm of the given point.
// Optionally filters by category. Sorted by distance ascending.
func (r *Resolver) NearbyListings(ctx context.Context, latitude, longitude, radiusKm float64, category *string) ([]*Listing, error) {
	query := `
		SELECT
			l.id, l.title, l.description, l.category, l.photos, l.quantity,
			l.suggested_donation, l.status, l.pickup_window_start, l.pickup_window_end,
			ST_Y(l.display_location::geometry) as display_lat,
			ST_X(l.display_location::geometry) as display_lng,
			l.created_at, l.updated_at,
			u.id, u.display_name, u.avatar_url, u.bio, u.is_business,
			u.rating_sum, u.rating_count, u.created_at
		FROM public.listings l
		JOIN public.users u ON l.owner_id = u.id
		WHERE l.status = 'ACTIVE'
		  AND ST_DWithin(l.display_location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3 * 1000)
	`
	args := []interface{}{longitude, latitude, radiusKm}

	if category != nil && *category != "" {
		query += " AND l.category = $4"
		args = append(args, *category)
	}

	query += " ORDER BY l.display_location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography ASC"

	rows, err := r.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("nearbyListings query: %w", err)
	}
	defer rows.Close()

	var listings []*Listing
	for rows.Next() {
		l := &Listing{DisplayLocation: Location{}}
		owner := &User{}
		var ratingSum, ratingCount int
		err := rows.Scan(
			&l.ID, &l.Title, &l.Description, &l.Category, &l.Photos, &l.Quantity,
			&l.SuggestedDonation, &l.Status, &l.PickupWindowStart, &l.PickupWindowEnd,
			&l.DisplayLocation.Latitude, &l.DisplayLocation.Longitude,
			&l.CreatedAt, &l.UpdatedAt,
			&owner.ID, &owner.DisplayName, &owner.AvatarURL, &owner.Bio, &owner.IsBusiness,
			&ratingSum, &ratingCount, &owner.CreatedAt,
		)
		if err != nil {
			log.Printf("nearbyListings scan: %v", err)
			continue
		}
		if ratingCount > 0 {
			owner.RatingAvg = float64(ratingSum) / float64(ratingCount)
		}
		owner.RatingCount = ratingCount
		l.Owner = owner
		listings = append(listings, l)
	}

	return listings, nil
}

// Listing returns a single listing by ID with owner and reservation info.
func (r *Resolver) GetListing(ctx context.Context, id string) (*Listing, error) {
	query := `
		SELECT
			l.id, l.title, l.description, l.category, l.photos, l.quantity,
			l.suggested_donation, l.status, l.pickup_window_start, l.pickup_window_end,
			ST_Y(l.display_location::geometry) as display_lat,
			ST_X(l.display_location::geometry) as display_lng,
			ST_Y(l.true_location::geometry) as true_lat,
			ST_X(l.true_location::geometry) as true_lng,
			l.reserved_by, l.created_at, l.updated_at,
			u.id, u.display_name, u.avatar_url, u.bio, u.is_business,
			u.rating_sum, u.rating_count, u.created_at
		FROM public.listings l
		JOIN public.users u ON l.owner_id = u.id
		WHERE l.id = $1
	`

	l := &Listing{DisplayLocation: Location{}}
	owner := &User{}
	var trueLat, trueLng float64
	var reservedBy *string
	var ratingSum, ratingCount int

	err := r.Pool.QueryRow(ctx, query, id).Scan(
		&l.ID, &l.Title, &l.Description, &l.Category, &l.Photos, &l.Quantity,
		&l.SuggestedDonation, &l.Status, &l.PickupWindowStart, &l.PickupWindowEnd,
		&l.DisplayLocation.Latitude, &l.DisplayLocation.Longitude,
		&trueLat, &trueLng,
		&reservedBy, &l.CreatedAt, &l.UpdatedAt,
		&owner.ID, &owner.DisplayName, &owner.AvatarURL, &owner.Bio, &owner.IsBusiness,
		&ratingSum, &ratingCount, &owner.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("listing not found")
		}
		return nil, fmt.Errorf("getListing: %w", err)
	}

	if ratingCount > 0 {
		owner.RatingAvg = float64(ratingSum) / float64(ratingCount)
	}
	owner.RatingCount = ratingCount
	l.Owner = owner

	// Only reveal true location to the owner or the reserver
	callerID := auth.GetUserID(ctx)
	if callerID != nil && (*callerID == owner.ID || (reservedBy != nil && *callerID == *reservedBy)) {
		l.TrueLocation = &Location{Latitude: trueLat, Longitude: trueLng}
	}

	// Attach reserved user info if present
	if reservedBy != nil {
		reserver := &User{}
		err := r.Pool.QueryRow(ctx, `
			SELECT id, display_name, avatar_url, bio, is_business, rating_sum, rating_count, created_at
			FROM public.users WHERE id = $1
		`, *reservedBy).Scan(
			&reserver.ID, &reserver.DisplayName, &reserver.AvatarURL, &reserver.Bio,
			&reserver.IsBusiness, &ratingSum, &ratingCount, &reserver.CreatedAt,
		)
		if err == nil {
			if ratingCount > 0 {
				reserver.RatingAvg = float64(ratingSum) / float64(ratingCount)
			}
			reserver.RatingCount = ratingCount
			l.ReservedBy = reserver
		}
	}

	// Attach conversation if one exists for this listing and the caller is a participant.
	// Do NOT nest Listing back onto Conversation — that creates a JSON cycle and
	// encoding fails with an empty body (Apollo: "Unexpected end of input").
	if callerID != nil {
		var convID string
		err := r.Pool.QueryRow(ctx, `
			SELECT c.id FROM public.conversations c
			JOIN public.conversation_participants cp ON cp.conversation_id = c.id
			WHERE c.listing_id = $1 AND cp.user_id = $2
			ORDER BY c.created_at DESC
			LIMIT 1
		`, id, *callerID).Scan(&convID)
		if err == nil {
			l.Conversation = &Conversation{ID: convID}
		}
	}

	return l, nil
}

// PublicProfile returns a user's public profile by ID.
func (r *Resolver) PublicProfile(ctx context.Context, id string) (*User, error) {
	user := &User{}
	var ratingSum, ratingCount int

	err := r.Pool.QueryRow(ctx, `
		SELECT id, display_name, avatar_url, bio, is_business, rating_sum, rating_count, created_at
		FROM public.users WHERE id = $1
	`, id).Scan(
		&user.ID, &user.DisplayName, &user.AvatarURL, &user.Bio,
		&user.IsBusiness, &ratingSum, &ratingCount, &user.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("publicProfile: %w", err)
	}

	if ratingCount > 0 {
		user.RatingAvg = float64(ratingSum) / float64(ratingCount)
	}
	user.RatingCount = ratingCount
	return user, nil
}

// MyConversations returns all conversations the authenticated user is part of.
func (r *Resolver) MyConversations(ctx context.Context) ([]*Conversation, error) {
	userID, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := r.Pool.Query(ctx, `
		SELECT c.id, c.listing_id, c.created_at,
			l.id, l.title, l.status, l.photos,
			ST_Y(l.display_location::geometry), ST_X(l.display_location::geometry)
		FROM public.conversations c
		JOIN public.conversation_participants cp ON cp.conversation_id = c.id
		JOIN public.listings l ON l.id = c.listing_id
		WHERE cp.user_id = $1
		ORDER BY c.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("myConversations: %w", err)
	}

	// Materialize first — do not nest queries while the outer rows hold a pool conn
	// (pgxpool deadlock → Inbox/Browse hang forever).
	type convRow struct {
		conv    *Conversation
		listing *Listing
	}
	var pending []convRow
	for rows.Next() {
		conv := &Conversation{Participants: []*User{}, Messages: []*Message{}}
		listing := &Listing{DisplayLocation: Location{}, Photos: []string{}}
		var listingID string
		var convCreatedAt time.Time

		err := rows.Scan(
			&conv.ID, &listingID, &convCreatedAt,
			&listing.ID, &listing.Title, &listing.Status, &listing.Photos,
			&listing.DisplayLocation.Latitude, &listing.DisplayLocation.Longitude,
		)
		if err != nil {
			log.Printf("myConversations scan: %v", err)
			continue
		}
		conv.Listing = listing
		pending = append(pending, convRow{conv: conv, listing: listing})
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("myConversations rows: %w", err)
	}

	conversations := make([]*Conversation, 0, len(pending))
	for _, item := range pending {
		conv := item.conv

		pRows, err := r.Pool.Query(ctx, `
			SELECT u.id, u.display_name, u.avatar_url
			FROM public.conversation_participants cp
			JOIN public.users u ON u.id = cp.user_id
			WHERE cp.conversation_id = $1
		`, conv.ID)
		if err == nil {
			for pRows.Next() {
				p := &User{}
				if scanErr := pRows.Scan(&p.ID, &p.DisplayName, &p.AvatarURL); scanErr == nil {
					conv.Participants = append(conv.Participants, p)
				}
			}
			pRows.Close()
		}

		lastMsg := &Message{Sender: &User{}}
		err = r.Pool.QueryRow(ctx, `
			SELECT m.id, m.body, m.created_at, u.id, u.display_name
			FROM public.messages m
			JOIN public.users u ON u.id = m.sender_id
			WHERE m.conversation_id = $1
			ORDER BY m.created_at DESC LIMIT 1
		`, conv.ID).Scan(
			&lastMsg.ID, &lastMsg.Body, &lastMsg.CreatedAt,
			&lastMsg.Sender.ID, &lastMsg.Sender.DisplayName,
		)
		if err == nil {
			conv.Messages = []*Message{lastMsg}
		}

		conversations = append(conversations, conv)
	}

	return conversations, nil
}

// MyReservations returns listings the authenticated user has reserved,
// including completed pickups (reserved_by survives PICKED_UP).
func (r *Resolver) MyReservations(ctx context.Context) ([]*Listing, error) {
	userID, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := r.Pool.Query(ctx, `
		SELECT
			l.id, l.title, l.description, l.category, l.photos, l.quantity,
			l.suggested_donation, l.status, l.pickup_window_start, l.pickup_window_end,
			ST_Y(l.display_location::geometry), ST_X(l.display_location::geometry),
			l.created_at, l.updated_at,
			u.id, u.display_name, u.avatar_url, u.bio, u.is_business,
			u.rating_sum, u.rating_count, u.created_at
		FROM public.listings l
		JOIN public.users u ON l.owner_id = u.id
		WHERE l.reserved_by = $1
		ORDER BY l.updated_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("myReservations: %w", err)
	}
	defer rows.Close()

	listings := []*Listing{}
	for rows.Next() {
		l := &Listing{DisplayLocation: Location{}}
		owner := &User{}
		var ratingSum, ratingCount int
		err := rows.Scan(
			&l.ID, &l.Title, &l.Description, &l.Category, &l.Photos, &l.Quantity,
			&l.SuggestedDonation, &l.Status, &l.PickupWindowStart, &l.PickupWindowEnd,
			&l.DisplayLocation.Latitude, &l.DisplayLocation.Longitude,
			&l.CreatedAt, &l.UpdatedAt,
			&owner.ID, &owner.DisplayName, &owner.AvatarURL, &owner.Bio, &owner.IsBusiness,
			&ratingSum, &ratingCount, &owner.CreatedAt,
		)
		if err != nil {
			log.Printf("myReservations scan: %v", err)
			continue
		}
		if ratingCount > 0 {
			owner.RatingAvg = float64(ratingSum) / float64(ratingCount)
		}
		owner.RatingCount = ratingCount
		l.Owner = owner
		listings = append(listings, l)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("myReservations rows: %w", err)
	}

	return listings, nil
}

// ConversationMessages returns all messages for a conversation.
func (r *Resolver) ConversationMessages(ctx context.Context, conversationID string) ([]*Message, error) {
	userID, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	// Verify the user is a participant
	var exists bool
	err = r.Pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM public.conversation_participants
			WHERE conversation_id = $1 AND user_id = $2
		)
	`, conversationID, userID).Scan(&exists)
	if err != nil || !exists {
		return nil, fmt.Errorf("not a participant in this conversation")
	}

	rows, err := r.Pool.Query(ctx, `
		SELECT m.id, m.body, m.created_at,
			u.id, u.display_name, u.avatar_url
		FROM public.messages m
		JOIN public.users u ON u.id = m.sender_id
		WHERE m.conversation_id = $1
		ORDER BY m.created_at ASC
	`, conversationID)
	if err != nil {
		return nil, fmt.Errorf("conversationMessages: %w", err)
	}
	defer rows.Close()

	var messages []*Message
	for rows.Next() {
		msg := &Message{Sender: &User{}}
		err := rows.Scan(
			&msg.ID, &msg.Body, &msg.CreatedAt,
			&msg.Sender.ID, &msg.Sender.DisplayName, &msg.Sender.AvatarURL,
		)
		if err != nil {
			log.Printf("conversationMessages scan: %v", err)
			continue
		}
		messages = append(messages, msg)
	}

	if messages == nil {
		messages = []*Message{}
	}
	return messages, nil
}

// ── Mutation Resolvers ───────────────────────────────────────────────────────

// CreateListing creates a new listing with a jittered display location for privacy.
func (r *Resolver) CreateListing(ctx context.Context, input CreateListingInput) (*Listing, error) {
	userID, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	// Validate pickup window
	if input.PickupWindowEnd.Before(time.Now()) {
		return nil, fmt.Errorf("pickup window end time must be in the future")
	}
	if input.PickupWindowEnd.Before(input.PickupWindowStart) {
		return nil, fmt.Errorf("pickup window end must be after start")
	}

	// Jitter coordinates for display privacy
	dispLat, dispLng := jitterCoordinate(input.Latitude, input.Longitude)

	listingID := uuid.New().String()

	query := `
		INSERT INTO public.listings (
			id, owner_id, title, description, category, photos, quantity,
			suggested_donation, pickup_window_start, pickup_window_end,
			true_location, display_location, status
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			ST_SetSRID(ST_MakePoint($11, $12), 4326)::geography,
			ST_SetSRID(ST_MakePoint($13, $14), 4326)::geography,
			'ACTIVE'
		)
	`

	_, err = r.Pool.Exec(ctx, query,
		listingID, userID, input.Title, input.Description, input.Category,
		input.Photos, input.Quantity, input.SuggestedDonation,
		input.PickupWindowStart, input.PickupWindowEnd,
		input.Longitude, input.Latitude,    // true location (lng, lat for ST_MakePoint)
		dispLng, dispLat,                    // display location (jittered)
	)
	if err != nil {
		return nil, fmt.Errorf("createListing insert: %w", err)
	}

	// Fetch and return the created listing
	return r.GetListing(ctx, listingID)
}

// ReserveListing transitions a listing from ACTIVE to RESERVED and creates a conversation.
func (r *Resolver) ReserveListing(ctx context.Context, id string) (*Listing, error) {
	userID, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	// Atomic: update only if ACTIVE and not own listing
	tag, err := r.Pool.Exec(ctx, `
		UPDATE public.listings
		SET status = 'RESERVED', reserved_by = $1, reserved_at = NOW(), updated_at = NOW()
		WHERE id = $2 AND status = 'ACTIVE' AND owner_id != $1
	`, userID, id)
	if err != nil {
		return nil, fmt.Errorf("reserveListing: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("listing not available for reservation (may be already reserved, expired, or your own listing)")
	}

	// Get the owner ID for conversation creation
	var ownerID string
	err = r.Pool.QueryRow(ctx, `SELECT owner_id FROM public.listings WHERE id = $1`, id).Scan(&ownerID)
	if err != nil {
		return nil, fmt.Errorf("reserveListing get owner: %w", err)
	}

	// Create conversation between owner and reserver
	convID := uuid.New().String()
	_, err = r.Pool.Exec(ctx, `INSERT INTO public.conversations (id, listing_id) VALUES ($1, $2)`, convID, id)
	if err != nil {
		return nil, fmt.Errorf("reserveListing create conversation: %w", err)
	}

	// Add both participants
	_, err = r.Pool.Exec(ctx, `
		INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)
	`, convID, ownerID, userID)
	if err != nil {
		return nil, fmt.Errorf("reserveListing add participants: %w", err)
	}

	// Publish update for real-time subscribers
	r.PubSub.Publish(fmt.Sprintf("listing_%s", id), pubsub.Event{Type: "RESERVED"})

	return r.GetListing(ctx, id)
}

// CancelReservation reverts a reserved listing to ACTIVE.
func (r *Resolver) CancelReservation(ctx context.Context, id string) (*Listing, error) {
	userID, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	// Only the reserver or the owner can cancel
	tag, err := r.Pool.Exec(ctx, `
		UPDATE public.listings
		SET status = 'ACTIVE', reserved_by = NULL, reserved_at = NULL, updated_at = NOW()
		WHERE id = $1 AND status = 'RESERVED' AND (reserved_by = $2 OR owner_id = $2)
	`, id, userID)
	if err != nil {
		return nil, fmt.Errorf("cancelReservation: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("cannot cancel: listing not in reserved state or you are not authorized")
	}

	r.PubSub.Publish(fmt.Sprintf("listing_%s", id), pubsub.Event{Type: "CANCELLED"})

	return r.GetListing(ctx, id)
}

// ConfirmPickup transitions a reserved listing to PICKED_UP. Only the owner can confirm.
func (r *Resolver) ConfirmPickup(ctx context.Context, id string) (*Listing, error) {
	userID, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	tag, err := r.Pool.Exec(ctx, `
		UPDATE public.listings
		SET status = 'PICKED_UP', updated_at = NOW()
		WHERE id = $1 AND status = 'RESERVED' AND owner_id = $2
	`, id, userID)
	if err != nil {
		return nil, fmt.Errorf("confirmPickup: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("cannot confirm: listing not reserved or you are not the owner")
	}

	r.PubSub.Publish(fmt.Sprintf("listing_%s", id), pubsub.Event{Type: "PICKED_UP"})

	return r.GetListing(ctx, id)
}

// SendMessage adds a message to a conversation and publishes it for real-time delivery.
func (r *Resolver) SendMessage(ctx context.Context, conversationID, body string) (*Message, error) {
	userID, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	// Verify the user is a participant
	var exists bool
	err = r.Pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM public.conversation_participants
			WHERE conversation_id = $1 AND user_id = $2
		)
	`, conversationID, userID).Scan(&exists)
	if err != nil || !exists {
		return nil, fmt.Errorf("not a participant in this conversation")
	}

	msgID := uuid.New().String()
	now := time.Now()

	_, err = r.Pool.Exec(ctx, `
		INSERT INTO public.messages (id, conversation_id, sender_id, body, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`, msgID, conversationID, userID, body, now)
	if err != nil {
		return nil, fmt.Errorf("sendMessage: %w", err)
	}

	// Fetch sender info
	sender := &User{}
	r.Pool.QueryRow(ctx, `
		SELECT id, display_name, avatar_url FROM public.users WHERE id = $1
	`, userID).Scan(&sender.ID, &sender.DisplayName, &sender.AvatarURL)

	msg := &Message{
		ID:        msgID,
		Sender:    sender,
		Body:      body,
		CreatedAt: now,
	}

	// Publish for real-time subscription
	r.PubSub.Publish(fmt.Sprintf("conversation_%s", conversationID), pubsub.Event{
		Type:    "NEW_MESSAGE",
		Payload: msg,
	})

	return msg, nil
}

// SubmitReview records a rating + optional comment. The DB trigger handles aggregation.
func (r *Resolver) SubmitReview(ctx context.Context, listingID string, rating int, comment *string) (bool, error) {
	userID, err := requireAuth(ctx)
	if err != nil {
		return false, err
	}

	if rating < 1 || rating > 5 {
		return false, fmt.Errorf("rating must be between 1 and 5")
	}

	// Determine the reviewee: if I'm the owner, reviewee is the reserver, and vice versa
	var ownerID, reservedBy string
	err = r.Pool.QueryRow(ctx, `
		SELECT owner_id, COALESCE(reserved_by::text, '') FROM public.listings
		WHERE id = $1 AND status = 'PICKED_UP'
	`, listingID).Scan(&ownerID, &reservedBy)
	if err != nil {
		return false, fmt.Errorf("listing not found or not in picked_up state")
	}

	var revieweeID string
	if userID == ownerID {
		revieweeID = reservedBy
	} else if userID == reservedBy {
		revieweeID = ownerID
	} else {
		return false, fmt.Errorf("you are not a party to this listing")
	}

	if revieweeID == "" {
		return false, fmt.Errorf("no counterpart to review")
	}

	_, err = r.Pool.Exec(ctx, `
		INSERT INTO public.reviews (id, listing_id, reviewer_id, reviewee_id, rating, comment)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, uuid.New().String(), listingID, userID, revieweeID, rating, comment)
	if err != nil {
		return false, fmt.Errorf("submitReview: %w (you may have already reviewed this listing)", err)
	}

	return true, nil
}

// ReportListing creates a report against a listing.
func (r *Resolver) ReportListing(ctx context.Context, listingID, reason string, details *string) (bool, error) {
	userID, err := requireAuth(ctx)
	if err != nil {
		return false, err
	}

	_, err = r.Pool.Exec(ctx, `
		INSERT INTO public.reports (id, reported_listing_id, reporter_id, reason, details)
		VALUES ($1, $2, $3, $4, $5)
	`, uuid.New().String(), listingID, userID, reason, details)
	if err != nil {
		return false, fmt.Errorf("reportListing: %w", err)
	}

	return true, nil
}

// ReportUser creates a report against a user.
func (r *Resolver) ReportUser(ctx context.Context, userIDToReport, reason string, details *string) (bool, error) {
	userID, err := requireAuth(ctx)
	if err != nil {
		return false, err
	}

	_, err = r.Pool.Exec(ctx, `
		INSERT INTO public.reports (id, reported_user_id, reporter_id, reason, details)
		VALUES ($1, $2, $3, $4, $5)
	`, uuid.New().String(), userIDToReport, userID, reason, details)
	if err != nil {
		return false, fmt.Errorf("reportUser: %w", err)
	}

	return true, nil
}

// ── Subscription Resolvers ───────────────────────────────────────────────────

// ListingUpdated pushes listing updates to subscribers via the PubSub system.
func (r *Resolver) ListingUpdated(ctx context.Context, id string) (<-chan *Listing, error) {
	topic := fmt.Sprintf("listing_%s", id)
	events := r.PubSub.Subscribe(topic)

	ch := make(chan *Listing, 1)

	go func() {
		defer r.PubSub.Unsubscribe(topic, events)
		defer close(ch)

		for {
			select {
			case <-ctx.Done():
				return
			case _, ok := <-events:
				if !ok {
					return
				}
				// Re-fetch the listing to get the latest state
				listing, err := r.GetListing(ctx, id)
				if err != nil {
					log.Printf("listingUpdated fetch: %v", err)
					continue
				}
				select {
				case ch <- listing:
				default:
				}
			}
		}
	}()

	return ch, nil
}

// NewMessage pushes new messages to conversation subscribers.
func (r *Resolver) NewMessage(ctx context.Context, conversationID string) (<-chan *Message, error) {
	userID, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	// Verify the user is a participant
	var exists bool
	err = r.Pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM public.conversation_participants
			WHERE conversation_id = $1 AND user_id = $2
		)
	`, conversationID, userID).Scan(&exists)
	if err != nil || !exists {
		return nil, fmt.Errorf("not a participant in this conversation")
	}

	topic := fmt.Sprintf("conversation_%s", conversationID)
	events := r.PubSub.Subscribe(topic)

	ch := make(chan *Message, 1)

	go func() {
		defer r.PubSub.Unsubscribe(topic, events)
		defer close(ch)

		for {
			select {
			case <-ctx.Done():
				return
			case event, ok := <-events:
				if !ok {
					return
				}
				if msg, ok := event.Payload.(*Message); ok {
					select {
					case ch <- msg:
					default:
					}
				}
			}
		}
	}()

	return ch, nil
}
