/**
 * financeHelpers.js
 * Shared formatting & calculation utilities for the Financial Analyst module.
 * Keeping every ROI / cost / efficiency formula in one place ensures the
 * dashboard, tables and CSV exports never drift out of sync.
 */

/* -------------------------------------------------------------------------- */
/*  Formatters                                                                 */
/* -------------------------------------------------------------------------- */

export function formatCurrency(value, { compact = false } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(Number(value));
}

export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value));
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value) >= 0 ? "" : ""}${Number(value).toFixed(digits)}%`;
}

export function formatDate(value, opts = {}) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDate(d)}, ${d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/* -------------------------------------------------------------------------- */
/*  Core financial formulas                                                   */
/* -------------------------------------------------------------------------- */

/** Net profit for a vehicle/period: Revenue - (Maintenance + Fuel + Other). */
export function calculateNetProfit({ tripRevenue = 0, maintenanceCost = 0, fuelCost = 0, otherExpenses = 0 }) {
  return tripRevenue - (maintenanceCost + fuelCost + otherExpenses);
}

/**
 * Vehicle ROI (%) = (Revenue - (Maintenance + Fuel + Other)) / Acquisition Cost * 100
 * Returns null when acquisition cost is missing/zero to avoid Infinity/NaN in the UI.
 */
export function calculateROI({ tripRevenue = 0, maintenanceCost = 0, fuelCost = 0, otherExpenses = 0, acquisitionCost = 0 }) {
  if (!acquisitionCost || acquisitionCost <= 0) return null;
  const netProfit = calculateNetProfit({ tripRevenue, maintenanceCost, fuelCost, otherExpenses });
  return (netProfit / acquisitionCost) * 100;
}

/** Fuel efficiency in km/L = distance travelled / liters consumed. */
export function calculateFuelEfficiency(distanceKm = 0, liters = 0) {
  if (!liters || liters <= 0) return null;
  return distanceKm / liters;
}

/** Operational efficiency metric: total cost / total distance travelled. */
export function calculateCostPerKm(totalCost = 0, totalDistanceKm = 0) {
  if (!totalDistanceKm || totalDistanceKm <= 0) return null;
  return totalCost / totalDistanceKm;
}

/** Price per liter, dynamically derived from a fuel log entry. */
export function calculatePricePerLiter(totalCost = 0, liters = 0) {
  if (!liters || liters <= 0) return null;
  return totalCost / liters;
}

/**
 * A fuel log entry is flagged as an efficiency outlier when its calculated
 * km/L falls more than `thresholdRatio` below the vehicle type's baseline
 * (e.g. 0.75 => 25% worse than baseline triggers a flag).
 */
export function isFuelOutlier(calculatedEfficiency, baselineEfficiency, thresholdRatio = 0.75) {
  if (calculatedEfficiency === null || !baselineEfficiency) return false;
  return calculatedEfficiency < baselineEfficiency * thresholdRatio;
}

/**
 * Decommission candidate: cumulative maintenance + fuel spend has exceeded
 * the vehicle's original acquisition cost AND the vehicle is currently
 * operating at a net loss.
 */
export function isDecommissionCandidate({ maintenanceCost = 0, fuelCost = 0, acquisitionCost = 0, netProfit = 0 }) {
  if (!acquisitionCost) return false;
  return maintenanceCost + fuelCost > acquisitionCost && netProfit < 0;
}

/* -------------------------------------------------------------------------- */
/*  Misc                                                                       */
/* -------------------------------------------------------------------------- */

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function sortRows(rows, key, direction = "asc") {
  if (!key) return rows;
  const sorted = [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    if (typeof av === "string") return av.localeCompare(bv);
    return av - bv;
  });
  return direction === "asc" ? sorted : sorted.reverse();
}

export const EXPENSE_TYPE_STYLES = {
  Toll: { label: "Toll", className: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  Permit: { label: "Permit", className: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  Fine: { label: "Fine", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  Other: { label: "Other", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

export const STATUS_STYLES = {
  Available: { label: "Available", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  "On Trip": { label: "On Trip", className: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  "In Shop": { label: "In Shop", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  Retired: { label: "Retired", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  Active: { label: "Active", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  Closed: { label: "Closed", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};
