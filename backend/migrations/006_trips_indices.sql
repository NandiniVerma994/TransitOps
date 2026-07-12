-- Create indices on trips table for performance optimization
CREATE INDEX IF NOT EXISTS idx_trips_driver_id_status ON trips (driver_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips (vehicle_id);
