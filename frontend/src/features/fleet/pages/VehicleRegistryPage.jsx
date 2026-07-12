import React, { useState } from 'react';
import useFleetStore from '../../../store/useFleetStore';
import { Plus, X } from 'lucide-react';

const VehicleRegistryPage = () => {
  const { vehicles, addVehicle, retireVehicle } = useFleetStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ regNumber: '', name: '', type: 'Van', maxCapacity: '', odometer: '', cost: '', region: 'North' });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      addVehicle({
        ...formData,
        maxCapacity: Number(formData.maxCapacity),
        odometer: Number(formData.odometer),
        cost: Number(formData.cost)
      });
      setIsAddModalOpen(false);
      setFormData({ regNumber: '', name: '', type: 'Van', maxCapacity: '', odometer: '', cost: '', region: 'North' });
      setError('');
    } catch (err) {
      setError(err.message === "DUPLICATE_REGISTRATION_NUMBER" ? "Registration Number must be unique." : err.message);
    }
  };

  const handleRetire = (id) => {
    try {
      retireVehicle(id);
    } catch(err) {
      alert("Cannot retire vehicle: " + err.message);
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'On Trip': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'In Shop': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Retired': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
          <select className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500">
            <option>Type: All</option>
          </select>
          <select className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500">
            <option>Status: All</option>
          </select>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={18} />
          <span>Add Vehicle</span>
        </button>
      </div>

      <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#222] text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-4 font-semibold tracking-wider">Reg. No. (Unique)</th>
                <th className="px-5 py-4 font-semibold tracking-wider">Name/Model</th>
                <th className="px-5 py-4 font-semibold tracking-wider">Type</th>
                <th className="px-5 py-4 font-semibold tracking-wider">Capacity</th>
                <th className="px-5 py-4 font-semibold tracking-wider">Odometer</th>
                <th className="px-5 py-4 font-semibold tracking-wider">Acq. Cost</th>
                <th className="px-5 py-4 font-semibold tracking-wider text-center">Status</th>
                <th className="px-5 py-4 font-semibold tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {vehicles.map(v => (
                <tr key={v.id} className="hover:bg-[#2a2a2a] transition-colors">
                  <td className="px-5 py-4 text-gray-300 font-medium">{v.regNumber}</td>
                  <td className="px-5 py-4 text-gray-400">{v.name}</td>
                  <td className="px-5 py-4 text-gray-400">{v.type}</td>
                  <td className="px-5 py-4 text-gray-400">{v.maxCapacity} kg</td>
                  <td className="px-5 py-4 text-gray-400 font-mono">{v.odometer.toLocaleString()} km</td>
                  <td className="px-5 py-4 text-gray-400 font-mono">${v.cost.toLocaleString()}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`px-3 py-1.5 rounded border text-[11px] font-bold uppercase tracking-widest inline-block w-24 text-center ${getStatusBadge(v.status)}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {v.status !== 'Retired' && v.status !== 'On Trip' && v.status !== 'In Shop' && (
                      <button onClick={() => handleRetire(v.id)} className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider transition-colors">Retire</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-[#222] text-xs text-orange-500/80 font-medium tracking-wide">
          Rule: Registration No. must be unique • Retired & In Shop vehicles are hidden from Trip Dispatcher
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white tracking-tight">Onboard New Vehicle</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg flex items-center"><span className="font-bold mr-2">Error:</span> {error}</div>}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Registration Number</label>
                <input required value={formData.regNumber} onChange={e => setFormData({...formData, regNumber: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" placeholder="e.g. VAN-99" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Model Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" placeholder="e.g. Ford Transit" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Type</label>
                  <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors">
                    <option>Van</option>
                    <option>Heavy Truck</option>
                    <option>Mini</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Max Capacity (kg)</label>
                  <input required type="number" value={formData.maxCapacity} onChange={e => setFormData({...formData, maxCapacity: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Acquisition Cost</label>
                  <input required type="number" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current Odometer (km)</label>
                <input required type="number" value={formData.odometer} onChange={e => setFormData({...formData, odometer: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(234,88,12,0.2)] hover:shadow-[0_0_20px_rgba(234,88,12,0.4)]">Complete Onboarding</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleRegistryPage;
