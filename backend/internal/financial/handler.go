package financial

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/NandiniVerma994/TransitOps/backend/internal/auth"
	"github.com/NandiniVerma994/TransitOps/backend/internal/httpx"
)

type AuthProvider interface {
	RequireAuth(http.Handler) http.Handler
	RequireRole(http.Handler, ...string) http.Handler
}

type Handler struct {
	service      *Service
	authProvider AuthProvider
}

func NewHandler(service *Service, authProvider AuthProvider) *Handler {
	return &Handler{service: service, authProvider: authProvider}
}

func (h *Handler) MountRoutes(mux *http.ServeMux) {
	allowed := []string{"Financial Analyst", "Fleet Manager"}

	mux.Handle("GET /api/financial/options/vehicles", h.authProvider.RequireRole(http.HandlerFunc(h.vehicleOptions), allowed...))
	mux.Handle("GET /api/financial/options/trips", h.authProvider.RequireRole(http.HandlerFunc(h.tripOptions), allowed...))
	mux.Handle("GET /api/financial/dashboard", h.authProvider.RequireRole(http.HandlerFunc(h.dashboard), allowed...))
	mux.Handle("GET /api/financial/fuel-logs", h.authProvider.RequireRole(http.HandlerFunc(h.fuelLogs), allowed...))
	mux.Handle("POST /api/financial/fuel-logs", h.authProvider.RequireRole(http.HandlerFunc(h.logFuel), allowed...))
	mux.Handle("GET /api/financial/fuel-summary", h.authProvider.RequireRole(http.HandlerFunc(h.fuelSummary), allowed...))
	mux.Handle("GET /api/financial/expenses", h.authProvider.RequireRole(http.HandlerFunc(h.expenses), allowed...))
	mux.Handle("POST /api/financial/expenses", h.authProvider.RequireRole(http.HandlerFunc(h.logExpense), allowed...))
	mux.Handle("GET /api/financial/maintenance", h.authProvider.RequireRole(http.HandlerFunc(h.maintenance), allowed...))
	mux.Handle("GET /api/financial/maintenance-summary", h.authProvider.RequireRole(http.HandlerFunc(h.maintenanceSummary), allowed...))
	mux.Handle("GET /api/financial/roi", h.authProvider.RequireRole(http.HandlerFunc(h.roi), allowed...))
	mux.Handle("GET /api/financial/fuel-expense-summary", h.authProvider.RequireRole(http.HandlerFunc(h.fuelExpenseSummary), allowed...))
	mux.Handle("GET /api/financial/analytics", h.authProvider.RequireRole(http.HandlerFunc(h.analytics), allowed...))
}

func (h *Handler) vehicleOptions(w http.ResponseWriter, r *http.Request) {
	data, err := h.service.VehicleOptions(r.Context())
	h.respond(w, r, data, err)
}

func (h *Handler) tripOptions(w http.ResponseWriter, r *http.Request) {
	data, err := h.service.TripOptions(r.Context())
	h.respond(w, r, data, err)
}

func (h *Handler) dashboard(w http.ResponseWriter, r *http.Request) {
	data, err := h.service.DashboardSummary(r.Context())
	h.respond(w, r, data, err)
}

func (h *Handler) fuelLogs(w http.ResponseWriter, r *http.Request) {
	data, err := h.service.FuelLogs(r.Context(), r.URL.Query().Get("search"))
	h.respond(w, r, data, err)
}

func (h *Handler) logFuel(w http.ResponseWriter, r *http.Request) {
	var req LogFuelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, ok := auth.CurrentUserFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	data, err := h.service.LogFuel(r.Context(), req, user.ID)
	h.respondCreated(w, r, data, err)
}

func (h *Handler) fuelSummary(w http.ResponseWriter, r *http.Request) {
	data, err := h.service.FuelSummary(r.Context())
	h.respond(w, r, data, err)
}

func (h *Handler) expenses(w http.ResponseWriter, r *http.Request) {
	from, err := parseOptionalTime(r.URL.Query().Get("from"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid from date")
		return
	}
	to, err := parseOptionalTime(r.URL.Query().Get("to"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid to date")
		return
	}

	data, err := h.service.Expenses(r.Context(), r.URL.Query().Get("search"), r.URL.Query().Get("type"), from, to)
	h.respond(w, r, data, err)
}

func (h *Handler) logExpense(w http.ResponseWriter, r *http.Request) {
	var req LogExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, ok := auth.CurrentUserFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	data, err := h.service.LogExpense(r.Context(), req, user.ID)
	h.respondCreated(w, r, data, err)
}

func (h *Handler) maintenance(w http.ResponseWriter, r *http.Request) {
	data, err := h.service.MaintenanceLogs(r.Context(), r.URL.Query().Get("search"), r.URL.Query().Get("status"))
	h.respond(w, r, data, err)
}

func (h *Handler) maintenanceSummary(w http.ResponseWriter, r *http.Request) {
	data, err := h.service.MaintenanceSummary(r.Context())
	h.respond(w, r, data, err)
}

func (h *Handler) roi(w http.ResponseWriter, r *http.Request) {
	data, err := h.service.ROIAnalysis(r.Context())
	h.respond(w, r, data, err)
}

func (h *Handler) fuelExpenseSummary(w http.ResponseWriter, r *http.Request) {
	data, err := h.service.FuelExpenseSummary(r.Context())
	h.respond(w, r, data, err)
}

func (h *Handler) analytics(w http.ResponseWriter, r *http.Request) {
	data, err := h.service.AnalyticsSummary(r.Context())
	h.respond(w, r, data, err)
}

func (h *Handler) respond(w http.ResponseWriter, r *http.Request, data any, err error) {
	if err != nil {
		h.handleError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, Response{Success: true, Data: data})
}

func (h *Handler) respondCreated(w http.ResponseWriter, r *http.Request, data any, err error) {
	if err != nil {
		h.handleError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, Response{Success: true, Data: data})
}

func (h *Handler) handleError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, ErrValidation) {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	user, _ := auth.CurrentUserFromContext(r.Context())
	log.Printf("[ERROR] method=%s path=%s user_id=%s error=%v", r.Method, r.URL.Path, user.ID, err)
	httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
}

func parseOptionalTime(value string) (time.Time, error) {
	if value == "" {
		return time.Time{}, nil
	}
	if t, err := time.Parse(time.RFC3339, value); err == nil {
		return t, nil
	}
	return time.Parse("2006-01-02", value)
}
