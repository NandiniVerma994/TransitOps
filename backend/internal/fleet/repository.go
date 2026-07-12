package fleet

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/NandiniVerma994/TransitOps/backend/internal/db"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(database *sql.DB) *Repository {
	return &Repository{db: database}
}

func (r *Repository) CreateVehicle(ctx context.Context, v CreateVehicleRequest) (Vehicle, error) {
	q := db.GetQueryer(ctx, r.db)

	var vehicle Vehicle
	err := q.QueryRowContext(ctx, `
		INSERT INTO vehicles (registration_number, name, model, type, max_load_kg, odometer_km, acquisition_cost, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'Available')
		RETURNING id, registration_number, name, model, type, max_load_kg, odometer_km, acquisition_cost, status, created_at, updated_at;
	`,
		strings.TrimSpace(v.RegistrationNumber),
		strings.TrimSpace(v.Name),
		strings.TrimSpace(v.Model),
		strings.TrimSpace(v.Type),
		v.MaxLoadKG,
		v.OdometerKM,
		v.AcquisitionCost,
	).Scan(
		&vehicle.ID,
		&vehicle.RegistrationNumber,
		&vehicle.Name,
		&vehicle.Model,
		&vehicle.Type,
		&vehicle.MaxLoadKG,
		&vehicle.OdometerKM,
		&vehicle.AcquisitionCost,
		&vehicle.Status,
		&vehicle.CreatedAt,
		&vehicle.UpdatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "vehicles_registration_number_key") {
			return Vehicle{}, ErrDuplicateRegNumber
		}
		return Vehicle{}, err
	}

	return vehicle, nil
}

func (r *Repository) GetVehicleByID(ctx context.Context, id string) (Vehicle, error) {
	q := db.GetQueryer(ctx, r.db)

	var vehicle Vehicle
	err := q.QueryRowContext(ctx, `
		SELECT id, registration_number, name, model, type, max_load_kg, odometer_km, acquisition_cost, status, created_at, updated_at
		FROM vehicles
		WHERE id = $1 AND deleted_at IS NULL;
	`, id).Scan(
		&vehicle.ID,
		&vehicle.RegistrationNumber,
		&vehicle.Name,
		&vehicle.Model,
		&vehicle.Type,
		&vehicle.MaxLoadKG,
		&vehicle.OdometerKM,
		&vehicle.AcquisitionCost,
		&vehicle.Status,
		&vehicle.CreatedAt,
		&vehicle.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return Vehicle{}, ErrNotFound
	}
	if err != nil {
		return Vehicle{}, err
	}

	return vehicle, nil
}

func (r *Repository) LockVehicleForUpdate(ctx context.Context, id string) (Vehicle, error) {
	q := db.GetQueryer(ctx, r.db)

	var vehicle Vehicle
	err := q.QueryRowContext(ctx, `
		SELECT id, registration_number, name, model, type, max_load_kg, odometer_km, acquisition_cost, status, created_at, updated_at
		FROM vehicles
		WHERE id = $1 AND deleted_at IS NULL
		FOR UPDATE;
	`, id).Scan(
		&vehicle.ID,
		&vehicle.RegistrationNumber,
		&vehicle.Name,
		&vehicle.Model,
		&vehicle.Type,
		&vehicle.MaxLoadKG,
		&vehicle.OdometerKM,
		&vehicle.AcquisitionCost,
		&vehicle.Status,
		&vehicle.CreatedAt,
		&vehicle.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return Vehicle{}, ErrNotFound
	}
	if err != nil {
		return Vehicle{}, err
	}

	return vehicle, nil
}

