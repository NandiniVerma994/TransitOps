package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"
)

type Service struct {
	repository      *Repository
	jwtSecret       []byte
	tokenTTL        time.Duration
	defaultRoleName string
}

func NewService(repository *Repository, jwtSecret string, tokenTTL time.Duration, defaultRoleName string) *Service {
	return &Service{
		repository:      repository,
		jwtSecret:       []byte(jwtSecret),
		tokenTTL:        tokenTTL,
		defaultRoleName: defaultRoleName,
	}
}

func (s *Service) CreateUser(ctx context.Context, request CreateUserRequest) (AuthUser, error) {
	email, passwordHash, role, err := s.validateNewUser(ctx, request)
	if err != nil {
		return AuthUser{}, err
	}

	_, err = s.repository.FindUserByEmail(ctx, email)
	if err == nil {
		return AuthUser{}, ErrEmailTaken
	}
	if err != nil && !errors.Is(err, errNotFound) {
		return AuthUser{}, err
	}

	user, err := s.repository.CreateUser(ctx, createUserParams{
		Email:        email,
		PasswordHash: passwordHash,
		RoleID:       role.ID,
		RoleName:     role.Name,
	})
	if err != nil {
		return AuthUser{}, err
	}

	return toAuthUser(user), nil
}

func (s *Service) EnsureUser(ctx context.Context, request CreateUserRequest) (AuthUser, error) {
	email, passwordHash, role, err := s.validateNewUser(ctx, request)
	if err != nil {
		return AuthUser{}, err
	}

	user, err := s.repository.UpsertUser(ctx, createUserParams{
		Email:        email,
		PasswordHash: passwordHash,
		RoleID:       role.ID,
		RoleName:     role.Name,
	})
	if err != nil {
		return AuthUser{}, err
	}

	return toAuthUser(user), nil
}

func (s *Service) validateNewUser(ctx context.Context, request CreateUserRequest) (string, string, roleRecord, error) {
	email, err := normalizeEmail(request.Email)
	if err != nil {
		return "", "", roleRecord{}, err
	}
	if len(request.Password) < 8 {
		return "", "", roleRecord{}, fmt.Errorf("%w: password must be at least 8 characters", ErrValidation)
	}
	roleName := strings.TrimSpace(request.Role)
	if roleName == "" {
		roleName = s.defaultRoleName
	}

	role, err := s.repository.FindRoleByName(ctx, roleName)
	if errors.Is(err, errNotFound) {
		return "", "", roleRecord{}, fmt.Errorf("%w: invalid role", ErrValidation)
	}
	if err != nil {
		return "", "", roleRecord{}, fmt.Errorf("find role: %w", err)
	}

	passwordHash, err := hashPassword(request.Password)
	if err != nil {
		return "", "", roleRecord{}, err
	}

	return email, passwordHash, role, nil
}

func (s *Service) Login(ctx context.Context, request LoginRequest) (LoginResult, error) {
	email, err := normalizeEmail(request.Email)
	if err != nil {
		return LoginResult{}, ErrInvalidCredentials
	}

	user, err := s.repository.FindUserByEmail(ctx, email)
	if errors.Is(err, errNotFound) {
		return LoginResult{}, ErrInvalidCredentials
	}
	if err != nil {
		return LoginResult{}, err
	}

	if !passwordMatches(user.PasswordHash, request.Password) {
		return LoginResult{}, ErrInvalidCredentials
	}

	accessToken, accessExpiry, err := createToken(s.jwtSecret, s.tokenTTL, user)
	if err != nil {
		return LoginResult{}, err
	}

	refreshToken, err := generateRandomToken()
	if err != nil {
		return LoginResult{}, err
	}

	refreshExpiry := time.Now().Add(7 * 24 * time.Hour)
	err = s.repository.SaveRefreshToken(ctx, user.ID, refreshToken, refreshExpiry)
	if err != nil {
		return LoginResult{}, err
	}

	return LoginResult{
		AccessToken:   accessToken,
		AccessExpiry:  accessExpiry,
		RefreshToken:  refreshToken,
		RefreshExpiry: refreshExpiry,
		User:          toAuthUser(user),
	}, nil
}

