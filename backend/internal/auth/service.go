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
