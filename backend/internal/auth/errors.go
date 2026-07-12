package auth

import "errors"

var (
	ErrValidation         = errors.New("validation failed")
	ErrEmailTaken         = errors.New("email already registered")
	ErrInvalidCredentials = errors.New("invalid email or password")
	errNotFound           = errors.New("record not found")
)
