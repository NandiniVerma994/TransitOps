ALTER TABLE fuel_logs
ADD COLUMN IF NOT EXISTS odometer_km NUMERIC(12, 2) CHECK (odometer_km IS NULL OR odometer_km >= 0),
ADD COLUMN IF NOT EXISTS prev_odometer_km NUMERIC(12, 2) CHECK (prev_odometer_km IS NULL OR prev_odometer_km >= 0);

ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_type_check;

ALTER TABLE expenses
ADD CONSTRAINT expenses_type_check
CHECK (type IN ('Fuel', 'Maintenance', 'Toll', 'Permit', 'Fine', 'Other'));

CREATE INDEX IF NOT EXISTS idx_fuel_logs_logged_at ON fuel_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_expenses_incurred_at ON expenses(incurred_at);
