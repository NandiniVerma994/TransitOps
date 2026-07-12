import { formatCurrency } from "../../utils/financeHelpers";

export default function StatCard({ label, value, icon: Icon, accent = "sky", loading = false }) {
  const accentClasses = {
    sky: "bg-sky-500/10 text-sky-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    orange: "bg-orange-500/10 text-orange-400",
    rose: "bg-rose-500/10 text-rose-400",
  };

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
        <div className="mb-3 h-4 w-28 rounded bg-slate-700/50" />
        <div className="h-7 w-24 rounded bg-slate-700/50" />
      </div>
    );
  }

  const displayValue = typeof value === "number" ? formatCurrency(value) : value;

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-lg shadow-black/10 backdrop-blur-xl transition-all duration-300 hover:border-slate-600/60 hover:shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {Icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentClasses[accent]}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-100">{displayValue}</p>
    </div>
  );
}
