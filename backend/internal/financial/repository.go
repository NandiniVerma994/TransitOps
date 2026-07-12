package financial

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(database *sql.DB) *Repository {
	return &Repository{db: database}
}

func (r *Repository) ListVehicleRefs(ctx context.Context) ([]VehicleRef, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id::text, registration_number, COALESCE(NULLIF(model, ''), name), type, acquisition_cost, status
		FROM vehicles
		WHERE deleted_at IS NULL
		ORDER BY registration_number;
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	vehicles := make([]VehicleRef, 0)
	for rows.Next() {
		var v VehicleRef
		if err := rows.Scan(&v.ID, &v.RegistrationNo, &v.Model, &v.Type, &v.AcquisitionCost, &v.Status); err != nil {
			return nil, err
		}
		vehicles = append(vehicles, v)
	}

	return vehicles, rows.Err()
}

func (r *Repository) ListTripOptions(ctx context.Context) ([]Option, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id::text,
		       source || ' -> ' || destination || ' (' || upper(substr(id::text, 1, 8)) || ')' AS label
		FROM trips
		ORDER BY created_at DESC
		LIMIT 200;
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	options := make([]Option, 0)
	for rows.Next() {
		var option Option
		if err := rows.Scan(&option.Value, &option.Label); err != nil {
			return nil, err
		}
		options = append(options, option)
	}

	return options, rows.Err()
}

func (r *Repository) ListFuelLogs(ctx context.Context, search string) ([]FuelLog, error) {
	args := []any{}
	where := ""
	if search = strings.TrimSpace(search); search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		where = `WHERE lower(v.registration_number) LIKE $1 OR lower(fl.trip_id::text) LIKE $1 OR lower(fl.id::text) LIKE $1`
	}

	query := fmt.Sprintf(`
		SELECT fl.id::text,
		       v.id::text,
		       v.registration_number,
		       COALESCE(NULLIF(v.model, ''), v.name),
		       v.type,
		       v.acquisition_cost,
		       v.status,
		       COALESCE(fl.trip_id::text, ''),
		       fl.logged_at,
		       fl.liters,
		       fl.cost,
		       COALESCE(fl.odometer_km, v.odometer_km),
		       COALESCE(fl.prev_odometer_km, fl.odometer_km, v.odometer_km)
		FROM fuel_logs fl
		JOIN vehicles v ON v.id = fl.vehicle_id
		%s
		ORDER BY fl.logged_at DESC, fl.created_at DESC;
	`, where)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := make([]FuelLog, 0)
	for rows.Next() {
		var log FuelLog
		var vehicle VehicleRef
		if err := rows.Scan(
			&log.ID,
			&vehicle.ID,
			&vehicle.RegistrationNo,
			&vehicle.Model,
			&vehicle.Type,
			&vehicle.AcquisitionCost,
			&vehicle.Status,
			&log.TripID,
			&log.Date,
			&log.Liters,
			&log.TotalCost,
			&log.Odometer,
			&log.PrevOdometer,
		); err != nil {
			return nil, err
		}
		log.VehicleID = vehicle.RegistrationNo
		log.Vehicle = &vehicle
		logs = append(logs, log)
	}

	return logs, rows.Err()
}

func (r *Repository) CreateFuelLog(ctx context.Context, req LogFuelRequest, userID string, prevOdometer float64) (string, error) {
	var id string
	var tripID any
	if strings.TrimSpace(req.TripID) != "" {
		tripID = strings.TrimSpace(req.TripID)
	}

	err := r.db.QueryRowContext(ctx, `
		INSERT INTO fuel_logs (vehicle_id, trip_id, created_by_user_id, liters, cost, logged_at, odometer_km, prev_odometer_km)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id::text;
	`, req.VehicleID, tripID, userID, req.Liters, req.TotalCost, req.Date, req.Odometer, prevOdometer).Scan(&id)
	if err != nil {
		return "", err
	}

	_, err = r.db.ExecContext(ctx, `
		UPDATE vehicles
		SET odometer_km = GREATEST(odometer_km, $1), updated_at = now()
		WHERE id = $2;
	`, req.Odometer, req.VehicleID)
	if err != nil {
		return "", err
	}

	return id, nil
}

