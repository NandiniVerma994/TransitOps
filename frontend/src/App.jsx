import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import FleetDashboardPage from './features/fleet/pages/FleetDashboardPage';
import VehicleRegistryPage from './features/fleet/pages/VehicleRegistryPage';
import DriverManagementPage from './features/fleet/pages/DriverManagementPage';
import TripDispatcherPage from './features/fleet/pages/TripDispatcherPage';
import MaintenancePage from './features/fleet/pages/MaintenancePage';
import DriverDashboard from './features/driver/DriverDashboard';
import SettingsPage from './features/auth/SettingsPage';
import FuelExpensePage from './financial-analyst/pages/FuelExpensePage';
import AnalyticsPage from './financial-analyst/pages/AnalyticsPage';


// Decision router to display either the driver portal or the fleet manager dashboard
const DashboardRouter = () => {
  const { user } = useAuthStore();

  if (user?.role?.toLowerCase() === 'driver') {
    return <DriverDashboard />;
  }

  return <FleetDashboardPage />;
};

// Layout decider: managers get the Sidebar layout; drivers get the full-screen view
const MainLayoutRouter = () => {
  const { user } = useAuthStore();

  if (user?.role?.toLowerCase() === 'driver') {
    return <Outlet />;
  }

  return <DashboardLayout />;
};

function App() {
  const { checkSession, isCheckingSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0a] flex flex-col justify-center items-center font-sans">
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-xl border border-orange-500/30 animate-ping opacity-75"></div>
          <div className="w-16 h-16 border-4 border-t-orange-500 border-r-transparent border-b-orange-500/20 border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute w-6 h-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-md"></div>
        </div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Initializing Session</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/" element={<LoginPage />} />

        {/* Protected Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayoutRouter />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardRouter />} />

          <Route path="/fleet" element={
            <ProtectedRoute allowedRoles={['Fleet Manager']}>
              <VehicleRegistryPage />
            </ProtectedRoute>
          } />

          <Route path="/drivers" element={
            <ProtectedRoute allowedRoles={['Fleet Manager']}>
              <DriverManagementPage />
            </ProtectedRoute>
          } />

          <Route path="/trips" element={
            <ProtectedRoute allowedRoles={['Fleet Manager', 'Driver']}>
              <TripDispatcherPage />
            </ProtectedRoute>
          } />

          <Route path="/maintenance" element={
            <ProtectedRoute allowedRoles={['Fleet Manager']}>
              <MaintenancePage />
            </ProtectedRoute>
          } />

          <Route path="/expenses" element={
            <ProtectedRoute allowedRoles={['Fleet Manager', 'Financial Analyst']}>
              <FuelExpensePage />
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute allowedRoles={['Fleet Manager', 'Financial Analyst', 'Safety Officer']}>
              <AnalyticsPage />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
