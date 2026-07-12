import React, { useState } from 'react';
import useFleetStore from '../../../store/useFleetStore';

const TripDispatcherPage = () => {
  const { vehicles, drivers, trips, dispatchTrip } = useFleetStore();
  
  const availableVehicles = vehicles.filter(v => v.status === 'Available');
  const availableDrivers = drivers.filter(d => d.status === 'Available');

  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    vehicleId: '',
    driverId: '',
    cargoWeight: '',
    plannedDistance: ''
  });

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
  const weightExceeded = selectedVehicle && Number(formData.cargoWeight) > selectedVehicle.maxCapacity;

  const handleDispatch = (e) => {
    e.preventDefault();
    if (weightExceeded) return;
    
    dispatchTrip({
      ...formData,
      cargoWeight: Number(formData.cargoWeight),
      plannedDistance: Number(formData.plannedDistance)
    });
    
    // Reset form
    setFormData({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: '', plannedDistance: '' });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-300">
      
      {/* Left Column: Create Trip Form */}
      <div className="w-full lg:w-1/3">
        <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-6 shadow-sm sticky top-6">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6 border-b border-[#333] pb-4">Create Trip</h3>
          
          <form onSubmit={handleDispatch} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Source</label>
              <input required value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. Depot A" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Destination</label>
              <input required value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. Warehouse B" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vehicle (Available Only)</label>
              <select required value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors">
                <option value="">Select a Vehicle...</option>
                {availableVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.regNumber} - {v.maxCapacity}kg cap.</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Driver (Available Only)</label>
              <select required value={formData.driverId} onChange={e => setFormData({...formData, driverId: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors">
                <option value="">Select a Driver...</option>
                {availableDrivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} (Safety: {d.safetyScore}%)</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cargo Weight (kg)</label>
                <input required type="number" value={formData.cargoWeight} onChange={e => setFormData({...formData, cargoWeight: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Distance (km)</label>
                <input required type="number" value={formData.plannedDistance} onChange={e => setFormData({...formData, plannedDistance: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            </div>

            {weightExceeded && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg text-xs font-medium flex items-start animate-in fade-in zoom-in-95">
                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <span>Cargo weight ({formData.cargoWeight}kg) exceeds vehicle capacity ({selectedVehicle.maxCapacity}kg). Dispatch blocked.</span>
              </div>
            )}

            <div className="pt-6 border-t border-[#333]">
              <button 
                type="submit" 
                disabled={weightExceeded || !formData.vehicleId || !formData.driverId}
                className={`w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all ${
                  weightExceeded || !formData.vehicleId || !formData.driverId
                  ? 'bg-[#333] text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:-translate-y-0.5'
                }`}
              >
                Dispatch Trip
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Live Board */}
      <div className="w-full lg:w-2/3">
        <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
          <div className="p-6 border-b border-[#222] flex justify-between items-center bg-gradient-to-r from-[#1a1a1a] to-[#222]">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Live Dispatch Board</h3>
            <div className="flex space-x-2 text-[10px] font-bold uppercase tracking-widest">
              <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1.5 rounded-md">Dispatched</span>
              <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1.5 rounded-md">Completed</span>
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {trips.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">No trips dispatched yet.</div>
            ) : (
              [...trips].reverse().map(trip => {
                const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                const driver = drivers.find(d => d.id === trip.driverId);
                const isCompleted = trip.status === 'Completed';

                return (
                  <div key={trip.id} className={`p-6 rounded-2xl border transition-all ${isCompleted ? 'bg-[#121212]/50 border-[#222]' : 'bg-gradient-to-r from-[#1a1a1a] to-[#222] border-[#333] hover:border-[#444] shadow-md hover:-translate-y-0.5'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="text-xs font-mono text-gray-500 mb-1.5 tracking-wider">TRIP-{trip.id.substring(trip.id.length - 4)}</div>
                        <div className="text-lg font-bold text-white flex items-center">
                          {trip.source} 
                          <svg className="w-5 h-5 mx-3 text-blue-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg> 
                          {trip.destination}
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-lg border text-[11px] font-bold uppercase tracking-widest ${isCompleted ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]'}`}>
                        {trip.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-5 border-t border-[#222]">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Vehicle</div>
                        <div className="text-sm text-gray-300 font-mono mt-1 font-medium">{vehicle?.regNumber || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Driver</div>
                        <div className="text-sm text-gray-300 mt-1 font-medium">{driver?.name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Cargo</div>
                        <div className="text-sm text-gray-300 mt-1 font-medium">{trip.cargoWeight} kg</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Est. Dist</div>
                        <div className="text-sm text-gray-300 mt-1 font-medium">{trip.plannedDistance} km</div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default TripDispatcherPage;
