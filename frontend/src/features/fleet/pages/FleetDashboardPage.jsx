import React from 'react';
import useFleetStore from '../../../store/useFleetStore';

const FleetDashboardPage = () => {
  const { vehicles, trips, drivers } = useFleetStore();

  // Calculate KPIs
  const activeTrips = trips.filter(t => t.status === 'Dispatched').length;
  const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'In Shop').length;
  const activeVehicles = vehicles.filter(v => v.status === 'On Trip').length;
  
  const totalNotRetired = vehicles.filter(v => v.status !== 'Retired').length;
  const utilization = totalNotRetired > 0 ? Math.round((activeVehicles / totalNotRetired) * 100) : 0;
  
  const driversOnDuty = drivers.filter(d => d.status === 'Available' || d.status === 'On Trip').length;
  const pendingTrips = 0; // Drafts not fully implemented yet

  const stats = [
    { label: 'Active Vehicles', value: activeVehicles, color: 'text-white' },
    { label: 'Available Vehicles', value: availableVehicles, color: 'text-green-500' },
    { label: 'Vehicles In Maintenance', value: maintenanceVehicles, color: 'text-orange-500' },
    { label: 'Active Trips', value: activeTrips, color: 'text-blue-500' },
    { label: 'Pending Trips', value: pendingTrips, color: 'text-gray-400' },
    { label: 'Drivers On Duty', value: driversOnDuty, color: 'text-white' },
    { label: 'Fleet Utilization', value: `${utilization}%`, color: 'text-green-400' }
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex space-x-4 mb-6">
        <select className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500">
          <option>Vehicle Type: All</option>
        </select>
        <select className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500">
          <option>Status: All</option>
        </select>
        <select className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500">
          <option>Region: All</option>
        </select>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-[#1a1a1a] border border-[#222] p-4 rounded-xl flex flex-col justify-between h-24 hover:border-[#444] transition-colors">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{stat.label}</span>
            <span className={`text-3xl font-light ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Recent Trips Table */}
        <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#222] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[#222]">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Recent Trips</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#222] text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 font-semibold">Trip ID</th>
                  <th className="px-5 py-3 font-semibold">Vehicle</th>
                  <th className="px-5 py-3 font-semibold">Driver</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {trips.map(trip => {
                  const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                  const driver = drivers.find(d => d.id === trip.driverId);
                  return (
                    <tr key={trip.id} className="hover:bg-[#2a2a2a] transition-colors">
                      <td className="px-5 py-4 text-gray-300">{trip.id}</td>
                      <td className="px-5 py-4 text-gray-400">{vehicle?.regNumber || 'Unassigned'}</td>
                      <td className="px-5 py-4 text-gray-400">{driver?.name || 'Unassigned'}</td>
                      <td className="px-5 py-4">
                        <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-1 rounded text-xs font-medium">
                          {trip.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicle Status Bars */}
        <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6">Vehicle Status</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-400">Available ({availableVehicles})</span>
              </div>
              <div className="w-full bg-[#222] rounded-full h-2 overflow-hidden">
                <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(availableVehicles/vehicles.length)*100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-400">On Trip ({activeVehicles})</span>
              </div>
              <div className="w-full bg-[#222] rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(activeVehicles/vehicles.length)*100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-400">In Shop ({maintenanceVehicles})</span>
              </div>
              <div className="w-full bg-[#222] rounded-full h-2 overflow-hidden">
                <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(maintenanceVehicles/vehicles.length)*100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetDashboardPage;