func (r *Repository) ListVehicles(ctx context.Context, status, vType, search string, page, limit int) (PaginatedVehicles, error) {
	q := db.GetQueryer(ctx, r.db)

	var conditions []string
	var args []any
	idx := 1

	conditions = append(conditions, "deleted_at IS NULL")

	if status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", idx))
		args = append(args, status)
		idx++
	}

	if vType != "" {
		conditions = append(conditions, fmt.Sprintf("type = $%d", idx))
		args = append(args, vType)
		idx++
	}

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(lower(name) LIKE lower($%d) OR lower(registration_number) LIKE lower($%d))", idx, idx))
		args = append(args, "%"+search+"%")
		idx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	var total int
	countQuery := fmt.Sprintf("SELECT count(*) FROM vehicles %s", whereClause)
	err := q.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return PaginatedVehicles{}, err
	}

	offset := (page - 1) * limit
	args = append(args, limit, offset)
	listQuery := fmt.Sprintf(`
		SELECT id, registration_number, name, model, type, max_load_kg, odometer_km, acquisition_cost, status, created_at, updated_at
		FROM vehicles
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d;
	`, whereClause, idx, idx+1)

	rows, err := q.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return PaginatedVehicles{}, err
	}
	defer rows.Close()

	vehicles := make([]Vehicle, 0)
	for rows.Next() {
		var vehicle Vehicle
		err := rows.Scan(
			&vehicle.ID,
			&vehicle.RegistrationNumber,
			&vehicle.Name,
			&vehicle.Model,
			&vehicle.Type,
			&vehicle.MaxLoadKG,
			&vehicle.OdometerKM,
			&vehicle.AcquisitionCost,
			&vehicle.Status,
			&vehicle.CreatedAt,
			&vehicle.UpdatedAt,
		)
		if err != nil {
			return PaginatedVehicles{}, err
		}
		vehicles = append(vehicles, vehicle)
	}

	if err := rows.Err(); err != nil {
		return PaginatedVehicles{}, err
	}

	return PaginatedVehicles{
		Data: vehicles,
		Meta: PaginationMeta{
			Total: total,
			Page:  page,
			Limit: limit,
		},
	}, nil
}

