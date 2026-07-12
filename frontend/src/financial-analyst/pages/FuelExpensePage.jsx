import { useState } from "react";
import { Fuel, Receipt, Wrench, Wallet, Plus, Download } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import StatCard from "../components/common/StatCard";
import Badge from "../components/common/Badge";
import LogFuelModal from "../components/LogFuelModal";
import LogExpenseModal from "../components/LogExpenseModal";
import { useFinancialData } from "../hooks/useFinancialData";
import { getFuelLogs, getExpenses, getFuelExpenseSummary, exportToCsv } from "../services/financialService";
import { formatCurrency, formatDateTime, formatNumber, EXPENSE_TYPE_STYLES, cn } from "../utils/financeHelpers";

const EXPENSE_TYPE_FILTERS = ["All", "Toll", "Permit", "Fine", "Other"];

export default function FuelExpensePage() {
  const [fuelSearch, setFuelSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseType, setExpenseType] = useState("All");
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  const {
    data: fuelRows,
    loading: fuelLoading,
    refetch: refetchFuel,
  } = useFinancialData(() => getFuelLogs({ search: fuelSearch }), [fuelSearch]);

  const {
    data: expenseRows,
    loading: expenseLoading,
    refetch: refetchExpenses,
  } = useFinancialData(() => getExpenses({ search: expenseSearch, type: expenseType }), [expenseSearch, expenseType]);

  const {
    data: summary,
    loading: summaryLoading,
    refetch: refetchSummary,
  } = useFinancialData(() => getFuelExpenseSummary(), []);

  const refreshAll = () => {
    refetchFuel();
    refetchExpenses();
    refetchSummary();
  };

  const handleExportFuel = () => {
    exportToCsv("fuel-logs", fuelRows || [], [
      { key: "id", header: "Log ID" },
      { key: "date", header: "Date/Time", accessor: (r) => formatDateTime(r.date) },
      { key: "vehicleId", header: "Vehicle" },
      { key: "liters", header: "Liters" },
      { key: "totalCost", header: "Fuel Cost" },
      { key: "tripId", header: "Trip ID" },
      { key: "odometer", header: "Odometer (km)" },
      { key: "efficiency", header: "Efficiency (km/L)", accessor: (r) => (r.efficiency ? r.efficiency.toFixed(1) : "") },
    ]);
  };

  const handleExportExpenses = () => {
    exportToCsv("other-expenses", expenseRows || [], [
      { key: "id", header: "Expense ID" },
      { key: "date", header: "Date/Time", accessor: (r) => formatDateTime(r.date) },
      { key: "type", header: "Type" },
      { key: "vehicleId", header: "Vehicle" },
      { key: "tripId", header: "Trip ID" },
      { key: "amount", header: "Amount" },
      { key: "note", header: "Note" },
    ]);
  };

  const kpis = [
    { label: "Total Fuel Cost", value: summary?.totalFuelCost, icon: Fuel, accent: "orange" },
    { label: "Other Expenses (Toll/Fine/Permit)", value: summary?.totalOtherExpenses, icon: Receipt, accent: "sky" },
    { label: "Maintenance (Linked)", value: summary?.totalMaintenance, icon: Wrench, accent: "amber" },
    { label: "Total Operational Cost", value: summary?.totalOperationalCost, icon: Wallet, accent: "rose" },
  ];

  return (
    <div>
      <PageHeader
        title="Fuel & Expense Management"
        subtitle="Log fuel purchases and operational expenses, and track total cost per vehicle."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            accent={kpi.accent}
            loading={summaryLoading || !summary}
          />
        ))}
      </div>

      {/* Fuel Logs */}
      <section className="mb-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Fuel Logs</h2>
            <p className="text-sm text-slate-400">Every fill-up recorded across the active fleet.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={fuelSearch}
                onChange={(e) => setFuelSearch(e.target.value)}
                placeholder="Search vehicle or trip ID..."
                className="w-full rounded-xl border border-slate-700/60 bg-[#141414] py-2.5 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              />
            </div>
            <button
              type="button"
              onClick={handleExportFuel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={() => setFuelModalOpen(true)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/30 transition-all hover:bg-orange-500 hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Log Fuel
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/40 shadow-lg shadow-black/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Liters</th>
                  <th className="px-4 py-3 text-right">Fuel Cost</th>
                  <th className="px-4 py-3">Trip</th>
                  <th className="px-4 py-3 text-right">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {fuelLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4" colSpan={6}>
                        <div className="h-4 w-full rounded bg-slate-800/50" />
                      </td>
                    </tr>
                  ))}

                {!fuelLoading && (!fuelRows || fuelRows.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">
                      No fuel logs match your search.
                    </td>
                  </tr>
                )}

                {!fuelLoading &&
                  fuelRows?.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors hover:bg-slate-800/40",
                        row.isOutlier && "bg-rose-500/[0.06] hover:bg-rose-500/10"
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-200">{row.vehicleId}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-300">{formatDateTime(row.date)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-slate-300">
                        {formatNumber(row.liters, 1)} L
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-slate-100">
                        {formatCurrency(row.totalCost)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-400">{row.tripId || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 font-semibold",
                            row.isOutlier ? "text-rose-400" : "text-slate-200"
                          )}
                          title={row.isOutlier ? "Below baseline — possible fuel theft or engine issue" : undefined}
                        >
                          {row.efficiency ? `${row.efficiency.toFixed(1)} km/L` : "—"}
                          {row.isOutlier && <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Other Expenses */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Other Expenses (Toll / Fine / Permit)</h2>
            <p className="text-sm text-slate-400">Non-fuel operational costs logged against trips and vehicles.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={expenseSearch}
              onChange={(e) => setExpenseSearch(e.target.value)}
              placeholder="Search vehicle, trip, notes..."
              className="w-full rounded-xl border border-slate-700/60 bg-[#141414] py-2.5 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 sm:w-56"
            />
            <select
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
              className="rounded-xl border border-slate-700/60 bg-[#141414] px-3 py-2.5 text-sm text-slate-200 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
            >
              {EXPENSE_TYPE_FILTERS.map((t) => (
                <option key={t} value={t}>
                  {t === "All" ? "All Types" : t}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleExportExpenses}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={() => setExpenseModalOpen(true)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/30 transition-all hover:bg-orange-500 hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/40 shadow-lg shadow-black/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Trip</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {expenseLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4" colSpan={6}>
                        <div className="h-4 w-full rounded bg-slate-800/50" />
                      </td>
                    </tr>
                  ))}

                {!expenseLoading && (!expenseRows || expenseRows.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">
                      No expenses match your search or filters.
                    </td>
                  </tr>
                )}

                {!expenseLoading &&
                  expenseRows?.map((row) => {
                    const style = EXPENSE_TYPE_STYLES[row.type] || EXPENSE_TYPE_STYLES.Other;
                    return (
                      <tr key={row.id} className="transition-colors hover:bg-slate-800/40">
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-400">{row.tripId || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-200">{row.vehicleId}</td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <Badge className={style.className}>{style.label}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-slate-100">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-3.5 text-slate-400" title={row.note}>
                          {row.note}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-400">{row.loggedBy}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/40 px-5 py-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total Operational Cost (Fuel + Maintenance + Other)
            </span>
            <span className="text-lg font-bold text-orange-400">
              {summaryLoading || !summary ? "—" : formatCurrency(summary.totalOperationalCost)}
            </span>
          </div>
        </div>
      </section>

      <LogFuelModal open={fuelModalOpen} onClose={() => setFuelModalOpen(false)} onLogged={refreshAll} />
      <LogExpenseModal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} onLogged={refreshAll} />
    </div>
  );
}
