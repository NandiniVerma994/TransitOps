package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/NandiniVerma994/TransitOps/backend/internal/httpx"
)

type contextKey string

const currentUserKey contextKey = "current_user"

func (s *Service) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var token string
		var ok bool

		// 1. Try to get token from HTTP-only cookie
		cookie, err := r.Cookie("access_token")
		if err == nil && cookie.Value != "" {
			token = cookie.Value
			ok = true
		}

		// 2. Fallback to Authorization header
		if !ok {
			token, ok = bearerToken(r.Header.Get("Authorization"))
		}

		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "missing authentication token")
			return
		}

		user, err := parseToken(s.jwtSecret, token)
		if err != nil {
			httpx.WriteError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		ctx := context.WithValue(r.Context(), currentUserKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Service) RequireRole(next http.Handler, roles ...string) http.Handler {
	allowedRoles := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allowedRoles[strings.ToLower(strings.TrimSpace(role))] = struct{}{}
	}

	return s.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := CurrentUserFromContext(r.Context())
		if !ok {
			httpx.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
			return
		}

		userRole := strings.ToLower(strings.TrimSpace(user.Role))
		if _, ok := allowedRoles[userRole]; !ok {
			httpx.WriteError(w, http.StatusForbidden, "insufficient role")
			return
		}

		next.ServeHTTP(w, r)
	}))
}

func CurrentUserFromContext(ctx context.Context) (CurrentUser, bool) {
	user, ok := ctx.Value(currentUserKey).(CurrentUser)
	return user, ok
}

func bearerToken(header string) (string, bool) {
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return "", false
	}

	token := strings.TrimSpace(strings.TrimPrefix(header, prefix))
	return token, token != ""
}