func (r *Repository) UpdateVehicle(ctx context.Context, id string, req UpdateVehicleRequest) (Vehicle, error) {
	q := db.GetQueryer(ctx, r.db)

	// Dynamically build the update query to prevent overwriting other fields
	var sets []string
	var args []any
	idx := 1

	if req.Name != nil {
		sets = append(sets, fmt.Sprintf("name = $%d", idx))
		args = append(args, strings.TrimSpace(*req.Name))
		idx++
	}
	if req.Model != nil {
		sets = append(sets, fmt.Sprintf("model = $%d", idx))
		args = append(args, strings.TrimSpace(*req.Model))
		idx++
	}
	if req.Type != nil {
		sets = append(sets, fmt.Sprintf("type = $%d", idx))
		args = append(args, strings.TrimSpace(*req.Type))
		idx++
	}
	if req.MaxLoadKG != nil {
		sets = append(sets, fmt.Sprintf("max_load_kg = $%d", idx))
		args = append(args, *req.MaxLoadKG)
		idx++
	}
	if req.OdometerKM != nil {
		sets = append(sets, fmt.Sprintf("odometer_km = $%d", idx))
		args = append(args, *req.OdometerKM)
		idx++
	}
	if req.AcquisitionCost != nil {
		sets = append(sets, fmt.Sprintf("acquisition_cost = $%d", idx))
		args = append(args, *req.AcquisitionCost)
		idx++
	}

	if len(sets) == 0 {
		return r.GetVehicleByID(ctx, id)
	}

	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE vehicles
		SET %s, updated_at = now()
		WHERE id = $%d AND deleted_at IS NULL
		RETURNING id, registration_number, name, model, type, max_load_kg, odometer_km, acquisition_cost, status, created_at, updated_at;
	`, strings.Join(sets, ", "), idx)

	var vehicle Vehicle
	err := q.QueryRowContext(ctx, query, args...).Scan(
		&vehicle.ID,
		&vehicle.RegistrationNumber,
		&vehicle.Name,
		&vehicle.Model,
		&vehicle.Type,
		&vehicle.MaxLoadKG,
		&vehicle.OdometerKM,
		&vehicle.AcquisitionCost,
		&vehicle.Status,
		&vehicle.CreatedAt,
		&vehicle.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return Vehicle{}, ErrNotFound
	}
	if err != nil {
		return Vehicle{}, err
	}

	return vehicle, nil
}

func (r *Repository) UpdateVehicleStatus(ctx context.Context, id string, status string) error {
	q := db.GetQueryer(ctx, r.db)

	result, err := q.ExecContext(ctx, `
		UPDATE vehicles
		SET status = $1, updated_at = now()
		WHERE id = $2 AND deleted_at IS NULL;
	`, status, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *Repository) SoftDeleteVehicle(ctx context.Context, id string) error {
	q := db.GetQueryer(ctx, r.db)

	result, err := q.ExecContext(ctx, `
		UPDATE vehicles
		SET deleted_at = now(), updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL;
	`, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *Repository) GetRoleByName(ctx context.Context, roleName string) (string, error) {
	q := db.GetQueryer(ctx, r.db)
	var roleID string
	err := q.QueryRowContext(ctx, "SELECT id FROM roles WHERE lower(name) = lower($1);", roleName).Scan(&roleID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return roleID, err
}

func (r *Repository) IsEmailTaken(ctx context.Context, email string) (bool, error) {
	q := db.GetQueryer(ctx, r.db)
	var exists bool
	err := q.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE lower(email) = lower($1));", email).Scan(&exists)
	return exists, err
}

func (r *Repository) CreateUser(ctx context.Context, email, passwordHash, roleID string) (string, error) {
	q := db.GetQueryer(ctx, r.db)
	var userID string
	err := q.QueryRowContext(ctx, `
		INSERT INTO users (email, password_hash, role_id)
		VALUES ($1, $2, $3)
		RETURNING id;
	`, email, passwordHash, roleID).Scan(&userID)
	return userID, err
}

func (r *Repository) CreateDriver(ctx context.Context, d Driver) (Driver, error) {
	q := db.GetQueryer(ctx, r.db)
	var driver Driver
	err := q.QueryRowContext(ctx, `
		INSERT INTO drivers (user_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status)
		VALUES ($1, $2, $3, $4, $5, $6, 100, 'Available')
		RETURNING id, user_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, created_at, updated_at;
	`,
		d.UserID,
		strings.TrimSpace(d.Name),
		strings.TrimSpace(d.LicenseNumber),
		strings.TrimSpace(d.LicenseCategory),
		d.LicenseExpiryDate,
		strings.TrimSpace(d.ContactNumber),
	).Scan(
		&driver.ID,
		&driver.UserID,
		&driver.Name,
		&driver.LicenseNumber,
		&driver.LicenseCategory,
		&driver.LicenseExpiryDate,
		&driver.ContactNumber,
		&driver.SafetyScore,
		&driver.Status,
		&driver.CreatedAt,
		&driver.UpdatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "drivers_license_number_key") {
			return Driver{}, errors.New("license number must be unique")
		}
		return Driver{}, err
	}

	return driver, nil
}

func (r *Repository) GetDriverByID(ctx context.Context, id string) (Driver, error) {
	q := db.GetQueryer(ctx, r.db)
	var driver Driver
	err := q.QueryRowContext(ctx, `
		SELECT id, user_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, created_at, updated_at
		FROM drivers
		WHERE id = $1 AND deleted_at IS NULL;
	`, id).Scan(
		&driver.ID,
		&driver.UserID,
		&driver.Name,
		&driver.LicenseNumber,
		&driver.LicenseCategory,
		&driver.LicenseExpiryDate,
		&driver.ContactNumber,
		&driver.SafetyScore,
		&driver.Status,
		&driver.CreatedAt,
		&driver.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return Driver{}, ErrNotFound
	}
	if err != nil {
		return Driver{}, err
	}

	return driver, nil
}

func (r *Repository) GetDriverByUserID(ctx context.Context, userID string) (Driver, error) {
	q := db.GetQueryer(ctx, r.db)
	var driver Driver
	err := q.QueryRowContext(ctx, `
		SELECT id, user_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, created_at, updated_at
		FROM drivers
		WHERE user_id = $1 AND deleted_at IS NULL;
	`, userID).Scan(
		&driver.ID,
		&driver.UserID,
		&driver.Name,
		&driver.LicenseNumber,
		&driver.LicenseCategory,
		&driver.LicenseExpiryDate,
		&driver.ContactNumber,
		&driver.SafetyScore,
		&driver.Status,
		&driver.CreatedAt,
		&driver.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return Driver{}, ErrNotFound
	}
	if err != nil {
		return Driver{}, err
	}

	return driver, nil
}

func (r *Repository) LockDriverForUpdate(ctx context.Context, id string) (Driver, error) {
	q := db.GetQueryer(ctx, r.db)
	var driver Driver
	err := q.QueryRowContext(ctx, `
		SELECT id, user_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, created_at, updated_at
		FROM drivers
		WHERE id = $1 AND deleted_at IS NULL
		FOR UPDATE;
	`, id).Scan(
		&driver.ID,
		&driver.UserID,
		&driver.Name,
		&driver.LicenseNumber,
		&driver.LicenseCategory,
		&driver.LicenseExpiryDate,
		&driver.ContactNumber,
		&driver.SafetyScore,
		&driver.Status,
		&driver.CreatedAt,
		&driver.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return Driver{}, ErrNotFound
	}
	if err != nil {
		return Driver{}, err
	}

	return driver, nil
}

func (r *Repository) ListDrivers(ctx context.Context, status, search string, page, limit int) (PaginatedDrivers, error) {
	q := db.GetQueryer(ctx, r.db)
	var conditions []string
	var args []any
	idx := 1

	conditions = append(conditions, "deleted_at IS NULL")

	if status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", idx))
		args = append(args, status)
		idx++
	}

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(lower(name) LIKE lower($%d) OR lower(license_number) LIKE lower($%d))", idx, idx))
		args = append(args, "%"+search+"%")
		idx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	var total int
	countQuery := fmt.Sprintf("SELECT count(*) FROM drivers %s", whereClause)
	err := q.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return PaginatedDrivers{}, err
	}

	offset := (page - 1) * limit
	args = append(args, limit, offset)
	listQuery := fmt.Sprintf(`
		SELECT id, user_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, created_at, updated_at
		FROM drivers
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d;
	`, whereClause, idx, idx+1)

	rows, err := q.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return PaginatedDrivers{}, err
	}
	defer rows.Close()

	driversList := make([]Driver, 0)
	for rows.Next() {
		var driver Driver
		err := rows.Scan(
			&driver.ID,
			&driver.UserID,
			&driver.Name,
			&driver.LicenseNumber,
			&driver.LicenseCategory,
			&driver.LicenseExpiryDate,
			&driver.ContactNumber,
			&driver.SafetyScore,
			&driver.Status,
			&driver.CreatedAt,
			&driver.UpdatedAt,
		)
		if err != nil {
			return PaginatedDrivers{}, err
		}
		driversList = append(driversList, driver)
	}

	if err := rows.Err(); err != nil {
		return PaginatedDrivers{}, err
	}

	return PaginatedDrivers{
		Data: driversList,
		Meta: PaginationMeta{
			Total: total,
			Page:  page,
			Limit: limit,
		},
	}, nil
}

func (r *Repository) UpdateDriver(ctx context.Context, id string, req UpdateDriverRequest) (Driver, error) {
	q := db.GetQueryer(ctx, r.db)

	var sets []string
	var args []any
	idx := 1

	if req.Name != nil {
		sets = append(sets, fmt.Sprintf("name = $%d", idx))
		args = append(args, strings.TrimSpace(*req.Name))
		idx++
	}
	if req.LicenseNumber != nil {
		sets = append(sets, fmt.Sprintf("license_number = $%d", idx))
		args = append(args, strings.TrimSpace(*req.LicenseNumber))
		idx++
	}
	if req.LicenseCategory != nil {
		sets = append(sets, fmt.Sprintf("license_category = $%d", idx))
		args = append(args, strings.TrimSpace(*req.LicenseCategory))
		idx++
	}
	if req.LicenseExpiry != nil {
		sets = append(sets, fmt.Sprintf("license_expiry_date = $%d", idx))
		args = append(args, *req.LicenseExpiry)
		idx++
	}
	if req.ContactNumber != nil {
		sets = append(sets, fmt.Sprintf("contact_number = $%d", idx))
		args = append(args, strings.TrimSpace(*req.ContactNumber))
		idx++
	}

	if len(sets) == 0 {
		return r.GetDriverByID(ctx, id)
	}

	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE drivers
		SET %s, updated_at = now()
		WHERE id = $%d AND deleted_at IS NULL
		RETURNING id, user_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, created_at, updated_at;
	`, strings.Join(sets, ", "), idx)

	var driver Driver
	err := q.QueryRowContext(ctx, query, args...).Scan(
		&driver.ID,
		&driver.UserID,
		&driver.Name,
		&driver.LicenseNumber,
		&driver.LicenseCategory,
		&driver.LicenseExpiryDate,
		&driver.ContactNumber,
		&driver.SafetyScore,
		&driver.Status,
		&driver.CreatedAt,
		&driver.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return Driver{}, ErrNotFound
	}
	if err != nil {
		if strings.Contains(err.Error(), "drivers_license_number_key") {
			return Driver{}, errors.New("license number must be unique")
		}
		return Driver{}, err
	}

	return driver, nil
}

