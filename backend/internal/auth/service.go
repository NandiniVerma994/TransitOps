package auth

import (
	"context"
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

func (s *Service) Register(ctx context.Context, request RegisterRequest) (AuthResponse, error) {
	name := strings.TrimSpace(request.Name)
	email, err := normalizeEmail(request.Email)
	if err != nil {
		return AuthResponse{}, err
	}
	if len(name) < 2 {
		return AuthResponse{}, fmt.Errorf("%w: name must be at least 2 characters", ErrValidation)
	}
	if len(request.Password) < 8 {
		return AuthResponse{}, fmt.Errorf("%w: password must be at least 8 characters", ErrValidation)
	}

	_, err = s.repository.FindUserByEmail(ctx, email)
	if err == nil {
		return AuthResponse{}, ErrEmailTaken
	}
	if err != nil && !errors.Is(err, errNotFound) {
		return AuthResponse{}, err
	}

	roleID, err := s.repository.FindRoleIDByName(ctx, s.defaultRoleName)
	if err != nil {
		return AuthResponse{}, fmt.Errorf("find default role: %w", err)
	}

	passwordHash, err := hashPassword(request.Password)
	if err != nil {
		return AuthResponse{}, err
	}

	user, err := s.repository.CreateUser(ctx, createUserParams{
		Name:         name,
		Email:        email,
		PasswordHash: passwordHash,
		RoleID:       roleID,
		RoleName:     s.defaultRoleName,
	})
	if err != nil {
		return AuthResponse{}, err
	}

	return s.authResponse(user)
}

func (s *Service) Login(ctx context.Context, request LoginRequest) (AuthResponse, error) {
	email, err := normalizeEmail(request.Email)
	if err != nil {
		return AuthResponse{}, ErrInvalidCredentials
	}

	user, err := s.repository.FindUserByEmail(ctx, email)
	if errors.Is(err, errNotFound) {
		return AuthResponse{}, ErrInvalidCredentials
	}
	if err != nil {
		return AuthResponse{}, err
	}

	if !passwordMatches(user.PasswordHash, request.Password) {
		return AuthResponse{}, ErrInvalidCredentials
	}

	return s.authResponse(user)
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
