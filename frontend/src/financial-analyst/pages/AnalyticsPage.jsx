import { Gauge, PieChart as PieChartIcon, Wallet, TrendingUp, Download } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import StatCard from "../components/common/StatCard";
import RoiTable from "../components/RoiTable";
import { CostIntensiveVehiclesChart, MonthlyRevenueChart } from "../components/FinancialCharts";
import { useFinancialData } from "../hooks/useFinancialData";
import { useRoiCalculations } from "../hooks/useRoiCalculations";
import { getAnalyticsSummary, exportToCsv } from "../services/financialService";
import { formatPercent } from "../utils/financeHelpers";

const STATUS_FILTERS = ["All", "Available", "On Trip", "In Shop", "Retired"];

export default function AnalyticsPage() {
  const { data, loading } = useFinancialData(() => getAnalyticsSummary(), []);

  const {
    rows,
    sortKey,
    sortDirection,
    toggleSort,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    aggregates,
  } = useRoiCalculations(data?.roiRows || []);

  const handleExport = () => {
    exportToCsv("reports-and-analytics", rows, [
      { key: "vehicleId", header: "Vehicle ID" },
      { key: "model", header: "Model" },
      { key: "acquisitionCost", header: "Acquisition Cost" },
      { key: "tripRevenue", header: "Trip Revenue" },
      { key: "fuelCost", header: "Fuel Cost" },
      { key: "maintenanceCost", header: "Maintenance Cost" },
      { key: "otherExpenses", header: "Other Expenses" },
      { key: "netProfit", header: "Net Profit" },
      { key: "roi", header: "ROI (%)", accessor: (r) => (r.roi === null ? "" : r.roi.toFixed(1)) },
      { key: "status", header: "Status" },
    ]);
  };

  const kpis = [
    {
      label: "Fuel Efficiency",
      value: data?.kpis ? `${data.kpis.fuelEfficiency.toFixed(1)} km/L` : undefined,
      icon: Gauge,
      accent: "sky",
    },
    {
      label: "Fleet Utilization",
      value: data?.kpis ? formatPercent(data.kpis.fleetUtilization, 0) : undefined,
      icon: PieChartIcon,
      accent: "emerald",
    },
    {
      label: "Operational Cost",
      value: data?.kpis?.operationalCost,
      icon: Wallet,
      accent: "amber",
    },
    {
      label: "Vehicle ROI (Avg)",
      value: data?.kpis ? formatPercent(data.kpis.vehicleRoi, 1) : undefined,
      icon: TrendingUp,
      accent: "orange",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Fleet-wide performance, revenue trends, and vehicle profitability at a glance."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            accent={kpi.accent}
            loading={loading || !data}
          />
        ))}
      </div>

      <section className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MonthlyRevenueChart data={data?.monthlyRevenueData} loading={loading} />
        <CostIntensiveVehiclesChart data={data?.costIntensiveVehicles} loading={loading} />
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Vehicle ROI & Profitability</h2>
          <p className="text-sm text-slate-400">
            ROI = (Revenue − (Maintenance + Fuel + Other)) / Acquisition Cost. Sort any column to build a leaderboard.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 sm:self-auto"
        >
          <Download className="h-4 w-4" />
          Export Financial Summary
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vehicle or model..."
          className="w-full rounded-xl border border-slate-700/60 bg-[#141414] py-2.5 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 sm:max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-700/60 bg-[#141414] px-3 py-2.5 text-sm text-slate-200 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All Statuses" : s}
            </option>
          ))}
        </select>
        {!loading && aggregates.decommissionCandidates > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400">
            {aggregates.decommissionCandidates} decommission candidate
            {aggregates.decommissionCandidates > 1 ? "s" : ""} flagged
          </span>
        )}
      </div>

      <RoiTable rows={rows} sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} loading={loading} />
    </div>
  );
}
