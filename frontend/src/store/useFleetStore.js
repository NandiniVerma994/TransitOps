import { create } from 'zustand';
import { api } from '../api';

// --- Mappers ---
const mapVehicleFromBackend = (v) => ({
  id: v.id,
  regNumber: v.registration_number,
  name: v.name,
  model: v.model || '',
  type: v.type,
  maxCapacity: Number(v.max_load_kg),
  odometer: Number(v.odometer_km),
  cost: Number(v.acquisition_cost),
  status: v.status,
  createdAt: v.created_at,
  updatedAt: v.updated_at
});

const mapDriverFromBackend = (d) => ({
  id: d.id,
  userId: d.user_id,
  name: d.name,
  license: d.license_number,
  category: d.license_category,
  expiry: d.license_expiry_date ? d.license_expiry_date.split('T')[0] : '',
  phone: d.contact_number,
  safetyScore: d.safety_score,
  status: d.status,
  createdAt: d.created_at,
  updatedAt: d.updated_at
});

const mapMaintenanceLogFromBackend = (log) => ({
  id: log.id,
  vehicleId: log.vehicle_id,
  title: log.title,
  description: log.description || '',
  estimatedCost: log.status === 'Active' ? Number(log.cost) : 0,
  actualCost: log.status === 'Closed' ? Number(log.cost) : 0,
  status: log.status,
  scheduledDate: log.started_at ? log.started_at.split('T')[0] : '',
  closedAt: log.closed_at ? log.closed_at.split('T')[0] : ''
});

const mapTripFromBackend = (t) => ({
  id: t.id,
  vehicleId: t.vehicle_id,
  driverId: t.driver_id,
  source: t.source,
  destination: t.destination,
  cargoWeight: Number(t.cargo_weight_kg),
  plannedDistance: Number(t.planned_distance_km),
  actualDistance: t.actual_distance_km ? Number(t.actual_distance_km) : null,
  revenue: Number(t.revenue),
  status: t.status,
  dispatchedAt: t.dispatched_at,
  completedAt: t.completed_at,
  cancelledAt: t.cancelled_at,
  createdAt: t.created_at,
  updatedAt: t.updated_at
});

