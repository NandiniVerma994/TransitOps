import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import FleetDashboardPage from './features/fleet/pages/FleetDashboardPage';
import VehicleRegistryPage from './features/fleet/pages/VehicleRegistryPage';
import DriverManagementPage from './features/fleet/pages/DriverManagementPage';
import TripDispatcherPage from './features/fleet/pages/TripDispatcherPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/" element={<LoginPage />} />
        
        {/* Protected Dashboard Routes (Fleet Manager View) */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<FleetDashboardPage />} />
          <Route path="/fleet" element={<VehicleRegistryPage />} />
          <Route path="/drivers" element={<DriverManagementPage />} />
          <Route path="/trips" element={<TripDispatcherPage />} />
          
          {/* Temporary placeholders for remaining tabs */}
          <Route path="/maintenance" element={<div className="text-white"><h2 className="text-2xl font-bold">Maintenance</h2></div>} />
          <Route path="/expenses" element={<div className="text-white"><h2 className="text-2xl font-bold">Fuel & Expenses</h2></div>} />
          <Route path="/analytics" element={<div className="text-white"><h2 className="text-2xl font-bold">Analytics</h2></div>} />
          <Route path="/settings" element={<div className="text-white"><h2 className="text-2xl font-bold">Settings</h2></div>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
