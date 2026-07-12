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
	email, err := normalizeEmail(request.Email)
	if err != nil {
		return AuthResponse{}, err
	}
	if len(request.Password) < 8 {
		return AuthResponse{}, fmt.Errorf("%w: password must be at least 8 characters", ErrValidation)
	}
	roleName := strings.TrimSpace(request.Role)
	if roleName == "" {
		roleName = s.defaultRoleName
	}

	_, err = s.repository.FindUserByEmail(ctx, email)
	if err == nil {
		return AuthResponse{}, ErrEmailTaken
	}
	if err != nil && !errors.Is(err, errNotFound) {
		return AuthResponse{}, err
	}

	role, err := s.repository.FindRoleByName(ctx, roleName)
	if errors.Is(err, errNotFound) {
		return AuthResponse{}, fmt.Errorf("%w: invalid role", ErrValidation)
	}
	if err != nil {
		return AuthResponse{}, fmt.Errorf("find role: %w", err)
	}

	passwordHash, err := hashPassword(request.Password)
	if err != nil {
		return AuthResponse{}, err
	}

	user, err := s.repository.CreateUser(ctx, createUserParams{
		Email:        email,
		PasswordHash: passwordHash,
		RoleID:       role.ID,
		RoleName:     role.Name,
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
