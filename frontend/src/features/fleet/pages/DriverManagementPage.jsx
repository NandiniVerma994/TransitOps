import React, { useState } from 'react';
import useFleetStore from '../../../store/useFleetStore';
import { Plus, X } from 'lucide-react';

const DriverManagementPage = () => {
  const { drivers, trips, addDriver, updateDriverStatus } = useFleetStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', license: '', category: 'Heavy', expiry: '', phone: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    addDriver({ ...formData, safetyScore: 100 });
    setIsAddModalOpen(false);
    setFormData({ name: '', license: '', category: 'Heavy', expiry: '', phone: '' });
  };

  const handleStatusChange = (id, status) => {
    try {
      updateDriverStatus(id, status);
    } catch(err) {
      alert("Cannot update status: " + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'On Trip': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Off Duty': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'Suspended': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  // Helper to count completed trips
  const getCompletedTripsCount = (driverId) => {
    return trips.filter(t => t.driverId === driverId && t.status === 'Completed').length;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-end mb-6">
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={18} />
          <span>Add Driver</span>
        </button>
      </div>

      <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#222] text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-4 font-semibold tracking-wider">Driver Name</th>
                <th className="px-5 py-4 font-semibold tracking-wider">License No</th>
                <th className="px-5 py-4 font-semibold tracking-wider">Category</th>
                <th className="px-5 py-4 font-semibold tracking-wider">Expiry</th>
                <th className="px-5 py-4 font-semibold tracking-wider">Contact</th>
                <th className="px-5 py-4 font-semibold tracking-wider text-center">Trips Compl.</th>
                <th className="px-5 py-4 font-semibold tracking-wider text-center">Safety</th>
                <th className="px-5 py-4 font-semibold tracking-wider text-center">Status</th>
                <th className="px-5 py-4 font-semibold tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {drivers.map(d => (
                <tr key={d.id} className="hover:bg-[#2a2a2a] transition-colors">
                  <td className="px-5 py-4 text-gray-300 font-medium">{d.name}</td>
                  <td className="px-5 py-4 text-gray-400 font-mono">{d.license}</td>
                  <td className="px-5 py-4 text-gray-400">{d.category}</td>
                  <td className="px-5 py-4 text-gray-400 font-mono">{d.expiry}</td>
                  <td className="px-5 py-4 text-gray-400 font-mono">{d.phone}</td>
                  <td className="px-5 py-4 text-gray-400 text-center font-mono">{getCompletedTripsCount(d.id)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`font-mono font-bold ${d.safetyScore >= 90 ? 'text-green-500' : d.safetyScore >= 80 ? 'text-yellow-500' : 'text-orange-500'}`}>{d.safetyScore}%</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`px-3 py-1.5 rounded border text-[11px] font-bold uppercase tracking-widest inline-block w-24 text-center ${getStatusBadge(d.status)}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    {d.status !== 'On Trip' && d.status !== 'Suspended' && (
                      <button onClick={() => handleStatusChange(d.id, d.status === 'Available' ? 'Off Duty' : 'Available')} className="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors">
                        {d.status === 'Available' ? 'Rest' : 'Active'}
                      </button>
                    )}
                    {d.status !== 'On Trip' && d.status !== 'Suspended' && (
                       <button onClick={() => handleStatusChange(d.id, 'Suspended')} className="text-orange-500 hover:text-orange-400 text-xs font-bold uppercase tracking-wider ml-3 transition-colors">Suspend</button>
                    )}
                    {d.status === 'Suspended' && (
                       <button onClick={() => handleStatusChange(d.id, 'Available')} className="text-green-500 hover:text-green-400 text-xs font-bold uppercase tracking-wider ml-3 transition-colors">Reactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-[#222] text-xs text-orange-500/80 font-medium tracking-wide">
          Rule: Suspended or Expired licenses block from trip assignments • Cannot suspend drivers currently On Trip
        </div>
      </div>

      {/* Add Driver Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white tracking-tight">Onboard New Driver</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" placeholder="e.g. Alex Morgan" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">License No.</label>
                  <input required value={formData.license} onChange={e => setFormData({...formData, license: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" placeholder="e.g. DL-1002" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors">
                    <option>Heavy</option>
                    <option>Light</option>
                    <option>Special</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Expiry Date</label>
                  <input required type="date" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact No.</label>
                  <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" placeholder="+1 555-0000" />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(234,88,12,0.2)] hover:shadow-[0_0_20px_rgba(234,88,12,0.4)]">Onboard Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverManagementPage;
