import React, { useState, useEffect } from 'react';
import useFleetStore from '../../store/useFleetStore';
import { Mail, CheckCircle, Edit2, X, Loader } from 'lucide-react';

const ComplianceDirectoryPage = () => {
  const { drivers, fetchDrivers, isLoading, updateDriverStatus, triggerEmailReminder, updateDriverScore } = useFleetStore();
  const [toast, setToast] = useState('');
  const [editScoreModal, setEditScoreModal] = useState({ isOpen: false, driverId: null, currentScore: 100 });
  const [newScore, setNewScore] = useState('');

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const getDaysToExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const handleStatusChange = (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Suspended' ? 'Available' : 'Suspended';
      updateDriverStatus(id, newStatus);
    } catch (err) {
      alert("Cannot change status: " + err.message);
    }
  };

  const handleSendReminder = (driverId) => {
    const msg = triggerEmailReminder(driverId);
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleOpenEditModal = (driver) => {
    setNewScore(driver.safetyScore);
    setEditScoreModal({ isOpen: true, driverId: driver.id, driverName: driver.name });
  };

  const handleSaveScore = async (e) => {
    e.preventDefault();
    try {
      await updateDriverScore(editScoreModal.driverId, newScore);
      setEditScoreModal({ isOpen: false, driverId: null });
      setToast('Safety score updated successfully.');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      alert("Failed to update safety score: " + err.message);
    }
  };

  const getExpiryHighlight = (days) => {
    if (days < 0) return 'text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded';
    if (days <= 30) return 'text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded';
    return 'text-gray-400';
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

  if (isLoading && drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader className="animate-spin text-orange-500" size={32} />
        <span className="text-sm text-gray-400">Loading Drivers Directory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-0 right-0 z-50 bg-green-500/10 border border-green-500/30 text-green-500 px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle size={18} />
          <span className="font-medium text-sm">{toast}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Compliance Directory</h2>
          <p className="text-sm text-gray-500">Master list of drivers for auditing licenses and suspending non-compliant operators.</p>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#222] text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-4 font-semibold tracking-wider">Driver Name</th>
                <th className="px-5 py-4 font-semibold tracking-wider">License No</th>
                <th className="px-5 py-4 font-semibold tracking-wider">License Category</th>
                <th className="px-5 py-4 font-semibold tracking-wider">License Expiry Date</th>
                <th className="px-5 py-4 font-semibold tracking-wider text-center">Safety Score</th>
                <th className="px-5 py-4 font-semibold tracking-wider text-center">Status</th>
                <th className="px-5 py-4 font-semibold tracking-wider text-right">Compliance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {drivers.map(d => {
                const daysToExpiry = getDaysToExpiry(d.expiry);
                return (
                  <tr key={d.id} className="hover:bg-[#2a2a2a] transition-colors">
                    <td className="px-5 py-4 text-white font-medium">{d.name}</td>
                    <td className="px-5 py-4 text-gray-400 font-mono">{d.license}</td>
                    <td className="px-5 py-4 text-gray-400">{d.category}</td>
                    <td className="px-5 py-4 text-gray-400 font-mono">
                      <span className={getExpiryHighlight(daysToExpiry)}>{d.expiry}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`font-mono font-bold text-lg ${d.safetyScore >= 90 ? 'text-green-500' : d.safetyScore >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>{d.safetyScore}%</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-3 py-1.5 rounded border text-[11px] font-bold uppercase tracking-widest inline-block w-24 text-center ${getStatusBadge(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-3">
                      {daysToExpiry <= 30 && (
                        <button 
                          onClick={() => handleSendReminder(d.id)}
                          className="text-blue-500 hover:text-blue-400 text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center"
                          title="Send Expiry Reminder"
                        >
                          <Mail size={14} className="mr-1" /> Reminder
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleOpenEditModal(d)}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Edit Safety Score"
                      >
                        <Edit2 size={16} />
                      </button>
                      
                      {d.status !== 'On Trip' && (
                        <button 
                          onClick={() => handleStatusChange(d.id, d.status)}
                          className={`${d.status === 'Suspended' ? 'text-green-500 hover:text-green-400 bg-green-500/10 hover:bg-green-500/20' : 'text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20'} px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all`}
                        >
                          {d.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Score Modal */}
      {editScoreModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white tracking-tight">Edit Safety Score</h3>
              <button 
                onClick={() => setEditScoreModal({ isOpen: false })}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveScore} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Update score for {editScoreModal.driverName}
                </label>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-2">Enter a value between 0 and 100.</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#222]">
                <button 
                  type="button"
                  onClick={() => setEditScoreModal({ isOpen: false })}
                  className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-orange-500/20 transition-all"
                >
                  Save Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceDirectoryPage;
