import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';

// Placeholder for Dashboard until we build it
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
