-- Migration: Add deleted_at columns for soft delete support on vehicles and drivers

ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Filtered indexes to speed up active query operations
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(deleted_at) WHERE deleted_at IS NULL;