func (r *Repository) PreviousOdometer(ctx context.Context, vehicleID string) (float64, error) {
	var odometer float64
	err := r.db.QueryRowContext(ctx, `
		SELECT COALESCE(
			(SELECT odometer_km FROM fuel_logs WHERE vehicle_id = $1 AND odometer_km IS NOT NULL ORDER BY logged_at DESC, created_at DESC LIMIT 1),
			(SELECT odometer_km FROM vehicles WHERE id = $1),
			0
		);
	`, vehicleID).Scan(&odometer)
	return odometer, err
}

func (r *Repository) ListExpenses(ctx context.Context, search, expenseType string, from, to time.Time) ([]Expense, error) {
	conditions := make([]string, 0)
	args := make([]any, 0)
	idx := 1

	if expenseType = strings.TrimSpace(expenseType); expenseType != "" && expenseType != "All" {
		conditions = append(conditions, fmt.Sprintf("e.type = $%d", idx))
		args = append(args, expenseType)
		idx++
	}
	if search = strings.TrimSpace(search); search != "" {
		conditions = append(conditions, fmt.Sprintf("(lower(COALESCE(v.registration_number, '')) LIKE $%d OR lower(COALESCE(e.trip_id::text, '')) LIKE $%d OR lower(COALESCE(e.note, '')) LIKE $%d OR lower(e.id::text) LIKE $%d)", idx, idx, idx, idx))
		args = append(args, "%"+strings.ToLower(search)+"%")
		idx++
	}
	if !from.IsZero() {
		conditions = append(conditions, fmt.Sprintf("e.incurred_at >= $%d", idx))
		args = append(args, from)
		idx++
	}
	if !to.IsZero() {
		conditions = append(conditions, fmt.Sprintf("e.incurred_at <= $%d", idx))
		args = append(args, to)
		idx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT e.id::text,
		       e.incurred_at,
		       e.type,
		       COALESCE(v.id::text, ''),
		       COALESCE(v.registration_number, ''),
		       COALESCE(NULLIF(v.model, ''), v.name, ''),
		       COALESCE(v.type, ''),
		       COALESCE(v.acquisition_cost, 0),
		       COALESCE(v.status, ''),
		       COALESCE(e.trip_id::text, ''),
		       e.amount,
		       COALESCE(e.note, ''),
		       COALESCE(u.email, 'System')
		FROM expenses e
		LEFT JOIN vehicles v ON v.id = e.vehicle_id
		LEFT JOIN users u ON u.id = e.created_by_user_id
		%s
		ORDER BY e.incurred_at DESC, e.created_at DESC;
	`, where)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	expenses := make([]Expense, 0)
	for rows.Next() {
		var expense Expense
		var vehicle VehicleRef
		if err := rows.Scan(
			&expense.ID,
			&expense.Date,
			&expense.Type,
			&vehicle.ID,
			&vehicle.RegistrationNo,
			&vehicle.Model,
			&vehicle.Type,
			&vehicle.AcquisitionCost,
			&vehicle.Status,
			&expense.TripID,
			&expense.Amount,
			&expense.Note,
			&expense.LoggedBy,
		); err != nil {
			return nil, err
		}
		if vehicle.ID != "" {
			expense.VehicleID = vehicle.RegistrationNo
			expense.Vehicle = &vehicle
		}
		expenses = append(expenses, expense)
	}

	return expenses, rows.Err()
}

func (r *Repository) CreateExpense(ctx context.Context, req LogExpenseRequest, userID string) (string, error) {
	var id string
	var tripID any
	if strings.TrimSpace(req.TripID) != "" {
		tripID = strings.TrimSpace(req.TripID)
	}

	err := r.db.QueryRowContext(ctx, `
		INSERT INTO expenses (vehicle_id, trip_id, created_by_user_id, type, amount, note, incurred_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())
		RETURNING id::text;
	`, req.VehicleID, tripID, userID, req.Type, req.Amount, strings.TrimSpace(req.Note)).Scan(&id)
	return id, err
}

func (r *Repository) ListMaintenanceCosts(ctx context.Context, search, status string) ([]MaintenanceCost, error) {
	conditions := make([]string, 0)
	args := make([]any, 0)
	idx := 1

	if status = strings.TrimSpace(status); status != "" && status != "All" {
		conditions = append(conditions, fmt.Sprintf("m.status = $%d", idx))
		args = append(args, status)
		idx++
	}
	if search = strings.TrimSpace(search); search != "" {
		conditions = append(conditions, fmt.Sprintf("(lower(v.registration_number) LIKE $%d OR lower(m.title) LIKE $%d OR lower(m.id::text) LIKE $%d)", idx, idx, idx))
		args = append(args, "%"+strings.ToLower(search)+"%")
		idx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT m.id::text,
		       m.title,
		       v.id::text,
		       v.registration_number,
		       COALESCE(NULLIF(v.model, ''), v.name),
		       v.type,
		       v.acquisition_cost,
		       v.status,
		       m.cost,
		       m.status,
		       m.started_at,
		       m.closed_at,
		       COALESCE(m.description, '')
		FROM maintenance_logs m
		JOIN vehicles v ON v.id = m.vehicle_id
		%s
		ORDER BY m.started_at DESC;
	`, where)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := make([]MaintenanceCost, 0)
	for rows.Next() {
		var log MaintenanceCost
		var vehicle VehicleRef
		if err := rows.Scan(
			&log.ID,
			&log.Title,
			&vehicle.ID,
			&vehicle.RegistrationNo,
			&vehicle.Model,
			&vehicle.Type,
			&vehicle.AcquisitionCost,
			&vehicle.Status,
			&log.Cost,
			&log.Status,
			&log.StartedAt,
			&log.ClosedAt,
			&log.Description,
		); err != nil {
			return nil, err
		}
		log.VehicleID = vehicle.RegistrationNo
		log.Vehicle = &vehicle
		log.Category = maintenanceCategory(log.Title, log.Description)
		logs = append(logs, log)
	}

	return logs, rows.Err()
}

