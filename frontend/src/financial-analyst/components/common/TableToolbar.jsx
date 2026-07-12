import { Search, Download, Plus } from "lucide-react";

export default function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  onExport,
  onAction,
  actionLabel,
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-slate-700/60 bg-[#141414] py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
          />
        </div>
        {filters}
      </div>
      <div className="flex items-center gap-2">
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/30 transition-all hover:bg-orange-500 hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
