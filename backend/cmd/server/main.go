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
	"github.com/harvest-app/backend/internal/jobs"
	"github.com/harvest-app/backend/internal/pubsub"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	// Uncomment after running `go run github.com/99designs/gqlgen generate`:
	// "github.com/harvest-app/backend/graph/generated"
	// "github.com/99designs/gqlgen/graphql/handler"
	// "github.com/99designs/gqlgen/graphql/handler/transport"
	// "github.com/99designs/gqlgen/graphql/playground"
)

const defaultPort = "8080"

func main() {
	godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	// ── Database ────────────────────────────────────────────────────────
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := db.InitPool(ctx); err != nil {
		log.Printf("⚠  Warning: Failed to connect to DB: %v", err)
		log.Println("   The server will start but queries will fail.")
		log.Println("   Set DATABASE_URL in .env and restart.")
	} else {
		log.Println("✓  Database connected")
	}

	// ── PubSub ──────────────────────────────────────────────────────────
	ps := pubsub.New()

	// ── Background Jobs ─────────────────────────────────────────────────
	jobs.StartExpiryJob(ctx)
	log.Println("✓  Background jobs started (expiry checker every 60s)")

	// ── Resolver ────────────────────────────────────────────────────────
	_ = resolvers.NewResolver(ps)

	// ── Router ──────────────────────────────────────────────────────────
	router := chi.NewRouter()

	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
	}))
	router.Use(auth.Middleware)

	// ── GraphQL Server ──────────────────────────────────────────────────
	// After running `gqlgen generate`, uncomment this block and remove the
	// placeholder route below:
	//
	// srv := handler.NewDefaultServer(
	//     generated.NewExecutableSchema(generated.Config{
	//         Resolvers: resolvers.NewResolver(ps),
	//     }),
	// )
	// srv.AddTransport(transport.POST{})
	// srv.AddTransport(transport.Websocket{
	//     KeepAlivePingInterval: 10 * time.Second,
	// })
	//
	// router.Handle("/", playground.Handler("Harvest GraphQL", "/query"))
	// router.Handle("/query", srv)

	// Placeholder until gqlgen is generated
	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","message":"Harvest API running. Run gqlgen generate to enable GraphQL."}`))
	})

	// Health check
	router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if db.Pool != nil {
			if err := db.Pool.Ping(r.Context()); err == nil {
				w.Write([]byte(`{"status":"healthy","db":"connected"}`))
				return
			}
		}
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{"status":"degraded","db":"disconnected"}`))
	})

	// ── Start ───────────────────────────────────────────────────────────
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		log.Println("Shutting down...")
		cancel()
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		server.Shutdown(shutdownCtx)
	}()

	log.Printf("🌱 Harvest API listening on http://localhost:%s/", port)
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}
