import { ArrowUp, ArrowDown, ArrowUpDown, AlertTriangle } from "lucide-react";
import Badge from "./common/Badge";
import { formatCurrency, formatPercent, STATUS_STYLES, cn } from "../utils/financeHelpers";

const COLUMNS = [
  { key: "vehicleId", label: "Vehicle", sortable: true },
  { key: "acquisitionCost", label: "Acquisition Cost", sortable: true, align: "right" },
  { key: "tripRevenue", label: "Trip Revenue", sortable: true, align: "right" },
  { key: "fuelCost", label: "Fuel Cost", sortable: true, align: "right" },
  { key: "maintenanceCost", label: "Maintenance Cost", sortable: true, align: "right" },
  { key: "otherExpenses", label: "Other Expenses", sortable: true, align: "right" },
  { key: "netProfit", label: "Net Profit", sortable: true, align: "right" },
  { key: "roi", label: "ROI", sortable: true, align: "right" },
  { key: "status", label: "Status", sortable: false, align: "center" },
];

function SortIcon({ active, direction }) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-600" />;
  return direction === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-orange-400" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-orange-400" />
  );
}

/**
 * RoiTable — performance metrics grid with sortable columns, ROI-based
 * green/red highlighting, and an auto "Decommission Candidate" flag.
 */
export default function RoiTable({ rows = [], sortKey, sortDirection, onSort, loading = false }) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/40">
        <div className="animate-pulse divide-y divide-slate-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-800/30" />
          ))}
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-700/50 bg-slate-800/40 py-16 text-center">
        <p className="text-sm text-slate-400">No vehicles match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/40 shadow-lg shadow-black/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/40">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className={cn(
                        "inline-flex items-center gap-1 transition-colors hover:text-slate-100",
                        col.align === "right" && "flex-row-reverse"
                      )}
                    >
                      {col.label}
                      <SortIcon active={sortKey === col.key} direction={sortDirection} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {rows.map((row) => {
              const roiPositive = typeof row.roi === "number" && row.roi >= 0;
              const statusStyle = STATUS_STYLES[row.status] || STATUS_STYLES.Available;
              return (
                <tr key={row.vehicleId} className="transition-colors hover:bg-slate-800/40">
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-semibold text-slate-100">{row.vehicleId}</p>
                        <p className="text-xs text-slate-500">{row.model}</p>
                      </div>
                      {row.isDecommissionCandidate && (
                        <span
                          title="Decommission candidate: cumulative maintenance + fuel exceeds acquisition cost at negative net profit"
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/15 text-rose-400"
                        >
                          <AlertTriangle className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right text-slate-300">
                    {formatCurrency(row.acquisitionCost)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right text-slate-300">
                    {formatCurrency(row.tripRevenue)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right text-slate-300">
                    {formatCurrency(row.fuelCost)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right text-slate-300">
                    {formatCurrency(row.maintenanceCost)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right text-slate-300">
                    {formatCurrency(row.otherExpenses)}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-4 py-3.5 text-right font-semibold",
                      row.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {formatCurrency(row.netProfit)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <span
                      className={cn(
                        "inline-flex min-w-[64px] justify-center rounded-lg px-2.5 py-1 text-xs font-bold",
                        row.roi === null
                          ? "bg-slate-700/40 text-slate-400"
                          : roiPositive
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      )}
                    >
                      {row.roi === null ? "—" : formatPercent(row.roi)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-center">
                    <Badge className={statusStyle.className}>{statusStyle.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
