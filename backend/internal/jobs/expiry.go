package jobs

import (
	"context"
	"log"
	"time"

	"github.com/harvest-app/backend/internal/db"
)

func StartExpiryJob(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for {
			select {
			case <-ticker.C:
				expireListings(ctx)
				revertReservations(ctx)
			case <-ctx.Done():
				ticker.Stop()
				return
			}
		}
	}()
}

func expireListings(ctx context.Context) {
	query := `
		UPDATE public.listings 
		SET status = 'EXPIRED', updated_at = NOW() 
		WHERE status = 'ACTIVE' AND pickup_window_end < NOW()
	`
	tag, err := db.Pool.Exec(ctx, query)
	if err != nil {
		log.Printf("Error running expireListings job: %v", err)
		return
	}
	if tag.RowsAffected() > 0 {
		log.Printf("Expired %d listings", tag.RowsAffected())
	}
}

func revertReservations(ctx context.Context) {
	query := `
		UPDATE public.listings 
		SET status = 'ACTIVE', reserved_by = NULL, reserved_at = NULL, updated_at = NOW() 
		WHERE status = 'RESERVED' AND reserved_at < NOW() - INTERVAL '24 hours'
	`
	tag, err := db.Pool.Exec(ctx, query)
	if err != nil {
		log.Printf("Error running revertReservations job: %v", err)
		return
	}
	if tag.RowsAffected() > 0 {
		log.Printf("Reverted %d reservations (24h timeout)", tag.RowsAffected())
	}
}