func (r *Repository) TripRevenueByVehicle(ctx context.Context) (map[string]float64, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT v.registration_number, COALESCE(SUM(t.revenue), 0)
		FROM vehicles v
		LEFT JOIN trips t ON t.vehicle_id = v.id AND t.status = 'Completed'
		WHERE v.deleted_at IS NULL
		GROUP BY v.registration_number;
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	revenue := make(map[string]float64)
	for rows.Next() {
		var vehicleID string
		var amount float64
		if err := rows.Scan(&vehicleID, &amount); err != nil {
			return nil, err
		}
		revenue[vehicleID] = amount
	}

	return revenue, rows.Err()
}

func (r *Repository) MonthlyRevenueExpense(ctx context.Context) ([]PeriodValue, error) {
	rows, err := r.db.QueryContext(ctx, `
		WITH months AS (
			SELECT generate_series(
				date_trunc('month', current_date) - interval '5 months',
				date_trunc('month', current_date),
				interval '1 month'
			) AS month_start
		)
		SELECT to_char(months.month_start, 'Mon') AS period,
		       COALESCE((
			       SELECT SUM(revenue)
			       FROM trips
			       WHERE status = 'Completed'
			         AND created_at >= months.month_start
			         AND created_at < months.month_start + interval '1 month'
		       ), 0) AS revenue,
		       COALESCE((
			       SELECT SUM(cost)
			       FROM fuel_logs
			       WHERE logged_at >= months.month_start
			         AND logged_at < months.month_start + interval '1 month'
		       ), 0)
		       + COALESCE((
			       SELECT SUM(cost)
			       FROM maintenance_logs
			       WHERE started_at >= months.month_start
			         AND started_at < months.month_start + interval '1 month'
		       ), 0)
		       + COALESCE((
			       SELECT SUM(amount)
			       FROM expenses
			       WHERE incurred_at >= months.month_start
			         AND incurred_at < months.month_start + interval '1 month'
		       ), 0) AS expenses
		FROM months
		ORDER BY months.month_start;
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	periods := make([]PeriodValue, 0)
	for rows.Next() {
		var p PeriodValue
		if err := rows.Scan(&p.Period, &p.Revenue, &p.Expenses); err != nil {
			return nil, err
		}
		p.Month = p.Period
		p.Expense = p.Expenses
		periods = append(periods, p)
	}

	return periods, rows.Err()
}
