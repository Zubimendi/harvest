package resolvers

import (
	"github.com/harvest-app/backend/internal/db"
	"github.com/harvest-app/backend/internal/pubsub"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Resolver is the root resolver. It holds shared dependencies
// that all query/mutation/subscription resolvers can access.
type Resolver struct {
	Pool   *pgxpool.Pool
	PubSub *pubsub.PubSub
}

// NewResolver creates a Resolver wired to the global DB pool and a PubSub instance.
func NewResolver(ps *pubsub.PubSub) *Resolver {
	return &Resolver{
		Pool:   db.Pool,
		PubSub: ps,
	}
}
