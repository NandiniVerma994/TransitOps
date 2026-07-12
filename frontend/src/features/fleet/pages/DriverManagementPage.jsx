import React, { useState, useEffect } from 'react';
import useFleetStore from '../../../store/useFleetStore';
import { Plus, X, Search, Loader, Copy, Check } from 'lucide-react';

const DriverManagementPage = () => {
  const { drivers, trips, fetchDrivers, addDriver, updateDriverStatus, isLoading } = useFleetStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({ email: '', name: '', license: '', category: 'Heavy', expiry: '', phone: '' });
  const [error, setError] = useState('');

  // Credentials Modal State
  const [tempPassword, setTempPassword] = useState('');
  const [onboardedEmail, setOnboardedEmail] = useState('');
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDrivers({
      status: statusFilter,
      search: searchQuery
    });
  }, [statusFilter, searchQuery, fetchDrivers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tempPwd = await addDriver(formData);
      setOnboardedEmail(formData.email);
      setTempPassword(tempPwd);
      setShowCredsModal(true);
      setIsAddModalOpen(false);
      setFormData({ email: '', name: '', license: '', category: 'Heavy', expiry: '', phone: '' });
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateDriverStatus(id, status);
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
    return trips ? trips.filter(t => t.driverId === driverId && t.status === 'Completed').length : 0;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Email: ${onboardedEmail}\nPassword: ${tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 items-stretch sm:items-center">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search driver name or license..."
              className="bg-[#1a1a1a] border border-[#333] rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500 w-full sm:w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500"
          >
            <option value="">Status: All</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
          {isLoading && <Loader className="animate-spin text-orange-500 ml-2" size={18} />}
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0"
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
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-5 py-8 text-center text-gray-500">No drivers onboarded yet.</td>
                </tr>
              ) : (
                drivers.map(d => (
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
                ))
              )}
            </tbody>
          </table>
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
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg flex items-center"><span className="font-bold mr-2">Error:</span> {error}</div>}
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Driver Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" placeholder="e.g. Alex Morgan" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Login Email Address</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" placeholder="e.g. alex.morgan@transitops.local" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">License No.</label>
                  <input required value={formData.license} onChange={e => setFormData({...formData, license: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" placeholder="e.g. DL-1002" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors">
                    <option value="Heavy">Heavy</option>
                    <option value="Light">Light</option>
                    <option value="Special">Special</option>
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

      {/* Generated Credentials Modal */}
      {showCredsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-8 relative">
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight text-center">Driver Login Generated</h3>
            <p className="text-xs text-gray-400 text-center mb-6 leading-relaxed">Copy these temporary credentials now. For safety, the password will not be shown again.</p>
            
            <div className="bg-[#121212] border border-[#222] rounded-2xl p-5 space-y-4 mb-6 font-mono text-sm">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold font-sans mb-1">Username / Email</p>
                <p className="text-white break-all">{onboardedEmail}</p>
              </div>
              <div className="pt-3 border-t border-[#222]">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold font-sans mb-1">Temporary Password</p>
                <p className="text-orange-500 font-bold select-all tracking-wider text-base">{tempPassword}</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={handleCopy} 
                className="flex-1 bg-[#222] hover:bg-[#333] border border-[#333] hover:border-[#444] text-white py-3.5 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all active:scale-95"
              >
                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
              </button>
              <button 
                onClick={() => setShowCredsModal(false)} 
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-3.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(234,88,12,0.2)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverManagementPage;