func (r *Repository) UpdateDriverStatus(ctx context.Context, id string, status string) error {
	q := db.GetQueryer(ctx, r.db)

	result, err := q.ExecContext(ctx, `
		UPDATE drivers
		SET status = $1, updated_at = now()
		WHERE id = $2 AND deleted_at IS NULL;
	`, status, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *Repository) SoftDeleteDriver(ctx context.Context, id string) error {
	q := db.GetQueryer(ctx, r.db)

	result, err := q.ExecContext(ctx, `
		UPDATE drivers
		SET deleted_at = now(), updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL;
	`, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *Repository) CreateTrip(ctx context.Context, t Trip) (Trip, error) {
	q := db.GetQueryer(ctx, r.db)
	var trip Trip
	err := q.QueryRowContext(ctx, `
		INSERT INTO trips (vehicle_id, driver_id, source, destination, cargo_weight_kg, planned_distance_km, revenue, status, dispatched_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'Dispatched', now())
		RETURNING id, vehicle_id, driver_id, source, destination, cargo_weight_kg, planned_distance_km, actual_distance_km, revenue, status, dispatched_at, completed_at, cancelled_at, created_at, updated_at;
	`,
		t.VehicleID,
		t.DriverID,
		strings.TrimSpace(t.Source),
		strings.TrimSpace(t.Destination),
		t.CargoWeightKG,
		t.PlannedDistanceKM,
		t.Revenue,
	).Scan(
		&trip.ID,
		&trip.VehicleID,
		&trip.DriverID,
		&trip.Source,
		&trip.Destination,
		&trip.CargoWeightKG,
		&trip.PlannedDistanceKM,
		&trip.ActualDistanceKM,
		&trip.Revenue,
		&trip.Status,
		&trip.DispatchedAt,
		&trip.CompletedAt,
		&trip.CancelledAt,
		&trip.CreatedAt,
		&trip.UpdatedAt,
	)
	return trip, err
}

func (r *Repository) GetTripByID(ctx context.Context, id string) (Trip, error) {
	q := db.GetQueryer(ctx, r.db)
	var trip Trip
	err := q.QueryRowContext(ctx, `
		SELECT id, vehicle_id, driver_id, source, destination, cargo_weight_kg, planned_distance_km, actual_distance_km, revenue, status, dispatched_at, completed_at, cancelled_at, created_at, updated_at
		FROM trips
		WHERE id = $1;
	`, id).Scan(
		&trip.ID,
		&trip.VehicleID,
		&trip.DriverID,
		&trip.Source,
		&trip.Destination,
		&trip.CargoWeightKG,
		&trip.PlannedDistanceKM,
		&trip.ActualDistanceKM,
		&trip.Revenue,
		&trip.Status,
		&trip.DispatchedAt,
		&trip.CompletedAt,
		&trip.CancelledAt,
		&trip.CreatedAt,
		&trip.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Trip{}, ErrNotFound
	}
	return trip, err
}

func (r *Repository) LockTripForUpdate(ctx context.Context, id string) (Trip, error) {
	q := db.GetQueryer(ctx, r.db)
	var trip Trip
	err := q.QueryRowContext(ctx, `
		SELECT id, vehicle_id, driver_id, source, destination, cargo_weight_kg, planned_distance_km, actual_distance_km, revenue, status, dispatched_at, completed_at, cancelled_at, created_at, updated_at
		FROM trips
		WHERE id = $1
		FOR UPDATE;
	`, id).Scan(
		&trip.ID,
		&trip.VehicleID,
		&trip.DriverID,
		&trip.Source,
		&trip.Destination,
		&trip.CargoWeightKG,
		&trip.PlannedDistanceKM,
		&trip.ActualDistanceKM,
		&trip.Revenue,
		&trip.Status,
		&trip.DispatchedAt,
		&trip.CompletedAt,
		&trip.CancelledAt,
		&trip.CreatedAt,
		&trip.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Trip{}, ErrNotFound
	}
	return trip, err
}

func (r *Repository) ListTrips(ctx context.Context, status, driverID, vehicleID string, page, limit int) (PaginatedTrips, error) {
	q := db.GetQueryer(ctx, r.db)
	var conditions []string
	var args []any
	idx := 1

	if status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", idx))
		args = append(args, status)
		idx++
	}

	if driverID != "" {
		conditions = append(conditions, fmt.Sprintf("driver_id = $%d", idx))
		args = append(args, driverID)
		idx++
	}

	if vehicleID != "" {
		conditions = append(conditions, fmt.Sprintf("vehicle_id = $%d", idx))
		args = append(args, vehicleID)
		idx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT count(*) FROM trips %s", whereClause)
	err := q.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return PaginatedTrips{}, err
	}

	offset := (page - 1) * limit
	args = append(args, limit, offset)
	listQuery := fmt.Sprintf(`
		SELECT id, vehicle_id, driver_id, source, destination, cargo_weight_kg, planned_distance_km, actual_distance_km, revenue, status, dispatched_at, completed_at, cancelled_at, created_at, updated_at
		FROM trips
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d;
	`, whereClause, idx, idx+1)

	rows, err := q.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return PaginatedTrips{}, err
	}
	defer rows.Close()

	tripsList := make([]Trip, 0)
	for rows.Next() {
		var trip Trip
		err := rows.Scan(
			&trip.ID,
			&trip.VehicleID,
			&trip.DriverID,
			&trip.Source,
			&trip.Destination,
			&trip.CargoWeightKG,
			&trip.PlannedDistanceKM,
			&trip.ActualDistanceKM,
			&trip.Revenue,
			&trip.Status,
			&trip.DispatchedAt,
			&trip.CompletedAt,
			&trip.CancelledAt,
			&trip.CreatedAt,
			&trip.UpdatedAt,
		)
		if err != nil {
			return PaginatedTrips{}, err
		}
		tripsList = append(tripsList, trip)
	}

	return PaginatedTrips{
		Data: tripsList,
		Meta: PaginationMeta{
			Total: total,
			Page:  page,
			Limit: limit,
		},
	}, nil
}

