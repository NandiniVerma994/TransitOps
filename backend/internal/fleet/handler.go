package fleet

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/NandiniVerma994/TransitOps/backend/internal/auth"
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
	return &Handler{
		service:      service,
		authProvider: authProvider,
	}
}

type Response struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
	Meta    any    `json:"meta,omitempty"`
}

type ErrorResponse struct {
	Success bool     `json:"success"`
	Errors  []string `json:"errors"`
}

func (h *Handler) MountRoutes(mux *http.ServeMux) {
	// Vehicles
	mux.Handle("POST /api/vehicles", h.authProvider.RequireRole(http.HandlerFunc(h.create), "Fleet Manager"))
	mux.Handle("GET /api/vehicles", h.authProvider.RequireAuth(http.HandlerFunc(h.list)))
	mux.Handle("GET /api/vehicles/{id}", h.authProvider.RequireAuth(http.HandlerFunc(h.get)))
	mux.Handle("PUT /api/vehicles/{id}", h.authProvider.RequireRole(http.HandlerFunc(h.update), "Fleet Manager"))
	mux.Handle("DELETE /api/vehicles/{id}", h.authProvider.RequireRole(http.HandlerFunc(h.delete), "Fleet Manager"))
	mux.Handle("POST /api/vehicles/{id}/retire", h.authProvider.RequireRole(http.HandlerFunc(h.retire), "Fleet Manager"))

	// Drivers
	mux.Handle("POST /api/drivers", h.authProvider.RequireRole(http.HandlerFunc(h.onboardDriver), "Fleet Manager"))
	mux.Handle("GET /api/drivers", h.authProvider.RequireAuth(http.HandlerFunc(h.listDrivers)))
	mux.Handle("GET /api/drivers/me", h.authProvider.RequireRole(http.HandlerFunc(h.getMe), "Driver"))
	mux.Handle("GET /api/drivers/{id}", h.authProvider.RequireAuth(http.HandlerFunc(h.getDriver)))
	mux.Handle("PUT /api/drivers/{id}", h.authProvider.RequireRole(http.HandlerFunc(h.updateDriver), "Fleet Manager"))
	mux.Handle("DELETE /api/drivers/{id}", h.authProvider.RequireRole(http.HandlerFunc(h.deleteDriver), "Fleet Manager"))
	mux.Handle("POST /api/drivers/{id}/status", h.authProvider.RequireRole(http.HandlerFunc(h.updateDriverStatus), "Fleet Manager"))

	// Trips
	mux.Handle("POST /api/trips", h.authProvider.RequireRole(http.HandlerFunc(h.dispatchTrip), "Fleet Manager"))
	mux.Handle("POST /api/trips/{id}/complete", h.authProvider.RequireRole(http.HandlerFunc(h.completeTrip), "Fleet Manager", "Driver"))
	mux.Handle("POST /api/trips/{id}/cancel", h.authProvider.RequireRole(http.HandlerFunc(h.cancelTrip), "Fleet Manager"))
	mux.Handle("GET /api/trips", h.authProvider.RequireAuth(http.HandlerFunc(h.listTrips)))

	// Maintenance
	mux.Handle("POST /api/maintenance", h.authProvider.RequireRole(http.HandlerFunc(h.startMaintenance), "Fleet Manager"))
	mux.Handle("POST /api/maintenance/{id}/close", h.authProvider.RequireRole(http.HandlerFunc(h.closeMaintenance), "Fleet Manager"))
	mux.Handle("GET /api/maintenance", h.authProvider.RequireAuth(http.HandlerFunc(h.listMaintenance)))

	// KPIs
	mux.Handle("GET /api/kpis", h.authProvider.RequireAuth(http.HandlerFunc(h.getKPIStats)))
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req CreateVehicleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	vehicle, err := h.service.CreateVehicle(r.Context(), req)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusCreated, true, "Vehicle onboarded successfully", vehicle, nil)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	vehicle, err := h.service.GetVehicleByID(r.Context(), id)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "", vehicle, nil)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	vType := r.URL.Query().Get("type")
	search := r.URL.Query().Get("search")

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	paginated, err := h.service.ListVehicles(r.Context(), status, vType, search, page, limit)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "", paginated.Data, paginated.Meta)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req UpdateVehicleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	vehicle, err := h.service.UpdateVehicle(r.Context(), id, req)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "Vehicle updated successfully", vehicle, nil)
}

func (h *Handler) retire(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	vehicle, err := h.service.RetireVehicle(r.Context(), id)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "Vehicle retired successfully", vehicle, nil)
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	err := h.service.SoftDeleteVehicle(r.Context(), id)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "Vehicle deleted successfully", nil, nil)
}

// --- Helper Functions ---

func (h *Handler) writeJSON(w http.ResponseWriter, status int, success bool, msg string, data any, meta any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Response{
		Success: success,
		Message: msg,
		Data:    data,
		Meta:    meta,
	})
}

func (h *Handler) writeError(w http.ResponseWriter, status int, errs ...string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ErrorResponse{
		Success: false,
		Errors:  errs,
	})
}

