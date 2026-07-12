import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import useFleetStore from '../../store/useFleetStore';
import { LockKeyhole, KeyRound, ShieldAlert, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const { changePassword, error: authError, clearError, isLoading } = useAuthStore();
  const { currentDriver, fetchCurrentDriver } = useFleetStore();
  const { user } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role?.toLowerCase() === 'driver' && !currentDriver) {
      fetchCurrentDriver();
    }
  }, [user, currentDriver, fetchCurrentDriver]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMessage('');
    clearError();

    if (newPassword.length < 8) {
      setValidationError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('New passwords do not match.');
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setSuccessMessage('Password changed successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      // Error handled by store
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 font-sans">
      <div>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-wider mb-4"
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </button>
        <h2 className="text-2xl font-bold mb-1 tracking-tight text-white">Settings</h2>
        <p className="text-gray-400 text-sm">Manage your profile, credentials, and platform configurations.</p>
      </div>

      {user?.role?.toLowerCase() === 'driver' && currentDriver && (
        <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider border-b border-[#222] pb-3">Driver Profile Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-500 font-bold block uppercase tracking-wider mb-1">Full Name</span>
              <span className="text-white font-medium">{currentDriver.name}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-bold block uppercase tracking-wider mb-1">License Category</span>
              <span className="text-white font-medium">{currentDriver.category}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-bold block uppercase tracking-wider mb-1">License Expiry</span>
              <span className="text-white font-medium font-mono">{currentDriver.expiry}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-bold block uppercase tracking-wider mb-1">Safety Score</span>
              <span className="text-orange-500 font-bold font-mono">{currentDriver.safetyScore}%</span>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-gray-500 font-bold block uppercase tracking-wider mb-1">Contact Number</span>
              <span className="text-white font-medium">{currentDriver.phone}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
        <div className="p-6 border-b border-[#222] flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-xl flex items-center justify-center">
            <LockKeyhole size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Change Password</h3>
            <p className="text-xs text-gray-500">Ensure your account is using a secure, random password.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {validationError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-3 rounded-xl flex items-center space-x-2 animate-shake">
              <ShieldAlert size={16} />
              <span>{validationError}</span>
            </div>
          )}

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-3 rounded-xl flex items-center space-x-2">
              <ShieldAlert size={16} />
              <span>{authError}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-xs px-4 py-3 rounded-xl flex items-center space-x-2">
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Current Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder-gray-600"
              />
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">New Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder-gray-600"
              />
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Confirm New Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder-gray-600"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold text-sm py-3.5 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed"
            >
              <KeyRound size={16} />
              <span>{isLoading ? 'Updating Password...' : 'Update Password & Re-authenticate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