func (r *Repository) UpdateTripStatus(ctx context.Context, id string, status string, completedAt *time.Time, cancelledAt *time.Time, actualDistance *float64) error {
	q := db.GetQueryer(ctx, r.db)
	_, err := q.ExecContext(ctx, `
		UPDATE trips
		SET status = $1, completed_at = $2, cancelled_at = $3, actual_distance_km = $4, updated_at = now()
		WHERE id = $5;
	`, status, completedAt, cancelledAt, actualDistance, id)
	return err
}

func (r *Repository) UpdateVehicleOdometerAndStatus(ctx context.Context, id string, status string, odometer float64) error {
	q := db.GetQueryer(ctx, r.db)
	_, err := q.ExecContext(ctx, `
		UPDATE vehicles
		SET status = $1, odometer_km = $2, updated_at = now()
		WHERE id = $3;
	`, status, odometer, id)
	return err
}

func (r *Repository) CreateMaintenanceLog(ctx context.Context, log MaintenanceLog) (MaintenanceLog, error) {
	q := db.GetQueryer(ctx, r.db)
	var m MaintenanceLog
	err := q.QueryRowContext(ctx, `
		INSERT INTO maintenance_logs (vehicle_id, title, description, cost, status, started_at)
		VALUES ($1, $2, $3, $4, 'Active', now())
		RETURNING id, vehicle_id, title, description, cost, status, started_at, closed_at, created_at, updated_at;
	`,
		log.VehicleID,
		strings.TrimSpace(log.Title),
		strings.TrimSpace(log.Description),
		log.Cost,
	).Scan(
		&m.ID,
		&m.VehicleID,
		&m.Title,
		&m.Description,
		&m.Cost,
		&m.Status,
		&m.StartedAt,
		&m.ClosedAt,
		&m.CreatedAt,
		&m.UpdatedAt,
	)
	return m, err
}

