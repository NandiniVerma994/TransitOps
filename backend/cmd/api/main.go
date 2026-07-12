package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/NandiniVerma994/TransitOps/backend/internal/auth"
	"github.com/NandiniVerma994/TransitOps/backend/internal/config"
	"github.com/NandiniVerma994/TransitOps/backend/internal/db"
	"github.com/NandiniVerma994/TransitOps/backend/internal/fleet"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	database, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer database.Close()

	database.SetMaxOpenConns(25)
	database.SetMaxIdleConns(25)
	database.SetConnMaxLifetime(5 * time.Minute)

	tokenTTLHours, err := strconv.Atoi(cfg.TokenTTLHours)
	if err != nil || tokenTTLHours <= 0 {
		log.Fatalf("invalid TOKEN_TTL_HOURS: %s", cfg.TokenTTLHours)
	}

	authRepository := auth.NewRepository(database)
	authService := auth.NewService(
		authRepository,
		cfg.JWTSecret,
		15*time.Minute,
		cfg.DefaultUserRole,
	)
	authHandler := auth.NewHandler(authService)

	txManager := db.NewTxManager(database)
	fleetRepository := fleet.NewRepository(database)
	fleetService := fleet.NewService(fleetRepository, txManager)
	fleetHandler := fleet.NewHandler(fleetService, authService)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	authHandler.MountRoutes(mux)
	fleetHandler.MountRoutes(mux)

	handler := corsMiddleware(mux)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("transitops api listening on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
