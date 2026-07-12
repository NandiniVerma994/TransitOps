import React, { useEffect } from 'react';
import useFleetStore from '../../../store/useFleetStore';
import { Loader } from 'lucide-react';

const FleetDashboardPage = () => {
  const { vehicles, drivers, kpis, fetchKPIs, fetchVehicles, fetchDrivers, isLoading } = useFleetStore();

  useEffect(() => {
    fetchKPIs();
    fetchVehicles();
    fetchDrivers();
  }, [fetchKPIs, fetchVehicles, fetchDrivers]);

  if (!kpis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader className="animate-spin text-orange-500" size={32} />
        <span className="text-sm text-gray-400">Loading Dashboard KPIs...</span>
      </div>
    );
  }

  // Calculate percentages/ratios for the status bars
  const totalVehiclesCount = vehicles.filter(v => v.status !== 'Retired').length || 1;

  const stats = [
    { label: 'Active Vehicles', value: kpis.activeVehicles, color: 'text-white' },
    { label: 'Available Vehicles', value: kpis.availableVehicles, color: 'text-green-500' },
    { label: 'Vehicles In Shop', value: kpis.vehiclesInMaintenance, color: 'text-orange-500' },
    { label: 'Active Trips', value: kpis.activeTrips, color: 'text-blue-500' },
    { label: 'Pending Trips', value: kpis.pendingTrips, color: 'text-gray-400' },
    { label: 'Drivers On Duty', value: kpis.driversOnDuty, color: 'text-white' },
    { label: 'Fleet Utilization', value: `${kpis.fleetUtilizationPercent}%`, color: 'text-green-400' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-[#1a1a1a] border border-[#222] p-4 rounded-xl flex flex-col justify-between h-24 hover:border-[#444] transition-colors relative overflow-hidden">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{stat.label}</span>
            <span className={`text-3xl font-light ${stat.color}`}>{stat.value}</span>
            {isLoading && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Recent Trips Table */}
        <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[#222] flex justify-between items-center bg-gradient-to-r from-[#1a1a1a] to-[#222]">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Recent Trips</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#222] text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 font-semibold">Trip ID</th>
                  <th className="px-5 py-3 font-semibold">Vehicle</th>
                  <th className="px-5 py-3 font-semibold">Driver</th>
                  <th className="px-5 py-3 font-semibold">Route</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {kpis.recentTrips.length === 0 ? (
                  <tr><td colSpan="5" className="px-5 py-8 text-center text-gray-500">No recent trips logged.</td></tr>
                ) : (
                  kpis.recentTrips.map(trip => {
                    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                    const driver = drivers.find(d => d.id === trip.driverId);
                    return (
                      <tr key={trip.id} className="hover:bg-[#2a2a2a] transition-colors">
                        <td className="px-5 py-4 text-gray-300 font-mono text-xs">TRIP-{trip.id.substring(trip.id.length - 4)}</td>
                        <td className="px-5 py-4 text-gray-400 font-mono text-xs">{vehicle?.regNumber || 'Unassigned'}</td>
                        <td className="px-5 py-4 text-gray-400 text-xs">{driver?.name || 'Unassigned'}</td>
                        <td className="px-5 py-4 text-gray-400 text-xs">{trip.source} ➔ {trip.destination}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                            trip.status === 'Completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                            trip.status === 'Cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}>
                            {trip.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicle Status Bars */}
        <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6">Vehicle Allocation</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-400">Available ({kpis.availableVehicles})</span>
                  <span className="text-gray-500 font-mono">{Math.round((kpis.availableVehicles / totalVehiclesCount) * 100)}%</span>
                </div>
                <div className="w-full bg-[#222] rounded-full h-2 overflow-hidden">
                  <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(kpis.availableVehicles / totalVehiclesCount) * 100}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-400">On Trip ({kpis.activeVehicles})</span>
                  <span className="text-gray-500 font-mono">{Math.round((kpis.activeVehicles / totalVehiclesCount) * 100)}%</span>
                </div>
                <div className="w-full bg-[#222] rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(kpis.activeVehicles / totalVehiclesCount) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-400">In Shop ({kpis.vehiclesInMaintenance})</span>
                  <span className="text-gray-500 font-mono">{Math.round((kpis.vehiclesInMaintenance / totalVehiclesCount) * 100)}%</span>
                </div>
                <div className="w-full bg-[#222] rounded-full h-2 overflow-hidden">
                  <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(kpis.vehiclesInMaintenance / totalVehiclesCount) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-[#222] text-xs text-gray-500 leading-relaxed font-medium">
            Stats refresh in real-time as vehicles are dispatched, completed, or sent for servicing.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetDashboardPage;
