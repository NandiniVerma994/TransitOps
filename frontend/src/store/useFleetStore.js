import { create } from 'zustand';

// --- Mock Data ---
const initialVehicles = [
  { id: 'v1', regNumber: 'VAN-05', name: 'Ford Transit', type: 'Van', maxCapacity: 500, odometer: 12500, cost: 35000, region: 'North', status: 'Available' },
  { id: 'v2', regNumber: 'TRK-10', name: 'Volvo VNL', type: 'Heavy Truck', maxCapacity: 15000, odometer: 85200, cost: 120000, region: 'East', status: 'On Trip' },
  { id: 'v3', regNumber: 'VAN-08', name: 'Mercedes Sprinter', type: 'Van', maxCapacity: 800, odometer: 4200, cost: 45000, region: 'South', status: 'In Shop' }
];

const initialDrivers = [
  { id: 'd1', name: 'Alex Morgan', license: 'DL-9923', category: 'Heavy', expiry: '2027-05-12', phone: '+1 555-0192', safetyScore: 98, status: 'Available' },
  { id: 'd2', name: 'Sam Rivera', license: 'DL-1044', category: 'Light', expiry: '2026-11-30', phone: '+1 555-0833', safetyScore: 92, status: 'On Trip' },
  { id: 'd3', name: 'Jordan Lee', license: 'DL-0012', category: 'Heavy', expiry: '2025-01-15', phone: '+1 555-0455', safetyScore: 75, status: 'Suspended' }
];

const initialTrips = [
  { id: 't1', source: 'Depot A', destination: 'Warehouse B', vehicleId: 'v2', driverId: 'd2', cargoWeight: 12000, plannedDistance: 450, status: 'Dispatched' }
];

// --- Zustand Store ---
const useFleetStore = create((set, get) => ({
  vehicles: initialVehicles,
  drivers: initialDrivers,
  trips: initialTrips,
  maintenanceLogs: [],
  expenses: [], // To track maintenance and fuel costs

  // --- VEHICLE REGISTRY ACTIONS ---
  
  // VAL001: Registration number must be unique
  addVehicle: (vehicle) => {
    const { vehicles } = get();
    const isDuplicate = vehicles.some(v => v.regNumber === vehicle.regNumber);
    if (isDuplicate) throw new Error("DUPLICATE_REGISTRATION_NUMBER");
    
    set((state) => ({ 
      vehicles: [...state.vehicles, { ...vehicle, id: Date.now().toString(), status: 'Available' }] 
    }));
  },

  updateVehicle: (id, updates) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...updates } : v)
    }));
  },

  // VAL004: Cannot retire if On Trip or In Shop
  retireVehicle: (id) => {
    const vehicle = get().vehicles.find(v => v.id === id);
    if (vehicle?.status === 'On Trip' || vehicle?.status === 'In Shop') {
      throw new Error("VEHICLE_HAS_ACTIVE_DEPENDENCIES");
    }
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === id ? { ...v, status: 'Retired' } : v)
    }));
  },

  // --- DRIVER ACTIONS ---

  addDriver: (driver) => {
    set((state) => ({
      drivers: [...state.drivers, { ...driver, id: Date.now().toString(), status: 'Available' }]
    }));
  },

  // VAL005: Cannot suspend or mark off duty if On Trip
  updateDriverStatus: (id, newStatus) => {
    const driver = get().drivers.find(d => d.id === id);
    if (driver?.status === 'On Trip') throw new Error("DRIVER_HAS_ACTIVE_TRIP");
    
    set((state) => ({
      drivers: state.drivers.map(d => d.id === id ? { ...d, status: newStatus } : d)
    }));
  },

  // --- MAINTENANCE ACTIONS ---

  // VAL002: Vehicle must be Available
  startMaintenance: (vehicleId, logDetails) => {
    const vehicle = get().vehicles.find(v => v.id === vehicleId);
    if (vehicle?.status !== 'Available') throw new Error("VEHICLE_NOT_AVAILABLE_FOR_SHOP");

    set((state) => ({
      maintenanceLogs: [...state.maintenanceLogs, { ...logDetails, id: Date.now().toString(), vehicleId, status: 'Active' }],
      vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, status: 'In Shop' } : v)
    }));
  },

  // VAL003: Restore to Available upon close, add to expenses
  closeMaintenance: (logId, actualCost, notes) => {
    const log = get().maintenanceLogs.find(l => l.id === logId);
    if (!log) return;

    set((state) => {
      // Find the vehicle to check if it was manually retired while in shop
      const vehicle = state.vehicles.find(v => v.id === log.vehicleId);
      const newVehicleStatus = vehicle?.status === 'Retired' ? 'Retired' : 'Available';

      return {
        maintenanceLogs: state.maintenanceLogs.map(l => l.id === logId ? { ...l, status: 'Closed', actualCost, notes } : l),
        vehicles: state.vehicles.map(v => v.id === log.vehicleId ? { ...v, status: newVehicleStatus } : v),
        expenses: [...state.expenses, { id: Date.now().toString(), type: 'Maintenance', amount: actualCost, vehicleId: log.vehicleId, date: new Date().toISOString() }]
      };
    });
  },

  // --- DISPATCH ACTIONS ---

  dispatchTrip: (tripDetails) => {
    set((state) => ({
      trips: [...state.trips, { ...tripDetails, id: Date.now().toString(), status: 'Dispatched' }],
      vehicles: state.vehicles.map(v => v.id === tripDetails.vehicleId ? { ...v, status: 'On Trip' } : v),
      drivers: state.drivers.map(d => d.id === tripDetails.driverId ? { ...d, status: 'On Trip' } : d)
    }));
  },

  // VAL006: Odometer logic applied here during trip completion
  completeTrip: (tripId, finalOdometer, fuelUsed) => {
    const trip = get().trips.find(t => t.id === tripId);
    if (!trip) return;
    
    const vehicle = get().vehicles.find(v => v.id === trip.vehicleId);
    if (vehicle && finalOdometer < vehicle.odometer) {
      throw new Error("INVALID_ODOMETER_VALUE");
    }

    set((state) => ({
      trips: state.trips.map(t => t.id === tripId ? { ...t, status: 'Completed', finalOdometer, fuelUsed } : t),
      vehicles: state.vehicles.map(v => v.id === trip.vehicleId ? { ...v, status: 'Available', odometer: finalOdometer } : v),
      drivers: state.drivers.map(d => d.id === trip.driverId ? { ...d, status: 'Available' } : d),
      expenses: fuelUsed > 0 ? [...state.expenses, { id: Date.now().toString(), type: 'Fuel', amount: fuelUsed, vehicleId: trip.vehicleId, date: new Date().toISOString() }] : state.expenses
    }));
  },

  // --- SAFETY ACTIONS ---
  triggerEmailReminder: (driverId) => {
    // Mock action to simulate an email sent
    const driver = get().drivers.find(d => d.id === driverId);
    return `Reminder email successfully sent to ${driver?.name || 'Driver'}.`;
  },
  
  updateDriverScore: (id, newScore) => {
    set((state) => ({
      drivers: state.drivers.map(d => d.id === id ? { ...d, safetyScore: Number(newScore) } : d)
    }));
  }
}));

export default useFleetStore;
