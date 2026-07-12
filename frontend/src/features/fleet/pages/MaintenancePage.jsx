import React, { useState } from 'react';
import useFleetStore from '../../../store/useFleetStore';

const MaintenancePage = () => {
  const { vehicles, maintenanceLogs, startMaintenance, closeMaintenance } = useFleetStore();
  
  const availableVehicles = vehicles.filter(v => v.status === 'Available');

  const [formData, setFormData] = useState({
    vehicleId: '',
    title: '',
    estimatedCost: '',
    scheduledDate: new Date().toISOString().split('T')[0]
  });

  const [closingLogId, setClosingLogId] = useState(null);
  const [actualCost, setActualCost] = useState('');

  const handleStartMaintenance = (e) => {
    e.preventDefault();
    startMaintenance(formData.vehicleId, {
      title: formData.title,
      estimatedCost: Number(formData.estimatedCost),
      scheduledDate: formData.scheduledDate
    });
    setFormData({ vehicleId: '', title: '', estimatedCost: '', scheduledDate: new Date().toISOString().split('T')[0] });
  };

  const handleCloseLog = (e) => {
    e.preventDefault();
    if (closingLogId && actualCost) {
      closeMaintenance(closingLogId, Number(actualCost), "Completed standard service.");
      setClosingLogId(null);
      setActualCost('');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-300">
      
      {/* Left Column: Log Service Form */}
      <div className="w-full lg:w-1/3">
        <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-6 shadow-sm sticky top-6">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6 border-b border-[#333] pb-4">Log Service Record</h3>
          
          <form onSubmit={handleStartMaintenance} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vehicle (Available Only)</label>
              <select required value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors">
                <option value="">Select a Vehicle</option>
                {availableVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.regNumber} ({v.type})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Service Type</label>
              <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" placeholder="e.g. Oil Change, Tire Replacement" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Estimated Cost ($)</label>
              <input required type="number" value={formData.estimatedCost} onChange={e => setFormData({...formData, estimatedCost: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Date</label>
              <input required type="date" value={formData.scheduledDate} onChange={e => setFormData({...formData, scheduledDate: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
            </div>

            <div className="pt-6 border-t border-[#333]">
              <button type="submit" disabled={!formData.vehicleId} className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(234,88,12,0.2)] hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] disabled:opacity-50 disabled:cursor-not-allowed">
                Send to Shop
              </button>
            </div>
            
            <div className="text-[11px] text-gray-400 leading-relaxed font-medium bg-[#222] p-4 rounded-lg flex items-start">
              <span className="text-orange-500 font-bold mr-2 uppercase tracking-widest text-[10px] mt-0.5">Rule:</span> 
              <span>Sending a vehicle to the shop automatically changes its status to <span className="font-bold text-gray-300">In Shop</span> and removes it from the dispatch pool.</span>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Service Log Table */}
      <div className="w-full lg:w-2/3">
        <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden shadow-sm h-full">
          <div className="p-6 border-b border-[#222]">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Service Log</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#222] text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Vehicle</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Service</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Cost</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {maintenanceLogs.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">No maintenance records found.</td></tr>
                ) : (
                  [...maintenanceLogs].reverse().map(log => {
                    const vehicle = vehicles.find(v => v.id === log.vehicleId);
                    const isActive = log.status === 'Active';
                    
                    return (
                      <tr key={log.id} className="hover:bg-[#2a2a2a] transition-colors">
                        <td className="px-6 py-5 text-gray-300 font-mono font-medium">{vehicle?.regNumber || 'Unknown'}</td>
                        <td className="px-6 py-5">
                          <div className="text-gray-300 font-medium mb-1.5">{log.title}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{log.scheduledDate}</div>
                        </td>
                        <td className="px-6 py-5 text-gray-400 text-right font-mono">
                          ${isActive ? log.estimatedCost.toLocaleString() : log.actualCost.toLocaleString()}
                          {isActive && <div className="text-[9px] text-gray-500 uppercase mt-1">(Est.)</div>}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-3 py-1.5 rounded border text-[10px] font-bold uppercase tracking-widest inline-block w-24 text-center ${
                            isActive ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}>
                            {isActive ? 'In Shop' : 'Completed'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          {isActive ? (
                            <button 
                              onClick={() => setClosingLogId(log.id)} 
                              className="text-green-500 hover:text-green-400 text-xs font-bold uppercase tracking-wider transition-colors bg-green-500/10 hover:bg-green-500/20 px-4 py-2 rounded-lg border border-green-500/20"
                            >
                              Resolve
                            </button>
                          ) : (
                            <span className="text-gray-600 text-xs font-bold uppercase">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      {closingLogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-white tracking-tight mb-2">Finalize Service</h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">Enter the final actual cost of the repair. The vehicle will be returned to the Dispatch pool automatically.</p>
              
              <form onSubmit={handleCloseLog} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Actual Cost ($)</label>
                  <input required autoFocus type="number" value={actualCost} onChange={e => setActualCost(e.target.value)} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="e.g. 1500" />
                </div>
                <div className="flex space-x-3 pt-4 border-t border-[#222]">
                  <button type="button" onClick={() => setClosingLogId(null)} className="flex-1 bg-[#222] hover:bg-[#333] text-white py-3 rounded-xl text-sm font-bold transition-colors">Cancel</button>
                  <button type="submit" disabled={!actualCost} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(22,163,74,0.3)] transition-all disabled:opacity-50">Complete</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default MaintenancePage;
