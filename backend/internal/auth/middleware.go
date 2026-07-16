package auth

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey struct{ name string }

var UserIDKey = &contextKey{"userID"}

// Middleware intercepts the Authorization header, validates the Supabase JWT,
// and injects the authenticated user ID into the request context.
//
// If no Authorization header is present, the request continues as anonymous
// (queries that don't require auth will still work). If the header is present
// but invalid, the request is rejected with 401.
func Middleware(next http.Handler) http.Handler {
	jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			// Anonymous access — allowed for browsing
			next.ServeHTTP(w, r)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		var token *jwt.Token
		var err error

		if jwtSecret != "" {
			// Production: verify with Supabase JWT secret (HS256)
			token, err = jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
				}
				return []byte(jwtSecret), nil
			})
		} else {
			// Development fallback: parse without verification
			// WARNING: only for local dev when SUPABASE_JWT_SECRET is not set
			parser := jwt.NewParser(jwt.WithoutClaimsValidation())
			token, _, err = parser.ParseUnverified(tokenString, jwt.MapClaims{})
		}

		if err != nil {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			if sub, ok := claims["sub"].(string); ok {
				ctx := context.WithValue(r.Context(), UserIDKey, sub)
				r = r.WithContext(ctx)
			}
		}

		next.ServeHTTP(w, r)
	})
}

// GetUserID retrieves the authenticated user ID from context.
// Returns nil if the request is unauthenticated (anonymous).
func GetUserID(ctx context.Context) *string {
	if id, ok := ctx.Value(UserIDKey).(string); ok {
		return &id
	}
	return nil
}

// RequireAuth is a helper that returns the user ID or an error if unauthenticated.
// Use this at the top of any resolver that requires authentication.
func RequireAuth(ctx context.Context) (string, error) {
	uid := GetUserID(ctx)
	if uid == nil {
		return "", fmt.Errorf("authentication required")
	}
	return *uid, nil
}
