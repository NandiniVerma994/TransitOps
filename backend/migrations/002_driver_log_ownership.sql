ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE fuel_logs
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE expenses
SET type = 'Other'
WHERE type IN ('Permit', 'Fine');

ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_type_check;

ALTER TABLE expenses
ADD CONSTRAINT expenses_type_check
CHECK (type IN ('Fuel', 'Maintenance', 'Toll', 'Other'));
