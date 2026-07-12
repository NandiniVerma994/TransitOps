import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  PiggyBank,
  Gauge,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const PALETTE = {
  revenue: "#34d399",
  expenses: "#f87171",
  trend: "#38bdf8",
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

const KPI_ICONS = {
  revenue: Wallet,
  expenses: Receipt,
  profit: PiggyBank,
  efficiency: Gauge,
};

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
      className={`relative rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-lg shadow-black/10 backdrop-blur-xl transition-all duration-300 hover:border-slate-600/60 hover:shadow-xl ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-wide text-slate-100">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function ChartSkeleton({ variant = "line" }) {
  return (
    <div className="flex h-64 w-full animate-pulse flex-col justify-end gap-3 px-2">
      {variant === "donut" ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-36 w-36 rounded-full border-[14px] border-slate-700/50" />
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
    <div className="flex h-64 w-full flex-col items-center justify-center gap-3 text-center">
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
      <p className="max-w-[220px] text-sm text-slate-400">
        {message}
      </p>
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
/*  KPI Summary Cards                                                          */
/* -------------------------------------------------------------------------- */

function KpiCard({ label, value, changePercent, icon, loading }) {
  const Icon = KPI_ICONS[icon] || Wallet;
  const isPositive = typeof changePercent === "number" && changePercent >= 0;
  const hasChange = typeof changePercent === "number" && !Number.isNaN(changePercent);

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-lg shadow-black/10">
        <div className="mb-3 h-4 w-24 rounded bg-slate-700/50" />
        <div className="h-7 w-32 rounded bg-slate-700/50" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-lg shadow-black/10 backdrop-blur-xl transition-all duration-300 hover:border-slate-600/60 hover:shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-100">
        {typeof value === "number" ? currencyFormatter(value) : value}
      </p>
      {hasChange && (
        <div
          className={`mt-2 flex items-center gap-1 text-xs font-medium ${
            isPositive ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>
            {isPositive ? "+" : ""}
            {changePercent.toFixed(1)}% vs last period
          </span>
        </div>
      )}
    </div>
  );
}

