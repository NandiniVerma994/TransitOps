import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Fuel,
  LineChart,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
} from "lucide-react";
import { cn } from "../utils/financeHelpers";

const NAV_ITEMS = [
  { to: "/financial-analyst/fuel-expenses", label: "Fuel & Expenses", icon: Fuel },
  { to: "/financial-analyst/dashboard", label: "Dashboard", icon: LineChart },
];

function SidebarContent({ onNavigate }) {
  const navigate = useNavigate();

  const handleSignOut = () => {
    navigate("/");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <p className="text-xl font-bold leading-tight tracking-tight text-slate-100">TransitOps</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-orange-500/15 text-orange-400"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-rose-400"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Logout
        </button>
      </div>
    </div>
  );
}

function Topbar({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-[#0a0a0a] px-4 py-3.5 sm:px-6">
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm font-medium text-slate-300 sm:inline">Raven K.</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-600/15 px-3 py-1.5 text-xs font-semibold text-orange-400">
          Financial Analyst
          <ChevronDown className="h-3.5 w-3.5" />
        </span>
      </div>
    </header>
  );
}

export default function FinancialLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-800 bg-[#0c0c0c] lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-slate-800 bg-[#0c0c0c] shadow-2xl animate-slideUp">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="animate-fadeIn px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
