import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ShieldAlert } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0a] flex flex-col justify-center items-center font-sans">
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          {/* Outer glowing pulsing border */}
          <div className="absolute inset-0 rounded-xl border border-orange-500/30 animate-ping opacity-75"></div>
          {/* Inner animated spinning loader */}
          <div className="w-16 h-16 border-4 border-t-orange-500 border-r-transparent border-b-orange-500/20 border-l-transparent rounded-full animate-spin"></div>
          {/* Inner static logo shape */}
          <div className="absolute w-6 h-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-md"></div>
        </div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Initializing Session</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.some(role => role.toLowerCase() === user.role.toLowerCase())) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0a] flex flex-col justify-center items-center p-6 text-center font-sans">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mb-6 animate-bounce">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Access Denied</h1>
        <p className="text-gray-400 text-sm max-w-md leading-relaxed mb-6">
          Your account role (<span className="text-orange-500 font-semibold">{user.role}</span>) does not have permission to view this section.
        </p>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  return children;
};