func (h *Handler) handleError(w http.ResponseWriter, r *http.Request, err error) {
	user, _ := auth.CurrentUserFromContext(r.Context())

	switch {
	case errors.Is(err, ErrValidation):
		h.writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, ErrNotFound):
		h.writeError(w, http.StatusNotFound, "requested resource not found")
	case errors.Is(err, ErrDuplicateRegNumber):
		h.writeError(w, http.StatusConflict, "registration number must be unique")
	case errors.Is(err, ErrDuplicateLicense):
		h.writeError(w, http.StatusConflict, "license number must be unique")
	case errors.Is(err, ErrEmailTaken):
		h.writeError(w, http.StatusConflict, "email already exists")
	case errors.Is(err, ErrVehicleActive):
		h.writeError(w, http.StatusConflict, "cannot retire or delete a vehicle that is On Trip or In Shop")
	case errors.Is(err, ErrDriverActive):
		h.writeError(w, http.StatusConflict, "cannot modify or delete a driver that is On Trip")
	case errors.Is(err, ErrTripActive):
		h.writeError(w, http.StatusConflict, "trip is already completed or cancelled")
	case errors.Is(err, ErrVehicleCargoLimit):
		h.writeError(w, http.StatusConflict, "cargo weight exceeds vehicle capacity")
	default:
		// Structured internal log to hide implementation details from public API
		log.Printf("[ERROR] method=%s path=%s user_id=%s error=%v", r.Method, r.URL.Path, user.ID, err)
		h.writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

func (h *Handler) onboardDriver(w http.ResponseWriter, r *http.Request) {
	var req OnboardDriverRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	driver, tempPassword, err := h.service.OnboardDriver(r.Context(), req)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusCreated, true, "Driver onboarded successfully", OnboardDriverResponse{
		Driver:            driver,
		TemporaryPassword: tempPassword,
	}, nil)
}

func (h *Handler) getDriver(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	driver, err := h.service.GetDriverByID(r.Context(), id)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "", driver, nil)
}

func (h *Handler) listDrivers(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	paginated, err := h.service.ListDrivers(r.Context(), status, search, page, limit)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "", paginated.Data, paginated.Meta)
}

func (h *Handler) updateDriver(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req UpdateDriverRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	driver, err := h.service.UpdateDriver(r.Context(), id, req)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "Driver profile updated successfully", driver, nil)
}

func (h *Handler) updateDriverStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req UpdateDriverStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	err := h.service.UpdateDriverStatus(r.Context(), id, req.Status)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "Driver status updated successfully", nil, nil)
}

func (h *Handler) deleteDriver(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	err := h.service.SoftDeleteDriver(r.Context(), id)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "Driver profile deleted successfully", nil, nil)
}

func (h *Handler) getMe(w http.ResponseWriter, r *http.Request) {
	currentUser, ok := auth.CurrentUserFromContext(r.Context())
	if !ok {
		h.writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	driver, err := h.service.GetDriverByUserID(r.Context(), currentUser.ID)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "", driver, nil)
}

func (h *Handler) dispatchTrip(w http.ResponseWriter, r *http.Request) {
	var req DispatchTripRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	trip, err := h.service.DispatchTrip(r.Context(), req)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusCreated, true, "Trip dispatched successfully", trip, nil)
}

func (h *Handler) completeTrip(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req CompleteTripRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	err := h.service.CompleteTrip(r.Context(), id, req)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "Trip completed successfully", nil, nil)
}

func (h *Handler) cancelTrip(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	err := h.service.CancelTrip(r.Context(), id)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "Trip cancelled successfully", nil, nil)
}

func (h *Handler) listTrips(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	driverID := r.URL.Query().Get("driver_id")
	vehicleID := r.URL.Query().Get("vehicle_id")

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	paginated, err := h.service.ListTrips(r.Context(), status, driverID, vehicleID, page, limit)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "", paginated.Data, paginated.Meta)
}

func (h *Handler) startMaintenance(w http.ResponseWriter, r *http.Request) {
	var req StartMaintenanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	logEntry, err := h.service.StartMaintenance(r.Context(), req)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusCreated, true, "Vehicle sent to shop successfully", logEntry, nil)
}

func (h *Handler) closeMaintenance(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req CloseMaintenanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	err := h.service.CloseMaintenance(r.Context(), id, req)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "Vehicle maintenance closed successfully", nil, nil)
}

func (h *Handler) listMaintenance(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	vehicleID := r.URL.Query().Get("vehicle_id")

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	paginated, err := h.service.ListMaintenanceLogs(r.Context(), status, vehicleID, page, limit)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	h.writeJSON(w, http.StatusOK, true, "", paginated.Data, paginated.Meta)
}

func (h *Handler) getKPIStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.service.GetKPIStats(r.Context())
	if err != nil {
		h.handleError(w, r, err)
		return
	}
	h.writeJSON(w, http.StatusOK, true, "", stats, nil)
}
