package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/NandiniVerma994/TransitOps/backend/internal/httpx"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) MountRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/login", h.login)
	mux.HandleFunc("POST /api/auth/refresh", h.refresh)
	mux.HandleFunc("POST /api/auth/logout", h.logout)
	mux.Handle("GET /api/auth/me", h.service.RequireAuth(http.HandlerFunc(h.me)))
	mux.Handle("POST /api/auth/change-password", h.service.RequireAuth(http.HandlerFunc(h.changePassword)))
	mux.Handle("POST /api/auth/users", h.service.RequireRole(
		http.HandlerFunc(h.createUser),
		"Fleet Manager",
	))
	mux.Handle("GET /api/auth/roles", h.service.RequireRole(
		http.HandlerFunc(h.listRoles),
		"Fleet Manager",
	))
}

func (h *Handler) createUser(w http.ResponseWriter, r *http.Request) {
	var request CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	response, err := h.service.CreateUser(r.Context(), request)
	if err != nil {
		writeAuthError(w, err)
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var request LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	response, err := h.service.Login(r.Context(), request)
	if err != nil {
		writeAuthError(w, err)
		return
	}

	setAuthCookies(w, response)
	httpx.WriteJSON(w, http.StatusOK, response.User)
}

func (h *Handler) refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil || cookie.Value == "" {
		httpx.WriteError(w, http.StatusUnauthorized, "missing refresh token")
		return
	}

	response, err := h.service.Refresh(r.Context(), cookie.Value)
	if err != nil {
		writeAuthError(w, err)
		return
	}

	setAuthCookies(w, response)
	httpx.WriteJSON(w, http.StatusOK, response.User)
}

func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err == nil && cookie.Value != "" {
		_ = h.service.Logout(r.Context(), cookie.Value)
	}

	clearAuthCookies(w)
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"message": "logged out successfully"})
}

func setAuthCookies(w http.ResponseWriter, result LoginResult) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    result.AccessToken,
		Expires:  result.AccessExpiry,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    result.RefreshToken,
		Expires:  result.RefreshExpiry,
		Path:     "/api/auth/refresh",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
	})
}

func clearAuthCookies(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		Path:     "/api/auth/refresh",
		HttpOnly: true,
		MaxAge:   -1,
	})
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	user, ok := CurrentUserFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, user)
}

func (h *Handler) changePassword(w http.ResponseWriter, r *http.Request) {
	user, ok := CurrentUserFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	var request ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	err := h.service.ChangePassword(r.Context(), user.ID, request)
	if err != nil {
		writeAuthError(w, err)
		return
	}

	// Password changed: clear cookies to force re-login
	clearAuthCookies(w)

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"message": "password changed successfully"})
}

func (h *Handler) listRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := h.service.ListRoles(r.Context())
	if err != nil {
		writeAuthError(w, err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, roles)
}

func writeAuthError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrValidation):
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, ErrEmailTaken):
		httpx.WriteError(w, http.StatusConflict, "email already exists")
	case errors.Is(err, ErrInvalidCredentials):
		httpx.WriteError(w, http.StatusUnauthorized, "invalid email or password")
	default:
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
	}
}
