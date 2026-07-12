package auth

import "time"

type CreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type AuthUser struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type Role struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type AuthResponse struct {
	Token     string    `json:"token"`
	TokenType string    `json:"token_type"`
	ExpiresAt time.Time `json:"expires_at"`
	User      AuthUser  `json:"user"`
}

type LoginResult struct {
	AccessToken   string
	AccessExpiry  time.Time
	RefreshToken  string
	RefreshExpiry time.Time
	User          AuthUser
}

type userRecord struct {
	ID           string
	Email        string
	PasswordHash string
	RoleName     string
	CreatedAt    time.Time
}

type refreshTokenRecord struct {
	ID        string
	UserID    string
	Token     string
	ExpiresAt time.Time
	Revoked   bool
	CreatedAt time.Time
}

type CurrentUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type roleRecord struct {
	ID   string
	Name string
}

func toRole(role roleRecord) Role {
	return Role{
		ID:   role.ID,
		Name: role.Name,
	}
}

func toAuthUser(user userRecord) AuthUser {
	return AuthUser{
		ID:        user.ID,
		Email:     user.Email,
		Role:      user.RoleName,
		CreatedAt: user.CreatedAt,
	}
}
