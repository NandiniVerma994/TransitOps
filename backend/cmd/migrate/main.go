package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/NandiniVerma994/TransitOps/backend/internal/config"
	"github.com/NandiniVerma994/TransitOps/backend/internal/db"
)

func main() {
	cfg := config.Load()

	query, err := os.ReadFile("migrations/001_init.sql")
	if err != nil {
		log.Fatalf("read migration: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	database, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer database.Close()

	if _, err := database.ExecContext(ctx, string(query)); err != nil {
		log.Fatalf("apply migration: %v", err)
	}

	log.Println("migration applied")
}
