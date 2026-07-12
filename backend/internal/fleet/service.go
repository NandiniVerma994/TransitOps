package fleet

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/NandiniVerma994/TransitOps/backend/internal/db"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrValidation         = errors.New("validation failed")
	ErrNotFound           = errors.New("record not found")
	ErrDuplicateRegNumber = errors.New("registration number must be unique")
	ErrDuplicateLicense   = errors.New("license number must be unique")
	ErrVehicleActive      = errors.New("vehicle has active dependencies (On Trip or In Shop)")
	ErrDriverActive       = errors.New("driver has active dependencies (On Trip)")
	ErrEmailTaken         = errors.New("email already exists")
	ErrTripActive         = errors.New("trip is already completed or cancelled")
	ErrVehicleCargoLimit  = errors.New("cargo weight exceeds vehicle capacity")
)

type Service struct {
	repo      *Repository
	txManager *db.TxManager
}

func NewService(repo *Repository, txManager *db.TxManager) *Service {
	return &Service{
		repo:      repo,
		txManager: txManager,
	}
}

func (s *Service) CreateVehicle(ctx context.Context, req CreateVehicleRequest) (Vehicle, error) {
	if err := s.validateCreateRequest(req); err != nil {
		return Vehicle{}, err
	}

	return s.repo.CreateVehicle(ctx, req)
}

func (s *Service) GetVehicleByID(ctx context.Context, id string) (Vehicle, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return Vehicle{}, fmt.Errorf("%w: vehicle ID is required", ErrValidation)
	}

	return s.repo.GetVehicleByID(ctx, id)
}

func (s *Service) ListVehicles(ctx context.Context, status, vType, search string, page, limit int) (PaginatedVehicles, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 10
	}

	// Normalize filter values
	status = strings.TrimSpace(status)
	vType = strings.TrimSpace(vType)
	search = strings.TrimSpace(search)

	// Validate status if provided
	if status != "" {
		switch status {
		case "Available", "On Trip", "In Shop", "Retired":
			// valid
		default:
			return PaginatedVehicles{}, fmt.Errorf("%w: invalid status filter", ErrValidation)
		}
	}

	return s.repo.ListVehicles(ctx, status, vType, search, page, limit)
}

func (s *Service) UpdateVehicle(ctx context.Context, id string, req UpdateVehicleRequest) (Vehicle, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return Vehicle{}, fmt.Errorf("%w: vehicle ID is required", ErrValidation)
	}

	if err := s.validateUpdateRequest(req); err != nil {
		return Vehicle{}, err
	}

	return s.repo.UpdateVehicle(ctx, id, req)
}

func (s *Service) RetireVehicle(ctx context.Context, id string) (Vehicle, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return Vehicle{}, fmt.Errorf("%w: vehicle ID is required", ErrValidation)
	}

	var vehicle Vehicle
	err := s.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// Lock row for status check and modification to prevent race conditions
		v, err := s.repo.LockVehicleForUpdate(txCtx, id)
		if err != nil {
			return err
		}

		if v.Status == "On Trip" || v.Status == "In Shop" {
			return ErrVehicleActive
		}

		if v.Status == "Retired" {
			vehicle = v
			return nil
		}

		err = s.repo.UpdateVehicleStatus(txCtx, id, "Retired")
		if err != nil {
			return err
		}

		v.Status = "Retired"
		vehicle = v
		return nil
	})

	if err != nil {
		return Vehicle{}, err
	}

	return vehicle, nil
}

func (s *Service) SoftDeleteVehicle(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("%w: vehicle ID is required", ErrValidation)
	}

	return s.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// Lock row to check active status before deletion
		v, err := s.repo.LockVehicleForUpdate(txCtx, id)
		if err != nil {
			return err
		}

		if v.Status == "On Trip" || v.Status == "In Shop" {
			return ErrVehicleActive
		}

		return s.repo.SoftDeleteVehicle(txCtx, id)
	})
}

