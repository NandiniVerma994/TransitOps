import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const PALETTE = {
  revenue: "#34d399",
  expenses: "#f87171",
  grid: "#1e293b",
  axis: "#64748b",
  text: "#cbd5e1",
};

const DONUT_COLORS = [
  "#38bdf8", // Fuel
  "#a78bfa", // Maintenance
  "#fbbf24", // Tolls
  "#f472b6", // Permits
  "#fb923c", // Fines
  "#94a3b8", // Other
];

const BAR_GRADIENT_ID = "costliestVehicleGradient";

const currencyFormatter = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const compactCurrencyFormatter = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

/* -------------------------------------------------------------------------- */
/*  Shared UI primitives                                                       */
/* -------------------------------------------------------------------------- */

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div
      className={`relative rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-slate-600/60 hover:shadow-2xl hover:shadow-black/30 ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-slate-100">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function ChartSkeleton({ variant = "line" }) {
  return (
    <div className="flex h-72 w-full animate-pulse flex-col justify-end gap-3 px-2">
      {variant === "bar" ? (
        <div className="flex h-full flex-col justify-around gap-3">
          {[85, 65, 50, 40, 30].map((w, i) => (
            <div
              key={i}
              className="h-6 rounded-full bg-slate-700/50"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      ) : variant === "donut" ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-40 w-40 rounded-full border-[14px] border-slate-700/50" />
        </div>
      ) : (
        <div className="grid h-full grid-cols-12 items-end gap-2">
          {[40, 55, 35, 70, 60, 80, 50, 65, 45, 75, 58, 68].map((h, i) => (
            <div
              key={i}
              className="rounded-t-sm bg-slate-700/50"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message = "No data available for this period" }) {
  return (
    <div className="flex h-72 w-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/40">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-6 w-6 text-slate-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3v18h18M7 15l4-5 3 3 5-7"
          />
        </svg>
      </div>
      <p className="max-w-[220px] text-sm text-slate-400">{message}</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-2xl backdrop-blur-sm">
      {label && (
        <p className="mb-1 text-xs font-medium text-slate-400">{label}</p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-slate-300">{entry.name}:</span>
            <span className="font-semibold text-slate-100">
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomLegend({ payload }) {
  if (!payload || payload.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs font-medium text-slate-400">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  1. Revenue vs Expenses Line Chart                                          */
/* -------------------------------------------------------------------------- */

function RevenueExpensesChart({ data, loading }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <ChartCard
      title="Revenue vs. Expenses Trend"
      subtitle="Monthly comparison of gross earnings and operational cost"
    >
      {loading ? (
        <ChartSkeleton variant="line" />
      ) : !hasData ? (
        <EmptyState message="No revenue or expense records found for this range" />
      ) : (
        <ResponsiveContainer width="100%" height={288}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} vertical={false} />
            <XAxis
              dataKey="period"
              stroke={PALETTE.axis}
              tick={{ fill: PALETTE.text, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: PALETTE.grid }}
            />
            <YAxis
              stroke={PALETTE.axis}
              tick={{ fill: PALETTE.text, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={compactCurrencyFormatter}
              width={64}
            />
            <Tooltip
              content={<CustomTooltip formatter={currencyFormatter} />}
              cursor={{ stroke: PALETTE.axis, strokeDasharray: "4 4" }}
            />
            <Legend content={<CustomLegend />} />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={PALETTE.revenue}
              strokeWidth={2.5}
              dot={{ r: 3, fill: PALETTE.revenue, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#0f172a" }}
              animationDuration={800}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke={PALETTE.expenses}
              strokeWidth={2.5}
              dot={{ r: 3, fill: PALETTE.expenses, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#0f172a" }}
              animationDuration={800}
              animationBegin={100}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  2. Operational Expense Breakdown Donut Chart                              */
/* -------------------------------------------------------------------------- */

function ExpenseBreakdownChart({ data, loading }) {
  const hasData = Array.isArray(data) && data.length > 0;

  const total = useMemo(
    () => (hasData ? data.reduce((sum, d) => sum + (d.value || 0), 0) : 0),
    [data, hasData]
  );

  return (
    <ChartCard
      title="Operational Expense Breakdown"
      subtitle="Distribution across fuel, maintenance, tolls, permits & fines"
    >
      {loading ? (
        <ChartSkeleton variant="donut" />
      ) : !hasData || total === 0 ? (
        <EmptyState message="No operational expenses logged yet" />
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={288}>
            <PieChart>
              <Tooltip
                content={<CustomTooltip formatter={currencyFormatter} />}
              />
              <Legend
                content={<CustomLegend />}
                verticalAlign="bottom"
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={68}
                outerRadius={98}
                paddingAngle={3}
                cornerRadius={6}
                animationDuration={800}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name || index}
                    fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                    stroke="#0f172a"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-lg font-bold text-slate-100">
              {compactCurrencyFormatter(total)}
            </p>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  3. Top 5 Costliest Vehicles Horizontal Bar Chart                           */
/* -------------------------------------------------------------------------- */

function CostliestVehiclesChart({ data, loading }) {
  const hasData = Array.isArray(data) && data.length > 0;

  const sorted = useMemo(
    () =>
      hasData
        ? [...data].sort((a, b) => b.cost - a.cost).slice(0, 5)
        : [],
    [data, hasData]
  );

  return (
    <ChartCard
      title="Top 5 Cost-Intensive Vehicles"
      subtitle="Vehicles consuming the highest share of operational budget"
      className="lg:col-span-2"
    >
      {loading ? (
        <ChartSkeleton variant="bar" />
      ) : sorted.length === 0 ? (
        <EmptyState message="No vehicle cost data available" />
      ) : (
        <ResponsiveContainer width="100%" height={288}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
            barCategoryGap={18}
          >
            <defs>
              <linearGradient id={BAR_GRADIENT_ID} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fb923c" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#f87171" stopOpacity={0.9} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} horizontal={false} />
            <XAxis
              type="number"
              stroke={PALETTE.axis}
              tick={{ fill: PALETTE.text, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: PALETTE.grid }}
              tickFormatter={compactCurrencyFormatter}
            />
            <YAxis
              type="category"
              dataKey="vehicle"
              stroke={PALETTE.axis}
              tick={{ fill: PALETTE.text, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip
              content={<CustomTooltip formatter={currencyFormatter} />}
              cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
            />
            <Bar
              dataKey="cost"
              name="Total Cost"
              fill={`url(#${BAR_GRADIENT_ID})`}
              radius={[0, 6, 6, 0]}
              barSize={22}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  FinancialCharts — main exported component                                 */
/* -------------------------------------------------------------------------- */

/**
 * FinancialCharts
 *
 * Renders the three core visualizations for the Financial Analyst
 * dashboard: Revenue vs Expenses trend, Operational Expense breakdown,
 * and Top 5 Cost-Intensive Vehicles.
 *
 * @param {Object} props
 * @param {Array<{ period: string, revenue: number, expenses: number }>} props.revenueExpenseData
 * @param {Array<{ name: string, value: number }>} props.expenseBreakdownData
 * @param {Array<{ vehicle: string, cost: number }>} props.costliestVehiclesData
 * @param {boolean} [props.loading=false]
 */
export default function FinancialCharts({
  revenueExpenseData = [],
  expenseBreakdownData = [],
  costliestVehiclesData = [],
  loading = false,
}) {
  return (
    <section
      className="grid grid-cols-1 gap-5 lg:grid-cols-2"
      style={{ backgroundColor: "transparent" }}
    >
      <RevenueExpensesChart data={revenueExpenseData} loading={loading} />
      <ExpenseBreakdownChart data={expenseBreakdownData} loading={loading} />
      <CostliestVehiclesChart data={costliestVehiclesData} loading={loading} />
    </section>
  );
}
