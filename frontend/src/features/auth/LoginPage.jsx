import React, { useState } from 'react';
import { Truck, Map, ShieldCheck, LineChart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const LoginPage = () => {
  const { login, error: authError, clearError, isLoading: authLoading } = useAuthStore();
  const [email, setEmail] = useState('fleet.manager@transitops.local');
  const [password, setPassword] = useState('FleetManager@123');
  const [role, setRole] = useState('Fleet Manager');
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    clearError();
    setLocalError('');
    if (selectedRole === 'Fleet Manager') {
      setEmail('fleet.manager@transitops.local');
      setPassword('FleetManager@123');
    } else if (selectedRole === 'Safety Officer') {
      setEmail('safety.officer@transitops.local');
      setPassword('SafetyOfficer@123');
    } else if (selectedRole === 'Financial Analyst') {
      setEmail('finance.analyst@transitops.local');
      setPassword('FinanceAnalyst@123');
    } else if (selectedRole === 'Driver') {
      setEmail('driver.alex@transitops.local');
      setPassword('DriverAlex@123');
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (role === 'Driver') {
      navigate('/driver-dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const roles = [
    { name: 'Fleet Manager', desc: 'Oversee fleet assets & maintenance', icon: Truck, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { name: 'Driver', desc: 'Manage trips, assignments & routes', icon: Map, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Safety Officer', desc: 'Ensure driver compliance & safety', icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-500/10' },
    { name: 'Financial Analyst', desc: 'Track expenses, fuel & ROI', icon: LineChart, color: 'text-purple-500', bg: 'bg-purple-500/10' }
  ];

  return (
    <div className="flex min-h-screen w-full font-sans bg-[#0a0a0a]">
      {/* Left Panel - Branding & Info */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-slate-200 to-slate-300 relative flex-col justify-between p-16 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-orange-400/30 to-transparent rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-orange-400/20 to-transparent rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="relative z-10">
          {/* Logo Icon with subtle animation */}
          <div className="w-14 h-14 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 grid grid-cols-3 gap-1.5 p-2.5 mb-8 transform transition-transform hover:scale-105 duration-300">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[2px] shadow-sm"></div>
            ))}
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight mb-4 text-slate-800 drop-shadow-sm">TransitOps</h1>
          <p className="text-slate-600 text-lg mb-12 tracking-wide font-medium">Smart Transport Operations Platform</p>
          
          {/* 2x2 Icon Grid for Roles */}
          <div className="grid grid-cols-2 gap-4">
            {roles.map((role, idx) => (
              <div 
                key={idx} 
                className="group relative bg-white/40 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-default"
              >
                {/* Subtle gradient hover effect inside the card */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${role.bg} ${role.color} transform group-hover:scale-110 transition-transform duration-300`}>
                  <role.icon size={24} strokeWidth={2} />
                </div>
                
                <h3 className="text-sm font-bold text-slate-800 mb-1 relative z-10">{role.name}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed relative z-10">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="relative z-10 text-xs text-slate-500 font-bold tracking-[0.2em] uppercase">
          TransitOps © 2026
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-7/12 bg-[#121212] flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 relative overflow-hidden">
        {/* Subtle dark glowing orbs */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile Logo (visible only on small screens) */}
          <div className="lg:hidden flex items-center space-x-3 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg grid grid-cols-3 gap-1 p-1.5 shadow-lg shadow-orange-500/20">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="bg-white/90 rounded-[1px]"></div>
              ))}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">TransitOps</h1>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">Welcome back</h2>
            <p className="text-gray-400 text-sm">Sign in to your account to continue</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Email</label>
              <div className="relative group">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all hover:border-[#444]"
                  required
                />
              </div>
            </div>
            
            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Password</label>
                <a href="#" className="text-xs text-orange-500 hover:text-orange-400 font-medium transition-colors">Forgot password?</a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all hover:border-[#444] tracking-widest"
                required
              />
            </div>
            
            {/* Role Dropdown */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Sign in as</label>
              <div className="relative group">
                <select 
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all appearance-none cursor-pointer hover:border-[#444]"
                >
                  <option value="Fleet Manager">Fleet Manager</option>
                  <option value="Driver">Driver</option>
                  <option value="Safety Officer">Safety Officer</option>
                  <option value="Financial Analyst">Financial Analyst</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-400 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                </div>
              </div>
            </div>
            
            {/* Remember me */}
            <div className="pt-1 pb-4">
              <label className="flex items-center space-x-3 cursor-pointer group w-max">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" defaultChecked className="peer appearance-none w-5 h-5 border-2 border-[#444] rounded bg-transparent checked:bg-orange-600 checked:border-orange-600 transition-all cursor-pointer" />
                  <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transform scale-50 peer-checked:scale-100 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">Remember me for 30 days</span>
              </label>
            </div>

            {(localError || authError) && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-3 rounded-xl mb-4 flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                <span>{localError || authError}</span>
              </div>
            )}
            
            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full relative group overflow-hidden bg-orange-600 text-white font-semibold text-sm py-4 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center justify-center">
                {authLoading ? 'Signing In...' : 'Sign In to Platform'}
                {!authLoading && <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>}
              </span>
              <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
