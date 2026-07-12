import React from 'react';
import useFleetStore from '../../store/useFleetStore';
import { ShieldAlert, Users, AlertTriangle, AlertOctagon, Mail } from 'lucide-react';

const SafetyDashboardPage = () => {
  const { drivers } = useFleetStore();

  const getDaysToExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const expiredDrivers = drivers.filter(d => getDaysToExpiry(d.expiry) < 0);
  const expiringSoonDrivers = drivers.filter(d => getDaysToExpiry(d.expiry) >= 0 && getDaysToExpiry(d.expiry) <= 30);
  const suspendedDrivers = drivers.filter(d => d.status === 'Suspended');
  
  const avgSafetyScore = drivers.length > 0 
    ? Math.round(drivers.reduce((acc, curr) => acc + curr.safetyScore, 0) / drivers.length)
    : 0;

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Compliance Overview</h2>
          <p className="text-sm text-gray-500">Monitor driver safety, license validity, and fleet risk metrics.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Users className="text-blue-500" size={24} />
            </div>
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Total Drivers</p>
            <h3 className="text-3xl font-bold text-white mt-1">{drivers.length}</h3>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <AlertOctagon className="text-red-500" size={24} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-red-400 text-sm font-medium">Expired Licenses</p>
            <h3 className="text-3xl font-bold text-white mt-1">{expiredDrivers.length}</h3>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-yellow-500/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-yellow-500/10 rounded-xl">
              <AlertTriangle className="text-yellow-500" size={24} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-yellow-400 text-sm font-medium">Expiring &lt; 30 Days</p>
            <h3 className="text-3xl font-bold text-white mt-1">{expiringSoonDrivers.length}</h3>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <ShieldAlert className="text-green-500" size={24} />
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${avgSafetyScore >= 90 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
              Avg
            </span>
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Fleet Safety Score</p>
            <h3 className={`text-3xl font-bold mt-1 ${getScoreColor(avgSafetyScore)}`}>{avgSafetyScore}%</h3>
          </div>
        </div>
      </div>

      {/* Alerts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4">Critical Alerts</h3>
          <div className="space-y-3">
            {expiredDrivers.length === 0 && expiringSoonDrivers.length === 0 && suspendedDrivers.length === 0 ? (
              <div className="text-center p-6 bg-[#121212] rounded-xl border border-[#222]">
                <ShieldAlert className="mx-auto text-green-500 mb-2" size={24} />
                <p className="text-gray-400 text-sm">All drivers are currently compliant.</p>
              </div>
            ) : null}

            {expiredDrivers.map(d => (
              <div key={d.id} className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <AlertOctagon className="text-red-500" size={16} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{d.name}'s License Expired</p>
                    <p className="text-red-400 text-xs mt-0.5">Expired on {d.expiry}</p>
                  </div>
                </div>
              </div>
            ))}

            {expiringSoonDrivers.map(d => (
              <div key={d.id} className="flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <AlertTriangle className="text-yellow-500" size={16} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{d.name}'s License Expiring Soon</p>
                    <p className="text-yellow-400 text-xs mt-0.5">Expires in {getDaysToExpiry(d.expiry)} days</p>
                  </div>
                </div>
              </div>
            ))}

            {suspendedDrivers.map(d => (
              <div key={d.id} className="flex items-center justify-between p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <ShieldAlert className="text-orange-500" size={16} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{d.name} is Suspended</p>
                    <p className="text-orange-400 text-xs mt-0.5">Safety score: {d.safetyScore}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center justify-center p-6 bg-[#121212] border border-[#333] hover:border-blue-500 hover:bg-blue-500/5 rounded-xl transition-all group">
              <Mail className="text-gray-400 group-hover:text-blue-500 mb-3" size={24} />
              <span className="text-sm font-medium text-gray-300 group-hover:text-white text-center">Email Expiry Reminders</span>
            </button>
            <button className="flex flex-col items-center justify-center p-6 bg-[#121212] border border-[#333] hover:border-orange-500 hover:bg-orange-500/5 rounded-xl transition-all group">
              <ShieldAlert className="text-gray-400 group-hover:text-orange-500 mb-3" size={24} />
              <span className="text-sm font-medium text-gray-300 group-hover:text-white text-center">Review Safety Incidents</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyDashboardPage;