// --- Validation Helpers ---

func (s *Service) validateCreateRequest(req CreateVehicleRequest) error {
	reg := strings.TrimSpace(req.RegistrationNumber)
	if reg == "" {
		return fmt.Errorf("%w: registration number is required", ErrValidation)
	}
	if len(reg) < 3 || len(reg) > 20 {
		return fmt.Errorf("%w: registration number must be between 3 and 20 characters", ErrValidation)
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return fmt.Errorf("%w: name is required", ErrValidation)
	}
	if len(name) < 2 || len(name) > 100 {
		return fmt.Errorf("%w: name must be between 2 and 100 characters", ErrValidation)
	}

	vType := strings.TrimSpace(req.Type)
	if vType == "" {
		return fmt.Errorf("%w: vehicle type is required", ErrValidation)
	}
	switch vType {
	case "Van", "Heavy Truck", "Mini":
		// valid
	default:
		return fmt.Errorf("%w: vehicle type must be one of 'Van', 'Heavy Truck', 'Mini'", ErrValidation)
	}

	if req.MaxLoadKG <= 0 {
		return fmt.Errorf("%w: max load capacity must be greater than 0", ErrValidation)
	}

	if req.OdometerKM < 0 {
		return fmt.Errorf("%w: odometer cannot be negative", ErrValidation)
	}

	if req.AcquisitionCost < 0 {
		return fmt.Errorf("%w: acquisition cost cannot be negative", ErrValidation)
	}

	return nil
}

func (s *Service) validateUpdateRequest(req UpdateVehicleRequest) error {
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return fmt.Errorf("%w: name cannot be empty", ErrValidation)
		}
		if len(name) < 2 || len(name) > 100 {
			return fmt.Errorf("%w: name must be between 2 and 100 characters", ErrValidation)
		}
	}

	if req.Type != nil {
		vType := strings.TrimSpace(*req.Type)
		switch vType {
		case "Van", "Heavy Truck", "Mini":
			// valid
		default:
			return fmt.Errorf("%w: vehicle type must be one of 'Van', 'Heavy Truck', 'Mini'", ErrValidation)
		}
	}

	if req.MaxLoadKG != nil && *req.MaxLoadKG <= 0 {
		return fmt.Errorf("%w: max load capacity must be greater than 0", ErrValidation)
	}

	if req.OdometerKM != nil && *req.OdometerKM < 0 {
		return fmt.Errorf("%w: odometer cannot be negative", ErrValidation)
	}

	if req.AcquisitionCost != nil && *req.AcquisitionCost < 0 {
		return fmt.Errorf("%w: acquisition cost cannot be negative", ErrValidation)
	}

	return nil
}

func (s *Service) OnboardDriver(ctx context.Context, req OnboardDriverRequest) (Driver, string, error) {
	if err := s.validateOnboardRequest(req); err != nil {
		return Driver{}, "", err
	}

	var driver Driver
	var tempPassword string

	err := s.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// 1. Check if email is already taken
		email := strings.ToLower(strings.TrimSpace(req.Email))
		taken, err := s.repo.IsEmailTaken(txCtx, email)
		if err != nil {
			return err
		}
		if taken {
			return ErrEmailTaken
		}

		// 2. Resolve Role ID for "Driver"
		roleID, err := s.repo.GetRoleByName(txCtx, "Driver")
		if err != nil {
			return err
		}

		// 3. Generate random temporary password
		pwd, err := generateTempPassword()
		if err != nil {
			return fmt.Errorf("generate temp password: %w", err)
		}
		tempPassword = pwd

		// 4. Hash password
		hash, err := hashPassword(tempPassword)
		if err != nil {
			return fmt.Errorf("hash password: %w", err)
		}

		// 5. Create user record
		userID, err := s.repo.CreateUser(txCtx, email, hash, roleID)
		if err != nil {
			return err
		}

		// 6. Create driver record
		d := Driver{
			UserID:             &userID,
			Name:               req.Name,
			LicenseNumber:      req.LicenseNumber,
			LicenseCategory:    req.LicenseCategory,
			LicenseExpiryDate:  req.LicenseExpiry,
			ContactNumber:      req.ContactNumber,
		}

		driver, err = s.repo.CreateDriver(txCtx, d)
		if err != nil {
			if strings.Contains(err.Error(), "license number must be unique") {
				return ErrDuplicateLicense
			}
			return err
		}

		return nil
	})

	if err != nil {
		return Driver{}, "", err
	}

	return driver, tempPassword, nil
}

