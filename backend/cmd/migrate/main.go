package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/NandiniVerma994/TransitOps/backend/internal/config"
	"github.com/NandiniVerma994/TransitOps/backend/internal/db"
)

func main() {
	cfg := config.Load()

	files, err := filepath.Glob("migrations/*.sql")
	if err != nil {
		log.Fatalf("find migrations: %v", err)
	}
	sort.Strings(files)
	if len(files) == 0 {
		log.Println("no migrations found")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	database, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer database.Close()

	if err := ensureMigrationTable(ctx, database); err != nil {
		log.Fatalf("ensure migration table: %v", err)
	}

	for _, file := range files {
		version := filepath.Base(file)

		applied, err := migrationApplied(ctx, database, version)
		if err != nil {
			log.Fatalf("check migration %s: %v", version, err)
		}
		if applied {
			log.Printf("migration already applied: %s", version)
			continue
		}

		if version == "001_init.sql" {
			legacyApplied, err := legacyInitialMigrationApplied(ctx, database)
			if err != nil {
				log.Fatalf("check legacy migration %s: %v", version, err)
			}
			if legacyApplied {
				if err := recordMigration(ctx, database, version); err != nil {
					log.Fatalf("record legacy migration %s: %v", version, err)
				}
				log.Printf("recorded existing migration: %s", version)
				continue
			}
		}

		query, err := os.ReadFile(file)
		if err != nil {
			log.Fatalf("read migration %s: %v", version, err)
		}

		if err := applyMigration(ctx, database, version, string(query)); err != nil {
			log.Fatalf("apply migration %s: %v", version, err)
		}

		log.Printf("migration applied: %s", version)
	}
}

func ensureMigrationTable(ctx context.Context, database *sql.DB) error {
	_, err := database.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);
	`)
	return err
}

func migrationApplied(ctx context.Context, database *sql.DB, version string) (bool, error) {
	var exists bool
	err := database.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM schema_migrations
			WHERE version = $1
		);
	`, version).Scan(&exists)
	return exists, err
}

func legacyInitialMigrationApplied(ctx context.Context, database *sql.DB) (bool, error) {
	var exists bool
	err := database.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = 'public'
			AND table_name = 'roles'
		);
	`).Scan(&exists)
	return exists, err
}

func recordMigration(ctx context.Context, database *sql.DB, version string) error {
	_, err := database.ExecContext(ctx, `
		INSERT INTO schema_migrations (version)
		VALUES ($1)
		ON CONFLICT (version) DO NOTHING;
	`, version)
	return err
}

func applyMigration(ctx context.Context, database *sql.DB, version, query string) error {
	tx, err := database.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, query); err != nil {
		_ = tx.Rollback()
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO schema_migrations (version)
		VALUES ($1);
	`, version); err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}