func (r *Repository) GetMaintenanceLogByID(ctx context.Context, id string) (MaintenanceLog, error) {
	q := db.GetQueryer(ctx, r.db)
	var m MaintenanceLog
	err := q.QueryRowContext(ctx, `
		SELECT id, vehicle_id, title, description, cost, status, started_at, closed_at, created_at, updated_at
		FROM maintenance_logs
		WHERE id = $1;
	`, id).Scan(
		&m.ID,
		&m.VehicleID,
		&m.Title,
		&m.Description,
		&m.Cost,
		&m.Status,
		&m.StartedAt,
		&m.ClosedAt,
		&m.CreatedAt,
		&m.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return MaintenanceLog{}, ErrNotFound
	}
	return m, err
}

func (r *Repository) LockMaintenanceLogForUpdate(ctx context.Context, id string) (MaintenanceLog, error) {
	q := db.GetQueryer(ctx, r.db)
	var m MaintenanceLog
	err := q.QueryRowContext(ctx, `
		SELECT id, vehicle_id, title, description, cost, status, started_at, closed_at, created_at, updated_at
		FROM maintenance_logs
		WHERE id = $1
		FOR UPDATE;
	`, id).Scan(
		&m.ID,
		&m.VehicleID,
		&m.Title,
		&m.Description,
		&m.Cost,
		&m.Status,
		&m.StartedAt,
		&m.ClosedAt,
		&m.CreatedAt,
		&m.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return MaintenanceLog{}, ErrNotFound
	}
	return m, err
}