function KpiSummaryCards({ kpis, loading }) {
  const hasKpis = Array.isArray(kpis) && kpis.length > 0;

  if (!hasKpis && !loading) return null;

  const cards = loading ? new Array(4).fill(null) : kpis;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((kpi, idx) => (
        <KpiCard
          key={kpi?.label || idx}
          label={kpi?.label}
          value={kpi?.value}
          changePercent={kpi?.changePercent}
          icon={kpi?.icon}
          loading={loading}
        />
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
      title="Revenue vs. Expenses"
      subtitle="Gross earnings compared against operational cost"
    >
      {loading ? (
        <ChartSkeleton variant="line" />
      ) : !hasData ? (
        <EmptyState message="No revenue or expense records found for this range" />
      ) : (
        <ResponsiveContainer width="100%" height={264}>
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
/*  2. Monthly Expense Trend (Area Chart)                                     */
/* -------------------------------------------------------------------------- */

function MonthlyExpenseTrendChart({ data, loading }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <ChartCard
      title="Monthly Expense Trend"
      subtitle="Total operational spend across recent months"
    >
      {loading ? (
        <ChartSkeleton variant="line" />
      ) : !hasData ? (
        <EmptyState message="No expense history available yet" />
      ) : (
        <ResponsiveContainer width="100%" height={264}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="monthlyExpenseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PALETTE.trend} stopOpacity={0.35} />
                <stop offset="100%" stopColor={PALETTE.trend} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} vertical={false} />
            <XAxis
              dataKey="month"
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
            <Area
              type="monotone"
              dataKey="expense"
              name="Total Expense"
              stroke={PALETTE.trend}
              strokeWidth={2.5}
              fill="url(#monthlyExpenseFill)"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  3. Expense Breakdown Donut Chart                                          */
/* -------------------------------------------------------------------------- */

function ExpenseBreakdownChart({ data, loading }) {
  const hasData = Array.isArray(data) && data.length > 0;

  const total = useMemo(
    () => (hasData ? data.reduce((sum, d) => sum + (d.value || 0), 0) : 0),
    [data, hasData]
  );

  return (
    <ChartCard
      title="Expense Breakdown"
      subtitle="Distribution across fuel, maintenance, tolls, permits & fines"
      className="lg:col-span-2 xl:col-span-1"
    >
      {loading ? (
        <ChartSkeleton variant="donut" />
      ) : !hasData || total === 0 ? (
        <EmptyState message="No operational expenses logged yet" />
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={264}>
            <PieChart>
              <Tooltip content={<CustomTooltip formatter={currencyFormatter} />} />
              <Legend content={<CustomLegend />} verticalAlign="bottom" />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={62}
                outerRadius={90}
                paddingAngle={3}
                cornerRadius={6}
                animationDuration={800}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name || index}
                    fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                    stroke="var(--chart-card-bg, #0f172a)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 text-center">
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
/*  Monthly Revenue (Bar Chart) — used on the Reports & Analytics page        */
/* -------------------------------------------------------------------------- */

/**
 * MonthlyRevenueChart
 * Simple monthly revenue bar chart for the combined Reports & Analytics page.
 * Exported separately so it can be composed alongside other analytics charts.
 */
export function MonthlyRevenueChart({ data, loading, className = "" }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <ChartCard title="Monthly Revenue" subtitle="Gross trip revenue trend across recent months" className={className}>
      {loading ? (
        <ChartSkeleton variant="line" />
      ) : !hasData ? (
        <EmptyState message="No revenue records found for this range" />
      ) : (
        <ResponsiveContainer width="100%" height={264}>
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap={18}>
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
              cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
            />
            <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} animationDuration={800}>
              {data.map((entry, index) => (
                <Cell key={entry.period || index} fill={PALETTE.revenue} fillOpacity={0.55 + (index / data.length) * 0.45} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  4. Cost-Intensive Vehicles (Horizontal Bar Chart)                         */
/* -------------------------------------------------------------------------- */

/**
 * CostIntensiveVehiclesChart
 * Ranks the top vehicles consuming the highest operational budget.
 * Exported separately so it can be composed into the dashboard layout
 * alongside (rather than inside) the KPI/trend grid.
 */
export function CostIntensiveVehiclesChart({ data, loading, className = "" }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <ChartCard
      title="Cost-Intensive Vehicles"
      subtitle="Top 5 vehicles consuming the highest operational budget"
      className={className}
    >
      {loading ? (
        <ChartSkeleton variant="line" />
      ) : !hasData ? (
        <EmptyState message="No vehicle cost data available yet" />
      ) : (
        <ResponsiveContainer width="100%" height={264}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
            barCategoryGap={14}
          >
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
              dataKey="name"
              stroke={PALETTE.axis}
              tick={{ fill: PALETTE.text, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              content={<CustomTooltip formatter={currencyFormatter} />}
              cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
            />
            <Bar dataKey="cost" name="Operational Cost" radius={[0, 6, 6, 0]} animationDuration={800}>
              {data.map((entry, index) => (
                <Cell
                  key={entry.name || index}
                  fill={index === 0 ? "#fb7185" : index === 1 ? "#fb923c" : "#38bdf8"}
                />
              ))}
            </Bar>
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
 * Renders the Financial Analyst dashboard summary: KPI cards, Revenue vs
 * Expenses, Monthly Expense Trend, and Expense Breakdown.
 *
 * @param {Object} props
 * @param {Array<{ label: string, value: number, changePercent?: number, icon?: 'revenue'|'expenses'|'profit'|'efficiency' }>} [props.kpis]
 * @param {Array<{ period: string, revenue: number, expenses: number }>} [props.revenueExpenseData]
 * @param {Array<{ month: string, expense: number }>} [props.monthlyExpenseTrendData]
 * @param {Array<{ name: string, value: number }>} [props.expenseBreakdownData]
 * @param {boolean} [props.loading=false]
 */
export default function FinancialCharts({
  kpis = [],
  revenueExpenseData = [],
  monthlyExpenseTrendData = [],
  expenseBreakdownData = [],
  loading = false,
}) {
  return (
    <div className="flex flex-col gap-5">
      <KpiSummaryCards kpis={kpis} loading={loading} />

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RevenueExpensesChart data={revenueExpenseData} loading={loading} />
        <MonthlyExpenseTrendChart data={monthlyExpenseTrendData} loading={loading} />
        <ExpenseBreakdownChart data={expenseBreakdownData} loading={loading} />
      </section>
    </div>
  );
}
