package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL missing")
	}
	sqlBytes, err := os.ReadFile("migrations/0002_seed.sql")
	if err != nil {
		log.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	sql := string(sqlBytes)
	// pgx Exec doesn't love multi-statement with BEGIN/COMMIT the same way always — run as one batch via simple protocol
	_, err = pool.Exec(ctx, sql)
	if err != nil {
		log.Fatalf("seed failed: %v", err)
	}

	rows, err := pool.Query(ctx, `select status, count(*) from public.listings group by 1 order by 1`)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Listing counts by status:")
	for rows.Next() {
		var status string
		var n int
		_ = rows.Scan(&status, &n)
		fmt.Printf("  %s: %d\n", status, n)
	}
	rows.Close()

	rows2, err := pool.Query(ctx, `
		select left(title,40), status, pickup_window_end
		from public.listings
		order by pickup_window_end
	`)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Listings:")
	for rows2.Next() {
		var title, status string
		var end time.Time
		_ = rows2.Scan(&title, &status, &end)
		fmt.Printf("  [%s] %s → %s\n", status, title, end.Format(time.RFC3339))
	}
	rows2.Close()
}