func (s *Service) GetDriverByID(ctx context.Context, id string) (Driver, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return Driver{}, fmt.Errorf("%w: driver ID is required", ErrValidation)
	}

	return s.repo.GetDriverByID(ctx, id)
}

func (s *Service) ListDrivers(ctx context.Context, status, search string, page, limit int) (PaginatedDrivers, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 10
	}

	status = strings.TrimSpace(status)
	search = strings.TrimSpace(search)

	if status != "" {
		switch status {
		case "Available", "On Trip", "Off Duty", "Suspended":
			// valid
		default:
			return PaginatedDrivers{}, fmt.Errorf("%w: invalid status filter", ErrValidation)
		}
	}

	return s.repo.ListDrivers(ctx, status, search, page, limit)
}

func (s *Service) UpdateDriver(ctx context.Context, id string, req UpdateDriverRequest) (Driver, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return Driver{}, fmt.Errorf("%w: driver ID is required", ErrValidation)
	}

	if err := s.validateUpdateDriverRequest(req); err != nil {
		return Driver{}, err
	}

	driver, err := s.repo.UpdateDriver(ctx, id, req)
	if err != nil {
		if strings.Contains(err.Error(), "license number must be unique") {
			return Driver{}, ErrDuplicateLicense
		}
		return Driver{}, err
	}

	return driver, nil
}

func (s *Service) UpdateDriverStatus(ctx context.Context, id string, status string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("%w: driver ID is required", ErrValidation)
	}

	status = strings.TrimSpace(status)
	switch status {
	case "Available", "Off Duty", "Suspended":
		// valid
	default:
		return fmt.Errorf("%w: invalid status", ErrValidation)
	}

	return s.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		d, err := s.repo.LockDriverForUpdate(txCtx, id)
		if err != nil {
			return err
		}

		if d.Status == "On Trip" {
			return ErrDriverActive
		}

		return s.repo.UpdateDriverStatus(txCtx, id, status)
	})
}

func (s *Service) SoftDeleteDriver(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("%w: driver ID is required", ErrValidation)
	}

	return s.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		d, err := s.repo.LockDriverForUpdate(txCtx, id)
		if err != nil {
			return err
		}

		if d.Status == "On Trip" {
			return ErrDriverActive
		}

		return s.repo.SoftDeleteDriver(txCtx, id)
	})
}

