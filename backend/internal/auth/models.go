package auth

import "time"

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthUser struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type AuthResponse struct {
	Token     string    `json:"token"`
	TokenType string    `json:"token_type"`
	ExpiresAt time.Time `json:"expires_at"`
	User      AuthUser  `json:"user"`
}

type userRecord struct {
	ID           string
	Email        string
	PasswordHash string
	RoleName     string
	CreatedAt    time.Time
}

func toAuthUser(user userRecord) AuthUser {
	return AuthUser{
		ID:        user.ID,
		Email:     user.Email,
		Role:      user.RoleName,
		CreatedAt: user.CreatedAt,
	}
}
