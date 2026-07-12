package config

import (
	"bufio"
	"os"
	"strings"
)

type Config struct {
	Port            string
	DatabaseURL     string
	JWTSecret       string
	TokenTTLHours   string
	DefaultUserRole string
}

func Load() Config {
	loadDotEnv(".env")
	loadDotEnv("backend/.env")

	return Config{
		Port:            getEnv("APP_PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://transitops:transitops@localhost:5432/transitops?sslmode=disable"),
		JWTSecret:       getEnv("JWT_SECRET", "change-this-dev-secret"),
		TokenTTLHours:   getEnv("TOKEN_TTL_HOURS", "24"),
		DefaultUserRole: getEnv("DEFAULT_USER_ROLE", "Fleet Manager"),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}

func loadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		value = strings.Trim(value, `"'`)
		if key == "" || os.Getenv(key) != "" {
			continue
		}

		_ = os.Setenv(key, value)
	}
}
