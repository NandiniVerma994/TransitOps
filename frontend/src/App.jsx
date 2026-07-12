import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import FleetDashboardPage from './features/fleet/pages/FleetDashboardPage';
import VehicleRegistryPage from './features/fleet/pages/VehicleRegistryPage';
import DriverManagementPage from './features/fleet/pages/DriverManagementPage';
import TripDispatcherPage from './features/fleet/pages/TripDispatcherPage';
import MaintenancePage from './features/fleet/pages/MaintenancePage';
import DriverDashboard from './features/driver/DriverDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/driver-dashboard" element={<DriverDashboard />} />
        
        {/* Protected Dashboard Routes (Fleet Manager View) */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<FleetDashboardPage />} />
          <Route path="/fleet" element={<VehicleRegistryPage />} />
          <Route path="/drivers" element={<DriverManagementPage />} />
          <Route path="/trips" element={<TripDispatcherPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
