package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	"github.com/NandiniVerma994/TransitOps/backend/internal/auth"
	"github.com/NandiniVerma994/TransitOps/backend/internal/config"
	"github.com/NandiniVerma994/TransitOps/backend/internal/db"
)

func main() {
	email := flag.String("email", "", "user email")
	password := flag.String("password", "", "temporary user password")
	role := flag.String("role", "", "user role")
	flag.Parse()

	cfg := config.Load()
	if *role == "" {
		*role = cfg.DefaultUserRole
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
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

	user, err := service.CreateUser(ctx, auth.CreateUserRequest{
		Email:    *email,
		Password: *password,
		Role:     *role,
	})
	if err != nil {
		log.Fatalf("create user: %v", err)
	}

	fmt.Printf("created user %s with role %s\n", user.Email, user.Role)
}
