CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    model TEXT,
    type TEXT NOT NULL,
    max_load_kg NUMERIC(10, 2) NOT NULL CHECK (max_load_kg > 0),
    odometer_km NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (odometer_km >= 0),
    acquisition_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (acquisition_cost >= 0),
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'In Shop', 'Retired')),
    region TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    license_number TEXT NOT NULL UNIQUE,
    license_category TEXT NOT NULL,
    license_expiry_date DATE NOT NULL,
    contact_number TEXT NOT NULL,
    safety_score INTEGER NOT NULL DEFAULT 100 CHECK (safety_score BETWEEN 0 AND 100),
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'Off Duty', 'Suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    source TEXT NOT NULL,
    destination TEXT NOT NULL,
    cargo_weight_kg NUMERIC(10, 2) NOT NULL CHECK (cargo_weight_kg > 0),
    planned_distance_km NUMERIC(10, 2) NOT NULL CHECK (planned_distance_km > 0),
    actual_distance_km NUMERIC(10, 2) CHECK (actual_distance_km IS NULL OR actual_distance_km >= 0),
    revenue NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')),
    dispatched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (source <> destination)
);

CREATE TABLE maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    title TEXT NOT NULL,
    description TEXT,
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Closed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    trip_id UUID REFERENCES trips(id),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    liters NUMERIC(10, 2) NOT NULL CHECK (liters > 0),
    cost NUMERIC(12, 2) NOT NULL CHECK (cost >= 0),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id),
    trip_id UUID REFERENCES trips(id),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('Fuel', 'Maintenance', 'Toll', 'Other')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    note TEXT,
    incurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_type_region ON vehicles(type, region);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_maintenance_vehicle_status ON maintenance_logs(vehicle_id, status);
CREATE INDEX idx_fuel_logs_vehicle_id ON fuel_logs(vehicle_id);
CREATE INDEX idx_expenses_vehicle_id ON expenses(vehicle_id);

CREATE UNIQUE INDEX uniq_dispatched_trip_per_vehicle ON trips(vehicle_id)
WHERE status = 'Dispatched';

CREATE UNIQUE INDEX uniq_dispatched_trip_per_driver ON trips(driver_id)
WHERE status = 'Dispatched';

CREATE UNIQUE INDEX uniq_active_maintenance_per_vehicle ON maintenance_logs(vehicle_id)
WHERE status = 'Active';

INSERT INTO roles (name)
VALUES ('Fleet Manager'), ('Driver'), ('Safety Officer'), ('Financial Analyst')
ON CONFLICT (name) DO NOTHING;
