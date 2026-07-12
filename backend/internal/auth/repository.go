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

func (r *Repository) FindRoleByName(ctx context.Context, name string) (roleRecord, error) {
	var role roleRecord
	err := r.db.QueryRowContext(ctx, `
		SELECT id, name
		FROM roles
		WHERE lower(name) = lower($1);
	`, name).Scan(&role.ID, &role.Name)
	if errors.Is(err, sql.ErrNoRows) {
		return roleRecord{}, errNotFound
	}
	if err != nil {
		return roleRecord{}, err
	}

	return role, nil
}

func (r *Repository) ListRoles(ctx context.Context) ([]roleRecord, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name
		FROM roles
		ORDER BY name;
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	roles := make([]roleRecord, 0)
	for rows.Next() {
		var role roleRecord
		if err := rows.Scan(&role.ID, &role.Name); err != nil {
			return nil, err
		}

		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return roles, nil
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
