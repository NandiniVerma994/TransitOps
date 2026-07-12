import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import FinancialLayout from './financial-analyst/components/FinancialLayout';
import FuelExpensePage from './financial-analyst/pages/FuelExpensePage';
import AnalyticsPage from './financial-analyst/pages/AnalyticsPage';

// Placeholder for other role dashboards until those modules are built
const DashboardPlaceholder = () => (
  <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
    <h1 className="text-4xl font-bold text-orange-500">Dashboard Coming Soon</h1>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPlaceholder />} />

        {/* Financial Analyst module */}
        <Route path="/financial-analyst" element={<FinancialLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AnalyticsPage />} />
          <Route path="fuel-expenses" element={<FuelExpensePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