func (s *Service) validateOnboardRequest(req OnboardDriverRequest) error {
	email := strings.TrimSpace(req.Email)
	if email == "" {
		return fmt.Errorf("%w: email is required", ErrValidation)
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email {
		return fmt.Errorf("%w: invalid email address", ErrValidation)
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return fmt.Errorf("%w: name is required", ErrValidation)
	}
	if len(name) < 2 || len(name) > 100 {
		return fmt.Errorf("%w: name must be between 2 and 100 characters", ErrValidation)
	}

	license := strings.TrimSpace(req.LicenseNumber)
	if license == "" {
		return fmt.Errorf("%w: license number is required", ErrValidation)
	}
	if len(license) < 3 || len(license) > 30 {
		return fmt.Errorf("%w: license number must be between 3 and 30 characters", ErrValidation)
	}

	category := strings.TrimSpace(req.LicenseCategory)
	if category == "" {
		return fmt.Errorf("%w: license category is required", ErrValidation)
	}
	switch category {
	case "Heavy", "Light", "Special":
		// valid
	default:
		return fmt.Errorf("%w: license category must be one of 'Heavy', 'Light', 'Special'", ErrValidation)
	}

	if req.LicenseExpiry.Before(time.Now()) {
		return fmt.Errorf("%w: driving license is expired or invalid", ErrValidation)
	}

	phone := strings.TrimSpace(req.ContactNumber)
	if phone == "" {
		return fmt.Errorf("%w: contact number is required", ErrValidation)
	}

	return nil
}

func (s *Service) validateUpdateDriverRequest(req UpdateDriverRequest) error {
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return fmt.Errorf("%w: name cannot be empty", ErrValidation)
		}
		if len(name) < 2 || len(name) > 100 {
			return fmt.Errorf("%w: name must be between 2 and 100 characters", ErrValidation)
		}
	}

	if req.LicenseNumber != nil {
		license := strings.TrimSpace(*req.LicenseNumber)
		if license == "" {
			return fmt.Errorf("%w: license number cannot be empty", ErrValidation)
		}
		if len(license) < 3 || len(license) > 30 {
			return fmt.Errorf("%w: license number must be between 3 and 30 characters", ErrValidation)
		}
	}

	if req.LicenseCategory != nil {
		category := strings.TrimSpace(*req.LicenseCategory)
		switch category {
		case "Heavy", "Light", "Special":
			// valid
		default:
			return fmt.Errorf("%w: license category must be one of 'Heavy', 'Light', 'Special'", ErrValidation)
		}
	}

	if req.LicenseExpiry != nil && req.LicenseExpiry.Before(time.Now()) {
		return fmt.Errorf("%w: driving license is expired or invalid", ErrValidation)
	}

	if req.ContactNumber != nil && strings.TrimSpace(*req.ContactNumber) == "" {
		return fmt.Errorf("%w: contact number cannot be empty", ErrValidation)
	}

	return nil
}

func hashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

func generateTempPassword() (string, error) {
	bytes := make([]byte, 6)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil // 12 characters alphanumeric
}

func (s *Service) GetDriverByUserID(ctx context.Context, userID string) (Driver, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return Driver{}, fmt.Errorf("%w: user ID is required", ErrValidation)
	}
	return s.repo.GetDriverByUserID(ctx, userID)
}

func (s *Service) DispatchTrip(ctx context.Context, req DispatchTripRequest) (Trip, error) {
	if err := s.validateDispatchTrip(req); err != nil {
		return Trip{}, err
	}

	var trip Trip
	err := s.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// Lock vehicle and verify status and capacity
		v, err := s.repo.LockVehicleForUpdate(txCtx, req.VehicleID)
		if err != nil {
			return err
		}
		if v.Status != "Available" {
			return fmt.Errorf("%w: vehicle status is %s", ErrVehicleActive, v.Status)
		}
		if req.CargoWeightKG > v.MaxLoadKG {
			return ErrVehicleCargoLimit
		}

		// Lock driver and verify status
		d, err := s.repo.LockDriverForUpdate(txCtx, req.DriverID)
		if err != nil {
			return err
		}
		if d.Status != "Available" {
			return fmt.Errorf("%w: driver status is %s", ErrDriverActive, d.Status)
		}

		// Update vehicle and driver status
		if err := s.repo.UpdateVehicleStatus(txCtx, v.ID, "On Trip"); err != nil {
			return err
		}
		if err := s.repo.UpdateDriverStatus(txCtx, d.ID, "On Trip"); err != nil {
			return err
		}

		// Create trip
		t := Trip{
			VehicleID:         req.VehicleID,
			DriverID:          req.DriverID,
			Source:            req.Source,
			Destination:       req.Destination,
			CargoWeightKG:     req.CargoWeightKG,
			PlannedDistanceKM: req.PlannedDistanceKM,
			Revenue:           req.Revenue,
		}

		trip, err = s.repo.CreateTrip(txCtx, t)
		return err
	})

	return trip, err
}