// --- Zustand Store ---
const useFleetStore = create((set, get) => ({
  vehicles: [],
  drivers: [],
  trips: [],
  currentDriver: null,
  maintenanceLogs: [],
  expenses: [],
  isLoading: false,
  error: null,
  pagination: null,
  kpis: null,

  // --- VEHICLE REGISTRY ACTIONS ---

  fetchVehicles: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/api/vehicles${queryString}`);
      if (res.success) {
        set({
          vehicles: res.data.map(mapVehicleFromBackend),
          pagination: res.meta,
          isLoading: false
        });
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  addVehicle: async (vehicle) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/vehicles', {
        registration_number: vehicle.regNumber,
        name: vehicle.name,
        model: vehicle.model || '',
        type: vehicle.type,
        max_load_kg: Number(vehicle.maxCapacity),
        odometer_km: Number(vehicle.odometer),
        acquisition_cost: Number(vehicle.cost)
      });
      if (res.success) {
        await get().fetchVehicles();
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateVehicle: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.model !== undefined) payload.model = updates.model;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.maxCapacity !== undefined) payload.max_load_kg = Number(updates.maxCapacity);
      if (updates.odometer !== undefined) payload.odometer_km = Number(updates.odometer);
      if (updates.cost !== undefined) payload.acquisition_cost = Number(updates.cost);

      const res = await api.put(`/api/vehicles/${id}`, payload);
      if (res.success) {
        await get().fetchVehicles();
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  retireVehicle: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/api/vehicles/${id}/retire`);
      if (res.success) {
        await get().fetchVehicles();
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // --- DRIVER ACTIONS ---

  fetchDrivers: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/api/drivers${queryString}`);
      if (res.success) {
        set({
          drivers: res.data.map(mapDriverFromBackend),
          isLoading: false
        });
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  addDriver: async (driver) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/drivers', {
        email: driver.email,
        name: driver.name,
        license_number: driver.license,
        license_category: driver.category,
        license_expiry_date: driver.expiry + 'T00:00:00Z',
        contact_number: driver.phone
      });
      if (res.success) {
        await get().fetchDrivers();
        return res.data.temporary_password;
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateDriverStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/api/drivers/${id}/status`, { status });
      if (res.success) {
        await get().fetchDrivers();
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteDriver: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.delete(`/api/drivers/${id}`);
      if (res.success) {
        await get().fetchDrivers();
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // --- MAINTENANCE ACTIONS ---

  fetchMaintenanceLogs: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.vehicleId) params.append('vehicle_id', filters.vehicleId);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/api/maintenance${queryString}`);
      if (res.success) {
        set({
          maintenanceLogs: res.data.map(mapMaintenanceLogFromBackend),
          isLoading: false
        });
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  startMaintenance: async (vehicleId, logDetails) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/maintenance', {
        vehicle_id: vehicleId,
        title: logDetails.title,
        description: logDetails.description || '',
        estimated_cost: Number(logDetails.estimatedCost)
      });
      if (res.success) {
        await get().fetchMaintenanceLogs();
        await get().fetchVehicles();
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  closeMaintenance: async (logId, actualCost, notes) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/api/maintenance/${logId}/close`, {
        actual_cost: Number(actualCost),
        description: notes || ''
      });
      if (res.success) {
        await get().fetchMaintenanceLogs();
        await get().fetchVehicles();
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // --- DISPATCH ACTIONS ---

  fetchTrips: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.driverId) params.append('driver_id', filters.driverId);
      if (filters.vehicleId) params.append('vehicle_id', filters.vehicleId);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/api/trips${queryString}`);
      if (res.success) {
        set({
          trips: res.data.map(mapTripFromBackend),
          isLoading: false
        });
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  fetchCurrentDriver: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/drivers/me');
      if (res.success) {
        const mapped = mapDriverFromBackend(res.data);
        set({
          currentDriver: mapped,
          isLoading: false
        });
        return mapped;
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  dispatchTrip: async (tripDetails) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/trips', {
        vehicle_id: tripDetails.vehicleId,
        driver_id: tripDetails.driverId,
        source: tripDetails.source,
        destination: tripDetails.destination,
        cargo_weight_kg: Number(tripDetails.cargoWeight),
        planned_distance_km: Number(tripDetails.plannedDistance),
        revenue: Number(tripDetails.revenue)
      });
      if (res.success) {
        await get().fetchTrips();
        await get().fetchVehicles();
        await get().fetchDrivers();
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  completeTrip: async (tripId, finalOdometer, actualDistance) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/api/trips/${tripId}/complete`, {
        actual_distance_km: Number(actualDistance),
        end_odometer_km: Number(finalOdometer)
      });
      if (res.success) {
        await get().fetchTrips();
        await get().fetchVehicles();
        await get().fetchDrivers();
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  cancelTrip: async (tripId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/api/trips/${tripId}/cancel`);
      if (res.success) {
        await get().fetchTrips();
        await get().fetchVehicles();
        await get().fetchDrivers();
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  fetchKPIs: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/kpis');
      if (res.success) {
        const mappedKPIs = {
          activeVehicles: res.data.active_vehicles,
          availableVehicles: res.data.available_vehicles,
          vehiclesInMaintenance: res.data.vehicles_in_maintenance,
          activeTrips: res.data.active_trips,
          pendingTrips: res.data.pending_trips,
          driversOnDuty: res.data.drivers_on_duty,
          fleetUtilizationPercent: res.data.fleet_utilization_percent,
          recentTrips: (res.data.recent_trips || []).map(mapTripFromBackend)
        };
        set({
          kpis: mappedKPIs,
          isLoading: false
        });
        return mappedKPIs;
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  }
}));

export default useFleetStore;
