import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useFleetStore from '../../store/useFleetStore';
import { Truck, LogOut, CheckCircle } from 'lucide-react';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { trips, vehicles, drivers, completeTrip } = useFleetStore();
  
  // For simulation, we assume driver 'd2' (Sam Rivera) is logged in.
  // In a real app, this comes from an Auth Context.
  const loggedInDriverId = 'd2'; 
  const driverProfile = drivers.find(d => d.id === loggedInDriverId);
  
  // Find the driver's active trip
  const activeTrip = trips.find(t => t.driverId === loggedInDriverId && t.status === 'Dispatched');
  const vehicle = activeTrip ? vehicles.find(v => v.id === activeTrip.vehicleId) : null;

  const [finalOdometer, setFinalOdometer] = useState('');
  const [fuelUsed, setFuelUsed] = useState('');
  const [error, setError] = useState('');

  // Pre-fill odometer when a trip is detected
  useEffect(() => {
    if (vehicle) setFinalOdometer(vehicle.odometer);
  }, [vehicle]);

  const handleComplete = (e) => {
    e.preventDefault();
    try {
      completeTrip(activeTrip.id, Number(finalOdometer), Number(fuelUsed));
      setFinalOdometer('');
      setFuelUsed('');
      setError('');
    } catch (err) {
      setError(err.message === "INVALID_ODOMETER_VALUE" ? "Final odometer cannot be less than current odometer." : err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 font-sans flex flex-col items-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="flex justify-between items-center py-6 mb-4 border-b border-[#222]">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Driver Portal</h1>
            <p className="text-sm text-gray-500">Welcome, {driverProfile?.name}</p>
          </div>
          <button onClick={() => navigate('/')} className="p-3 bg-[#1a1a1a] rounded-full border border-[#222] text-gray-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 transition-colors">
            <LogOut size={18} />
          </button>
        </header>

        {/* Content */}
        {!activeTrip ? (
          <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-8 text-center mt-10 shadow-lg">
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
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Fuel Consumed (Liters)</label>
                  <input required type="number" value={fuelUsed} onChange={e => setFuelUsed(e.target.value)} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="e.g. 45" />
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl text-sm font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_25px_rgba(22,163,74,0.5)] hover:-translate-y-0.5 transition-all">
                    Confirm Delivery
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