func (s *Service) CompleteTrip(ctx context.Context, id string, req CompleteTripRequest) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("%w: trip ID is required", ErrValidation)
	}

	if req.ActualDistanceKM <= 0 {
		return fmt.Errorf("%w: actual distance must be greater than 0", ErrValidation)
	}
	if req.EndOdometerKM <= 0 {
		return fmt.Errorf("%w: end odometer must be greater than 0", ErrValidation)
	}

	return s.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// Lock trip
		t, err := s.repo.LockTripForUpdate(txCtx, id)
		if err != nil {
			return err
		}
		if t.Status != "Dispatched" {
			return ErrTripActive
		}

		// Lock vehicle
		v, err := s.repo.LockVehicleForUpdate(txCtx, t.VehicleID)
		if err != nil {
			return err
		}

		// Verify odometer
		if req.EndOdometerKM < v.OdometerKM {
			return fmt.Errorf("%w: end odometer cannot be less than current odometer", ErrValidation)
		}

		// Lock driver
		_, err = s.repo.LockDriverForUpdate(txCtx, t.DriverID)
		if err != nil {
			return err
		}

		// Update trip
		nowTime := time.Now()
		if err := s.repo.UpdateTripStatus(txCtx, id, "Completed", &nowTime, nil, &req.ActualDistanceKM); err != nil {
			return err
		}

		// Update vehicle
		if err := s.repo.UpdateVehicleOdometerAndStatus(txCtx, v.ID, "Available", req.EndOdometerKM); err != nil {
			return err
		}

		// Update driver status
		return s.repo.UpdateDriverStatus(txCtx, t.DriverID, "Available")
	})
}

func (s *Service) CancelTrip(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("%w: trip ID is required", ErrValidation)
	}

	return s.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// Lock trip
		t, err := s.repo.LockTripForUpdate(txCtx, id)
		if err != nil {
			return err
		}
		if t.Status != "Dispatched" {
			return ErrTripActive
		}

		// Update trip
		nowTime := time.Now()
		if err := s.repo.UpdateTripStatus(txCtx, id, "Cancelled", nil, &nowTime, nil); err != nil {
			return err
		}

		// Update vehicle status
		if err := s.repo.UpdateVehicleStatus(txCtx, t.VehicleID, "Available"); err != nil {
			return err
		}

		// Update driver status
		return s.repo.UpdateDriverStatus(txCtx, t.DriverID, "Available")
	})
}

func (s *Service) ListTrips(ctx context.Context, status, driverID, vehicleID string, page, limit int) (PaginatedTrips, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 10
	}

	status = strings.TrimSpace(status)
	driverID = strings.TrimSpace(driverID)
	vehicleID = strings.TrimSpace(vehicleID)

	if status != "" {
		switch status {
		case "Draft", "Dispatched", "Completed", "Cancelled":
			// valid
		default:
			return PaginatedTrips{}, fmt.Errorf("%w: invalid trip status", ErrValidation)
		}
	}

	return s.repo.ListTrips(ctx, status, driverID, vehicleID, page, limit)
}

func (s *Service) validateDispatchTrip(req DispatchTripRequest) error {
	if strings.TrimSpace(req.VehicleID) == "" {
		return fmt.Errorf("%w: vehicle ID is required", ErrValidation)
	}
	if strings.TrimSpace(req.DriverID) == "" {
		return fmt.Errorf("%w: driver ID is required", ErrValidation)
	}
	if strings.TrimSpace(req.Source) == "" {
		return fmt.Errorf("%w: source location is required", ErrValidation)
	}
	if strings.TrimSpace(req.Destination) == "" {
		return fmt.Errorf("%w: destination location is required", ErrValidation)
	}
	if strings.TrimSpace(req.Source) == strings.TrimSpace(req.Destination) {
		return fmt.Errorf("%w: source and destination cannot be the same", ErrValidation)
	}
	if req.CargoWeightKG <= 0 {
		return fmt.Errorf("%w: cargo weight must be greater than 0", ErrValidation)
	}
	if req.PlannedDistanceKM <= 0 {
		return fmt.Errorf("%w: planned distance must be greater than 0", ErrValidation)
	}
	if req.Revenue < 0 {
		return fmt.Errorf("%w: revenue cannot be negative", ErrValidation)
	}
	return nil
}

