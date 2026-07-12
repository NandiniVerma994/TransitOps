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

	tokenTTLHours, err := strconv.Atoi(cfg.TokenTTLHours)
	if err != nil || tokenTTLHours <= 0 {
		log.Fatalf("invalid TOKEN_TTL_HOURS: %s", cfg.TokenTTLHours)
	}

	authRepository := auth.NewRepository(database)
	authService := auth.NewService(
		authRepository,
		cfg.JWTSecret,
		time.Duration(tokenTTLHours)*time.Hour,
		cfg.DefaultUserRole,
	)
	authHandler := auth.NewHandler(authService)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	authHandler.MountRoutes(mux)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("transitops api listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
