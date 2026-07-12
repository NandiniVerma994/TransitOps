import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useFleetStore from '../../store/useFleetStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Truck, LogOut, CheckCircle, Settings, Loader, ShieldAlert } from 'lucide-react';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { trips, vehicles, currentDriver, driverTrips, fetchCurrentDriver, fetchTrips, fetchDriverTrips, fetchVehicles, completeTrip, isLoading } = useFleetStore();
  const { user, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [finalOdometer, setFinalOdometer] = useState('');
  const [actualDistance, setActualDistance] = useState('');
  const [error, setError] = useState('');

  // Fetch current driver on mount
  useEffect(() => {
    fetchCurrentDriver();
    fetchVehicles();
  }, [fetchCurrentDriver, fetchVehicles]);

  // Fetch driver's trips once currentDriver is loaded
  useEffect(() => {
    if (currentDriver) {
      fetchTrips({ driverId: currentDriver.id, status: 'Dispatched' });
      fetchDriverTrips();
    }
  }, [currentDriver, fetchTrips, fetchDriverTrips]);

  // Find the driver's active trip from loaded trips
  const activeTrip = currentDriver ? trips.find(t => t.driverId === currentDriver.id && t.status === 'Dispatched') : null;
  const vehicle = activeTrip ? vehicles.find(v => v.id === activeTrip.vehicleId) : null;

  // Pre-fill odometer when a trip is detected
  useEffect(() => {
    if (vehicle) {
      setFinalOdometer(vehicle.odometer);
    }
  }, [vehicle]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!activeTrip) return;
    try {
      await completeTrip(activeTrip.id, Number(finalOdometer), Number(actualDistance));
      setFinalOdometer('');
      setActualDistance('');
      setError('');
      // Refetch history
      await fetchDriverTrips();
    } catch (err) {
      setError(err.message === "end odometer cannot be less than current odometer" ? "Final odometer cannot be less than current odometer." : err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 font-sans flex flex-col items-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="flex justify-between items-center py-6 mb-4 border-b border-[#222]">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Driver Portal
              {isLoading && <Loader className="animate-spin text-orange-500" size={16} />}
            </h1>
            <p className="text-sm text-gray-500">Welcome, {currentDriver?.name || user?.email}</p>
            {currentDriver && (
              <div className="flex space-x-2 text-[9px] uppercase font-bold tracking-wider mt-2">
                <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2.5 py-1 rounded">
                  Safety: {currentDriver.safetyScore}%
                </span>
                <span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2.5 py-1 rounded">
                  Class: {currentDriver.category}
                </span>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <button onClick={() => navigate('/settings')} className="p-3 bg-[#1a1a1a] rounded-full border border-[#222] text-gray-400 hover:text-white hover:bg-orange-500/10 hover:border-orange-500/20 hover:text-orange-500 transition-all active:scale-95">
              <Settings size={18} />
            </button>
            <button onClick={handleLogout} className="p-3 bg-[#1a1a1a] rounded-full border border-[#222] text-gray-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 transition-all active:scale-95">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Tab Selection */}
        <div className="flex border-b border-[#222] mb-6">
          <button 
            onClick={() => setActiveTab('active')} 
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'active' ? 'text-orange-500 border-orange-500' : 'text-gray-500 border-transparent hover:text-white'}`}
          >
            Active Assignment
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'history' ? 'text-orange-500 border-orange-500' : 'text-gray-500 border-transparent hover:text-white'}`}
          >
            Trip History
          </button>
        </div>

        {/* Content */}
        {activeTab === 'history' ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            {driverTrips.length === 0 ? (
              <div className="text-center text-gray-500 py-12 bg-[#1a1a1a] border border-[#222] rounded-2xl">
                No past assignments found.
              </div>
            ) : (
              [...driverTrips].reverse().map(trip => {
                const tripVehicle = vehicles.find(v => v.id === trip.vehicleId);
                const isCompleted = trip.status === 'Completed';
                const isCancelled = trip.status === 'Cancelled';
                return (
                  <div key={trip.id} className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-gray-500">TRIP-{trip.id.substring(trip.id.length - 4)}</span>
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        isCompleted ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        isCancelled ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        {trip.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white flex items-center">
                      {trip.source} <span className="mx-2 text-gray-600">➔</span> {trip.destination}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-[#222]/50 text-gray-400">
                      <div>
                        <span className="text-gray-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Vehicle</span>
                        {tripVehicle?.regNumber || 'Unknown'}
                      </div>
                      <div>
                        <span className="text-gray-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Distance</span>
                        {trip.actualDistance ? `${trip.actualDistance} km` : `${trip.plannedDistance} km (Est.)`}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Active Assignment Tab */
          !activeTrip ? (
            <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-8 text-center mt-10 shadow-lg animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-[#222] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#333]">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2 tracking-tight">You're all caught up!</h2>
              <p className="text-gray-400 text-sm leading-relaxed">You have no active assignments right now. Please wait for the Fleet Manager to dispatch your next trip.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              {/* Trip Info Card */}
              <div className="bg-[#1a1a1a] border border-[#222] rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-400"></div>
                
                <div className="flex justify-between items-center mb-8 mt-2">
                  <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(59,130,246,0.15)]">Active Trip</span>
                  <span className="text-[11px] font-mono text-gray-500 tracking-widest">TRIP-{activeTrip.id.substring(activeTrip.id.length - 4)}</span>
                </div>

                <div className="relative pl-7 border-l-2 border-[#333] space-y-8 mb-8 ml-2">
                  <div className="relative">
                    <div className="absolute -left-[35px] top-1 w-4 h-4 bg-[#0a0a0a] border-[3px] border-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.3)]"></div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1.5">Pickup Location</p>
                    <p className="text-white font-medium text-base">{activeTrip.source}</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[35px] top-1 w-4 h-4 bg-[#0a0a0a] border-[3px] border-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)]"></div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1.5">Dropoff Location</p>
                    <p className="text-white font-medium text-base">{activeTrip.destination}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-[#121212] rounded-2xl border border-[#222]">
                  <div className="bg-[#222] p-2.5 rounded-xl mr-4">
                    <Truck className="text-gray-400" size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Assigned Vehicle</p>
                    <p className="text-white text-sm font-bold tracking-wide">{vehicle?.name} <span className="text-gray-500 font-mono text-xs ml-1 font-normal">({vehicle?.regNumber})</span></p>
                  </div>
                </div>
              </div>

              {/* Completion Form */}
              <div className="bg-[#1a1a1a] border border-[#222] rounded-3xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6">Complete Delivery</h3>
                <form onSubmit={handleComplete} className="space-y-5">
                  {error && <div className="bg-red-500/10 text-red-500 text-xs p-3 rounded-xl border border-red-500/20 font-medium">{error}</div>}
                  
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Final Odometer (km)</label>
                    <input required type="number" value={finalOdometer} onChange={e => setFinalOdometer(e.target.value)} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors" />
                    <p className="text-[10px] text-gray-500 mt-2 font-mono">Current Odometer: {vehicle?.odometer} km</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Actual Distance Traveled (km)</label>
                    <input required type="number" value={actualDistance} onChange={e => setActualDistance(e.target.value)} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="e.g. 155" />
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl text-sm font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_25px_rgba(22,163,74,0.5)] hover:-translate-y-0.5 transition-all">
                      Confirm Delivery
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