func (s *Service) StartMaintenance(ctx context.Context, req StartMaintenanceRequest) (MaintenanceLog, error) {
	if err := s.validateStartMaintenance(req); err != nil {
		return MaintenanceLog{}, err
	}

	var log MaintenanceLog
	err := s.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// Lock vehicle and verify status
		v, err := s.repo.LockVehicleForUpdate(txCtx, req.VehicleID)
		if err != nil {
			return err
		}
		if v.Status != "Available" {
			return fmt.Errorf("%w: vehicle status is %s", ErrVehicleActive, v.Status)
		}

		// Update vehicle status
		if err := s.repo.UpdateVehicleStatus(txCtx, v.ID, "In Shop"); err != nil {
			return err
		}

		// Create maintenance log
		l := MaintenanceLog{
			VehicleID:   req.VehicleID,
			Title:       req.Title,
			Description: req.Description,
			Cost:        req.EstimatedCost,
		}

		log, err = s.repo.CreateMaintenanceLog(txCtx, l)
		return err
	})

	return log, err
}

func (s *Service) CloseMaintenance(ctx context.Context, id string, req CloseMaintenanceRequest) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("%w: maintenance log ID is required", ErrValidation)
	}
	if req.ActualCost < 0 {
		return fmt.Errorf("%w: cost cannot be negative", ErrValidation)
	}

	return s.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		// Lock maintenance log
		l, err := s.repo.LockMaintenanceLogForUpdate(txCtx, id)
		if err != nil {
			return err
		}
		if l.Status != "Active" {
			return fmt.Errorf("%w: maintenance is already closed", ErrTripActive)
		}

		// Lock vehicle
		v, err := s.repo.LockVehicleForUpdate(txCtx, l.VehicleID)
		if err != nil {
			return err
		}

		// If retired, keep status retired, else update to Available
		newStatus := "Available"
		if v.Status == "Retired" {
			newStatus = "Retired"
		}

		if err := s.repo.UpdateVehicleStatus(txCtx, v.ID, newStatus); err != nil {
			return err
		}

		// Update maintenance log
		nowTime := time.Now()
		desc := req.Description
		if desc == "" {
			desc = l.Description
		}

		return s.repo.UpdateMaintenanceLog(txCtx, id, "Closed", req.ActualCost, desc, &nowTime)
	})
}

func (s *Service) ListMaintenanceLogs(ctx context.Context, status, vehicleID string, page, limit int) (PaginatedMaintenanceLogs, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 10
	}

	status = strings.TrimSpace(status)
	vehicleID = strings.TrimSpace(vehicleID)

	if status != "" {
		switch status {
		case "Active", "Closed":
			// valid
		default:
			return PaginatedMaintenanceLogs{}, fmt.Errorf("%w: invalid maintenance status", ErrValidation)
		}
	}

	return s.repo.ListMaintenanceLogs(ctx, status, vehicleID, page, limit)
}

func (s *Service) validateStartMaintenance(req StartMaintenanceRequest) error {
	if strings.TrimSpace(req.VehicleID) == "" {
		return fmt.Errorf("%w: vehicle ID is required", ErrValidation)
	}
	if strings.TrimSpace(req.Title) == "" {
		return fmt.Errorf("%w: title/service type is required", ErrValidation)
	}
	if req.EstimatedCost < 0 {
		return fmt.Errorf("%w: estimated cost cannot be negative", ErrValidation)
	}
	return nil
}

func (s *Service) GetKPIStats(ctx context.Context) (KPIStats, error) {
	return s.repo.GetKPIStats(ctx)
}