func (r *Repository) ListMaintenanceLogs(ctx context.Context, status, vehicleID string, page, limit int) (PaginatedMaintenanceLogs, error) {
	q := db.GetQueryer(ctx, r.db)
	var conditions []string
	var args []any
	idx := 1

	if status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", idx))
		args = append(args, status)
		idx++
	}

	if vehicleID != "" {
		conditions = append(conditions, fmt.Sprintf("vehicle_id = $%d", idx))
		args = append(args, vehicleID)
		idx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT count(*) FROM maintenance_logs %s", whereClause)
	err := q.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return PaginatedMaintenanceLogs{}, err
	}

	offset := (page - 1) * limit
	args = append(args, limit, offset)
	listQuery := fmt.Sprintf(`
		SELECT id, vehicle_id, title, description, cost, status, started_at, closed_at, created_at, updated_at
		FROM maintenance_logs
		%s
		ORDER BY started_at DESC
		LIMIT $%d OFFSET $%d;
	`, whereClause, idx, idx+1)

	rows, err := q.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return PaginatedMaintenanceLogs{}, err
	}
	defer rows.Close()

	logs := make([]MaintenanceLog, 0)
	for rows.Next() {
		var m MaintenanceLog
		err := rows.Scan(
			&m.ID,
			&m.VehicleID,
			&m.Title,
			&m.Description,
			&m.Cost,
			&m.Status,
			&m.StartedAt,
			&m.ClosedAt,
			&m.CreatedAt,
			&m.UpdatedAt,
		)
		if err != nil {
			return PaginatedMaintenanceLogs{}, err
		}
		logs = append(logs, m)
	}

	return PaginatedMaintenanceLogs{
		Data: logs,
		Meta: PaginationMeta{
			Total: total,
			Page:  page,
			Limit: limit,
		},
	}, nil
}

