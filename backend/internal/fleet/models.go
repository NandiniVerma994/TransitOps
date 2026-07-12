package fleet

import (
	"time"
)

type Vehicle struct {
	ID                 string     `json:"id"`
	RegistrationNumber string     `json:"registration_number"`
	Name               string     `json:"name"`
	Model              string     `json:"model"`
	Type               string     `json:"type"`
	MaxLoadKG          float64    `json:"max_load_kg"`
	OdometerKM         float64    `json:"odometer_km"`
	AcquisitionCost    float64    `json:"acquisition_cost"`
	Status             string     `json:"status"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	DeletedAt          *time.Time `json:"deleted_at,omitempty"`
}

type CreateVehicleRequest struct {
	RegistrationNumber string  `json:"registration_number"`
	Name               string  `json:"name"`
	Model              string  `json:"model"`
	Type               string  `json:"type"`
	MaxLoadKG          float64 `json:"max_load_kg"`
	OdometerKM         float64 `json:"odometer_km"`
	AcquisitionCost    float64 `json:"acquisition_cost"`
}

type UpdateVehicleRequest struct {
	Name            *string  `json:"name"`
	Model           *string  `json:"model"`
	Type            *string  `json:"type"`
	MaxLoadKG       *float64 `json:"max_load_kg"`
	OdometerKM      *float64 `json:"odometer_km"`
	AcquisitionCost *float64 `json:"acquisition_cost"`
}

type PaginatedVehicles struct {
	Data []Vehicle      `json:"data"`
	Meta PaginationMeta `json:"meta"`
}

type PaginationMeta struct {
	Total int `json:"total"`
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

type Driver struct {
	ID                 string     `json:"id"`
	UserID             *string    `json:"user_id,omitempty"`
	Name               string     `json:"name"`
	LicenseNumber      string     `json:"license_number"`
	LicenseCategory    string     `json:"license_category"`
	LicenseExpiryDate  time.Time  `json:"license_expiry_date"`
	ContactNumber      string     `json:"contact_number"`
	SafetyScore        int        `json:"safety_score"`
	Status             string     `json:"status"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	DeletedAt          *time.Time `json:"deleted_at,omitempty"`
}

type OnboardDriverRequest struct {
	Email           string    `json:"email"`
	Name            string    `json:"name"`
	LicenseNumber   string    `json:"license_number"`
	LicenseCategory string    `json:"license_category"`
	LicenseExpiry   time.Time `json:"license_expiry_date"`
	ContactNumber   string    `json:"contact_number"`
}

type OnboardDriverResponse struct {
	Driver            Driver `json:"driver"`
	TemporaryPassword string `json:"temporary_password"`
}

type UpdateDriverRequest struct {
	Name            *string    `json:"name"`
	LicenseNumber   *string    `json:"license_number"`
	LicenseCategory *string    `json:"license_category"`
	LicenseExpiry   *time.Time `json:"license_expiry_date"`
	ContactNumber   *string    `json:"contact_number"`
}

type UpdateDriverStatusRequest struct {
	Status string `json:"status"`
}

type PaginatedDrivers struct {
	Data []Driver       `json:"data"`
	Meta PaginationMeta `json:"meta"`
}

type Trip struct {
	ID                string     `json:"id"`
	VehicleID         string     `json:"vehicle_id"`
	DriverID          string     `json:"driver_id"`
	Source            string     `json:"source"`
	Destination       string     `json:"destination"`
	CargoWeightKG     float64    `json:"cargo_weight_kg"`
	PlannedDistanceKM float64    `json:"planned_distance_km"`
	ActualDistanceKM  *float64   `json:"actual_distance_km,omitempty"`
	Revenue           float64    `json:"revenue"`
	Status            string     `json:"status"`
	DispatchedAt      *time.Time `json:"dispatched_at,omitempty"`
	CompletedAt       *time.Time `json:"completed_at,omitempty"`
	CancelledAt       *time.Time `json:"cancelled_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type DispatchTripRequest struct {
	VehicleID         string  `json:"vehicle_id"`
	DriverID          string  `json:"driver_id"`
	Source            string  `json:"source"`
	Destination       string  `json:"destination"`
	CargoWeightKG     float64 `json:"cargo_weight_kg"`
	PlannedDistanceKM float64 `json:"planned_distance_km"`
	Revenue           float64 `json:"revenue"`
}

type CompleteTripRequest struct {
	ActualDistanceKM float64 `json:"actual_distance_km"`
	EndOdometerKM    float64 `json:"end_odometer_km"`
}

type PaginatedTrips struct {
	Data []Trip         `json:"data"`
	Meta PaginationMeta `json:"meta"`
}

type MaintenanceLog struct {
	ID          string     `json:"id"`
	VehicleID   string     `json:"vehicle_id"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	Cost        float64    `json:"cost"`
	Status      string     `json:"status"`
	StartedAt   time.Time  `json:"started_at"`
	ClosedAt    *time.Time `json:"closed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type StartMaintenanceRequest struct {
	VehicleID     string  `json:"vehicle_id"`
	Title         string  `json:"title"`
	Description   string  `json:"description,omitempty"`
	EstimatedCost float64 `json:"estimated_cost"`
}

type CloseMaintenanceRequest struct {
	ActualCost  float64 `json:"actual_cost"`
	Description string  `json:"description,omitempty"`
}

type PaginatedMaintenanceLogs struct {
	Data []MaintenanceLog `json:"data"`
	Meta PaginationMeta   `json:"meta"`
}

type KPIStats struct {
	ActiveVehicles          int    `json:"active_vehicles"`
	AvailableVehicles       int    `json:"available_vehicles"`
	VehiclesInMaintenance  int    `json:"vehicles_in_maintenance"`
	ActiveTrips             int    `json:"active_trips"`
	PendingTrips            int    `json:"pending_trips"`
	DriversOnDuty           int    `json:"drivers_on_duty"`
	FleetUtilizationPercent int    `json:"fleet_utilization_percent"`
	RecentTrips             []Trip `json:"recent_trips"`
}