func (s *Service) Refresh(ctx context.Context, token string) (LoginResult, error) {
	rt, err := s.repository.FindRefreshToken(ctx, token)
	if err != nil {
		return LoginResult{}, ErrInvalidCredentials
	}

	if rt.Revoked || time.Now().After(rt.ExpiresAt) {
		// Potential replay attack or theft: revoke all tokens for this user
		_ = s.repository.RevokeAllUserRefreshTokens(ctx, rt.UserID)
		return LoginResult{}, ErrInvalidCredentials
	}

	user, err := s.repository.FindUserByID(ctx, rt.UserID)
	if err != nil {
		return LoginResult{}, ErrInvalidCredentials
	}

	// Revoke the old refresh token (Token Rotation)
	err = s.repository.RevokeRefreshToken(ctx, token)
	if err != nil {
		return LoginResult{}, err
	}

	accessToken, accessExpiry, err := createToken(s.jwtSecret, s.tokenTTL, user)
	if err != nil {
		return LoginResult{}, err
	}

	newRefreshToken, err := generateRandomToken()
	if err != nil {
		return LoginResult{}, err
	}

	refreshExpiry := time.Now().Add(7 * 24 * time.Hour)
	err = s.repository.SaveRefreshToken(ctx, user.ID, newRefreshToken, refreshExpiry)
	if err != nil {
		return LoginResult{}, err
	}

	return LoginResult{
		AccessToken:   accessToken,
		AccessExpiry:  accessExpiry,
		RefreshToken:  newRefreshToken,
		RefreshExpiry: refreshExpiry,
		User:          toAuthUser(user),
	}, nil
}

func (s *Service) Logout(ctx context.Context, token string) error {
	return s.repository.RevokeRefreshToken(ctx, token)
}

func generateRandomToken() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}


func (s *Service) ListRoles(ctx context.Context) ([]Role, error) {
	roleRecords, err := s.repository.ListRoles(ctx)
	if err != nil {
		return nil, err
	}

	roles := make([]Role, 0, len(roleRecords))
	for _, role := range roleRecords {
		roles = append(roles, toRole(role))
	}

	return roles, nil
}

func (s *Service) ChangePassword(ctx context.Context, userID string, request ChangePasswordRequest) error {
	if len(request.NewPassword) < 8 {
		return fmt.Errorf("%w: new password must be at least 8 characters", ErrValidation)
	}

	user, err := s.repository.FindUserByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if !passwordMatches(user.PasswordHash, request.CurrentPassword) {
		return fmt.Errorf("%w: incorrect current password", ErrValidation)
	}

	newHash, err := hashPassword(request.NewPassword)
	if err != nil {
		return fmt.Errorf("hash new password: %w", err)
	}

	err = s.repository.UpdateUserPassword(ctx, userID, newHash)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}

	// For security, revoke all active sessions (refresh tokens) when password is changed.
	_ = s.repository.RevokeAllUserRefreshTokens(ctx, userID)

	return nil
}

func (s *Service) authResponse(user userRecord) (AuthResponse, error) {
	token, expiresAt, err := createToken(s.jwtSecret, s.tokenTTL, user)
	if err != nil {
		return AuthResponse{}, err
	}

	return AuthResponse{
		Token:     token,
		TokenType: "Bearer",
		ExpiresAt: expiresAt,
		User:      toAuthUser(user),
	}, nil
}

func normalizeEmail(value string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(value))
	if email == "" {
		return "", fmt.Errorf("%w: email is required", ErrValidation)
	}

	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email {
		return "", fmt.Errorf("%w: invalid email", ErrValidation)
	}

	return email, nil
}
