package auth

import (
	"context"
	"database/sql"
	"errors"
)

type Repository struct {
	db *sql.DB
}

type createUserParams struct {
	Email        string
	PasswordHash string
	RoleID       string
	RoleName     string
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindUserByEmail(ctx context.Context, email string) (userRecord, error) {
	var user userRecord
	err := r.db.QueryRowContext(ctx, `
		SELECT u.id, u.email, u.password_hash, r.name, u.created_at
		FROM users u
		JOIN roles r ON r.id = u.role_id
		WHERE lower(u.email) = lower($1);
	`, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.RoleName,
		&user.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return userRecord{}, errNotFound
	}
	if err != nil {
		return userRecord{}, err
	}

	return user, nil
}

func (r *Repository) FindRoleIDByName(ctx context.Context, name string) (string, error) {
	var id string
	err := r.db.QueryRowContext(ctx, `
		SELECT id
		FROM roles
		WHERE name = $1;
	`, name).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return "", errNotFound
	}
	if err != nil {
		return "", err
	}

	return id, nil
}

func (r *Repository) CreateUser(ctx context.Context, params createUserParams) (userRecord, error) {
	var user userRecord
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO users (email, password_hash, role_id)
		VALUES ($1, $2, $3)
		RETURNING id, email, password_hash, created_at;
	`, params.Email, params.PasswordHash, params.RoleID).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedAt,
	)
	if err != nil {
		return userRecord{}, err
	}

	user.RoleName = params.RoleName
	return user, nil
}
