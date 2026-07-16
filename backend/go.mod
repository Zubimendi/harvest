module github.com/harvest-app/backend

go 1.22

require (
	github.com/99designs/gqlgen v0.17.49
	github.com/vektah/gqlparser/v2 v2.5.16
	github.com/jackc/pgx/v5 v5.6.0
	github.com/go-chi/chi/v5 v5.0.12
	github.com/go-chi/cors v1.2.1
	github.com/golang-jwt/jwt/v5 v5.2.1
	github.com/google/uuid v1.6.0
	github.com/joho/godotenv v1.5.1
)

// NOTE: This go.mod lists the intended dependency set for the backend.
// Because this scaffold was generated in a network-isolated sandbox, `go mod tidy`
// and `go run github.com/99designs/gqlgen generate` have NOT been executed here.
// Run both locally (with network access) before building — see backend/README.md.
