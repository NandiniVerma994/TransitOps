import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Truck, Users, Map, Wrench, Fuel, BarChart3, Settings, LogOut } from 'lucide-react';

const DashboardLayout = () => {
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Fleet', path: '/fleet', icon: Truck },
    { name: 'Drivers', path: '/drivers', icon: Users },
    { name: 'Trips', path: '/trips', icon: Map },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Fuel & Expenses', path: '/expenses', icon: Fuel },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#121212] text-gray-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-[#222] bg-[#1a1a1a] flex flex-col justify-between">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-[#222]">
            <h1 className="text-xl font-bold text-white tracking-tight">TransitOps</h1>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_10px_rgba(234,88,12,0.1)]' 
                      : 'hover:bg-[#2a2a2a] hover:text-white'
                  }`
                }
              >
                <item.icon size={18} strokeWidth={2} />
                <span className="text-sm font-medium">{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-[#222]">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 px-4 py-2.5 w-full text-left rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-[#222] bg-[#1a1a1a] flex items-center justify-between px-6 flex-shrink-0">
          <div className="w-96 relative">
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-[#2a2a2a] border border-[#333] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500 text-white"
            />
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">Raven K.</span>
            <div className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center space-x-2">
              <span>Fleet Manager</span>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8 bg-[#0a0a0a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
