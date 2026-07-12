package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/NandiniVerma994/TransitOps/backend/internal/auth"
	"github.com/NandiniVerma994/TransitOps/backend/internal/config"
	"github.com/NandiniVerma994/TransitOps/backend/internal/db"
)

type seedUser struct {
	email string
	role  string
}

func main() {
	cfg := config.Load()
	password := os.Getenv("SEED_USER_PASSWORD")
	if password == "" {
		password = "Password123!"
	}

	users := []seedUser{
		{email: "fleet.manager@transitops.local", role: "Fleet Manager"},
		{email: "safety.officer@transitops.local", role: "Safety Officer"},
		{email: "finance.analyst@transitops.local", role: "Financial Analyst"},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	database, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer database.Close()

	service := auth.NewService(
		auth.NewRepository(database),
		cfg.JWTSecret,
		24*time.Hour,
		cfg.DefaultUserRole,
	)

	for _, user := range users {
		createdUser, err := service.CreateUser(ctx, auth.CreateUserRequest{
			Email:    user.email,
			Password: password,
			Role:     user.role,
		})
		if errors.Is(err, auth.ErrEmailTaken) {
			fmt.Printf("skipped existing user %s\n", user.email)
			continue
		}
		if err != nil {
			log.Fatalf("seed user %s: %v", user.email, err)
		}

		fmt.Printf("seeded user %s with role %s\n", createdUser.Email, createdUser.Role)
	}
}