func (r *Repository) UpdateMaintenanceLog(ctx context.Context, id string, status string, cost float64, description string, closedAt *time.Time) error {
	q := db.GetQueryer(ctx, r.db)
	_, err := q.ExecContext(ctx, `
		UPDATE maintenance_logs
		SET status = $1, cost = $2, description = $3, closed_at = $4, updated_at = now()
		WHERE id = $5;
	`, status, cost, strings.TrimSpace(description), closedAt, id)
	return err
}

func (r *Repository) GetKPIStats(ctx context.Context) (KPIStats, error) {
	q := db.GetQueryer(ctx, r.db)
	var stats KPIStats

	// 1. Count vehicles by status and total non-retired
	var totalNonRetired int
	err := q.QueryRowContext(ctx, `
		SELECT 
			COALESCE(COUNT(*) FILTER (WHERE status = 'On Trip' AND deleted_at IS NULL), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'Available' AND deleted_at IS NULL), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'In Shop' AND deleted_at IS NULL), 0),
			COALESCE(COUNT(*) FILTER (WHERE status != 'Retired' AND deleted_at IS NULL), 0)
		FROM vehicles;
	`).Scan(&stats.ActiveVehicles, &stats.AvailableVehicles, &stats.VehiclesInMaintenance, &totalNonRetired)
	if err != nil {
		return KPIStats{}, err
	}

	// 2. Count active trips (status = 'Dispatched')
	err = q.QueryRowContext(ctx, `
		SELECT COALESCE(COUNT(*), 0)
		FROM trips
		WHERE status = 'Dispatched';
	`).Scan(&stats.ActiveTrips)
	if err != nil {
		return KPIStats{}, err
	}

	// 3. Count drivers on duty (status = 'Available' or 'On Trip')
	err = q.QueryRowContext(ctx, `
		SELECT COALESCE(COUNT(*), 0)
		FROM drivers
		WHERE status IN ('Available', 'On Trip') AND deleted_at IS NULL;
	`).Scan(&stats.DriversOnDuty)
	if err != nil {
		return KPIStats{}, err
	}

	// 4. Calculate utilization percentage
	if totalNonRetired > 0 {
		stats.FleetUtilizationPercent = int((float64(stats.ActiveVehicles) / float64(totalNonRetired)) * 100)
	}

	// 5. Get 5 most recent trips
	rows, err := q.QueryContext(ctx, `
		SELECT id, vehicle_id, driver_id, source, destination, cargo_weight_kg, planned_distance_km, actual_distance_km, revenue, status, dispatched_at, completed_at, cancelled_at, created_at, updated_at
		FROM trips
		ORDER BY created_at DESC
		LIMIT 5;
	`)
	if err != nil {
		return KPIStats{}, err
	}
	defer rows.Close()

	recentTrips := make([]Trip, 0)
	for rows.Next() {
		var trip Trip
		err := rows.Scan(
			&trip.ID,
			&trip.VehicleID,
			&trip.DriverID,
			&trip.Source,
			&trip.Destination,
			&trip.CargoWeightKG,
			&trip.PlannedDistanceKM,
			&trip.ActualDistanceKM,
			&trip.Revenue,
			&trip.Status,
			&trip.DispatchedAt,
			&trip.CompletedAt,
			&trip.CancelledAt,
			&trip.CreatedAt,
			&trip.UpdatedAt,
		)
		if err != nil {
			return KPIStats{}, err
		}
		recentTrips = append(recentTrips, trip)
	}
	stats.RecentTrips = recentTrips

	return stats, nil
}

