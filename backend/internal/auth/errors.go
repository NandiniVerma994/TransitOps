package auth

import "errors"

var (
	ErrValidation         = errors.New("validation failed")
	ErrEmailTaken         = errors.New("email already exists")
	ErrInvalidCredentials = errors.New("invalid email or password")
	errNotFound           = errors.New("record not found")
)
