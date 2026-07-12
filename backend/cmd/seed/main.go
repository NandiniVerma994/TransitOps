package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/NandiniVerma994/TransitOps/backend/internal/auth"
	"github.com/NandiniVerma994/TransitOps/backend/internal/config"
	"github.com/NandiniVerma994/TransitOps/backend/internal/db"
)

type seedUser struct {
	email    string
	password string
	role     string
}

func main() {
	cfg := config.Load()

	users := []seedUser{
		{
			email:    "fleet.manager@transitops.local",
			password: "FleetManager@123",
			role:     "Fleet Manager",
		},
		{
			email:    "safety.officer@transitops.local",
			password: "SafetyOfficer@123",
			role:     "Safety Officer",
		},
		{
			email:    "finance.analyst@transitops.local",
			password: "FinanceAnalyst@123",
			role:     "Financial Analyst",
		},
		{
			email:    "driver.alex@transitops.local",
			password: "DriverAlex@123",
			role:     "Driver",
		},
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

	var alexUserID string
	for _, user := range users {
		seededUser, err := service.EnsureUser(ctx, auth.CreateUserRequest{
			Email:    user.email,
			Password: user.password,
			Role:     user.role,
		})
		if err != nil {
			log.Fatalf("seed user %s: %v", user.email, err)
		}

		fmt.Printf("seeded user %s with role %s\n", seededUser.Email, seededUser.Role)
		if seededUser.Email == "driver.alex@transitops.local" {
			alexUserID = seededUser.ID
		}
	}

	// Link user to driver profile in the drivers table
	if alexUserID != "" {
		_, err = database.ExecContext(ctx, `
			INSERT INTO drivers (user_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status)
			VALUES ($1, 'Alex Morgan', 'DL-9923', 'Heavy', '2027-05-12', '+1 555-0192', 98, 'Available')
			ON CONFLICT (user_id) DO NOTHING;
		`, alexUserID)
		if err != nil {
			log.Fatalf("seed driver profile: %v", err)
		}
		fmt.Println("seeded driver profile linked to user")
	}
}
