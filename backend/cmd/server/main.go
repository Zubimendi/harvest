package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/harvest-app/backend/graph/resolvers"
	"github.com/harvest-app/backend/internal/auth"
	"github.com/harvest-app/backend/internal/db"
	"github.com/harvest-app/backend/internal/graphqlapi"
	"github.com/harvest-app/backend/internal/jobs"
	"github.com/harvest-app/backend/internal/pubsub"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

const defaultPort = "8080"

func main() {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := db.InitPool(ctx); err != nil {
		log.Printf("⚠  Warning: Failed to connect to DB: %v", err)
		log.Println("   The server will start but queries will fail.")
		log.Println("   Set DATABASE_URL in .env and restart.")
	} else {
		log.Println("✓  Database connected")
	}

	ps := pubsub.New()
	jobs.StartExpiryJob(ctx)
	log.Println("✓  Background jobs started (expiry checker every 60s)")

	resolver := resolvers.NewResolver(ps)

	router := chi.NewRouter()
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
	}))
	router.Use(auth.Middleware)

	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok","message":"Harvest GraphQL API. POST to /query"}`))
	})

	router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if db.Pool != nil {
			if err := db.Pool.Ping(r.Context()); err == nil {
				_, _ = w.Write([]byte(`{"status":"healthy","db":"connected"}`))
				return
			}
		}
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte(`{"status":"degraded","db":"disconnected"}`))
	})

	router.Post("/query", graphqlapi.Handler(resolver))

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		log.Println("Shutting down...")
		cancel()
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		_ = server.Shutdown(shutdownCtx)
	}()

	log.Printf("🌱 Harvest API listening on http://localhost:%s/", port)
	log.Printf("   GraphQL endpoint: POST http://localhost:%s/query", port)
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}
