/**
 * financialService.js
 *
 * Simulated backend for the Financial Analyst module. In production these
 * functions would be thin wrappers around fetch()/axios calls to the
 * TransitOps API; for now they resolve against an in-memory seed dataset so
 * the UI is fully demoable offline. Swapping in real endpoints later only
 * requires editing this file.
 */

import {
  calculateFuelEfficiency,
  calculateNetProfit,
  calculatePricePerLiter,
  calculateROI,
  isFuelOutlier,
} from "../utils/financeHelpers";

const NETWORK_DELAY = 380;

const delay = (ms = NETWORK_DELAY) => new Promise((resolve) => setTimeout(resolve, ms));

/* -------------------------------------------------------------------------- */
/*  Seed data                                                                  */
/* -------------------------------------------------------------------------- */

const VEHICLES = [
  { id: "VAN-05", model: "Tata Ace Gold", type: "Van", acquisitionCost: 620000, status: "In Shop" },
  { id: "TRUCK-11", model: "Ashok Leyland Dost+", type: "Truck", acquisitionCost: 1450000, status: "On Trip" },
  { id: "MINI-03", model: "Mahindra Bolero Pik-Up", type: "Mini Truck", acquisitionCost: 980000, status: "In Shop" },
  { id: "VAN-12", model: "Tata Ace Gold", type: "Van", acquisitionCost: 600000, status: "Available" },
  { id: "TRUCK-07", model: "Eicher Pro 2049", type: "Truck", acquisitionCost: 1780000, status: "Available" },
  { id: "SEDAN-02", model: "Maruti Dzire", type: "Sedan", acquisitionCost: 820000, status: "On Trip" },
];

const FUEL_BASELINE_BY_TYPE = {
  Van: 12.5,
  Truck: 6.8,
  "Mini Truck": 9.2,
  Sedan: 16.5,
};

const FUEL_LOGS = [
  { id: "FL-1001", vehicleId: "VAN-05", date: "2026-07-05T09:20:00", liters: 42, totalCost: 3150, tripId: "TR001", odometer: 18420, prevOdometer: 17890 },
  { id: "FL-1002", vehicleId: "TRUCK-11", date: "2026-07-06T14:05:00", liters: 110, totalCost: 8400, tripId: "TR002", odometer: 54210, prevOdometer: 53480 },
  { id: "FL-1003", vehicleId: "MINI-03", date: "2026-07-06T17:40:00", liters: 28, totalCost: 2050, tripId: "TR003", odometer: 22110, prevOdometer: 21870 },
  { id: "FL-1004", vehicleId: "VAN-12", date: "2026-07-07T08:15:00", liters: 38, totalCost: 2850, tripId: "TR004", odometer: 9120, prevOdometer: 8640 },
  { id: "FL-1005", vehicleId: "TRUCK-07", date: "2026-07-08T11:30:00", liters: 132, totalCost: 10120, tripId: "TR005", odometer: 31200, prevOdometer: 30150 },
  { id: "FL-1006", vehicleId: "SEDAN-02", date: "2026-07-09T07:50:00", liters: 30, totalCost: 2340, tripId: "TR006", odometer: 41800, prevOdometer: 41310 },
  { id: "FL-1007", vehicleId: "MINI-03", date: "2026-07-10T16:10:00", liters: 26, totalCost: 1980, tripId: "TR007", odometer: 22540, prevOdometer: 22110 },
];

const EXPENSES = [
  { id: "EXP-2001", date: "2026-07-05T10:00:00", type: "Toll", vehicleId: "VAN-05", tripId: "TR001", amount: 120, note: "NH-16 toll plaza", loggedBy: "Raven K." },
  { id: "EXP-2002", date: "2026-07-06T09:15:00", type: "Toll", vehicleId: "TRUCK-11", tripId: "TR002", amount: 340, note: "Expressway toll (return)", loggedBy: "Raven K." },
  { id: "EXP-2003", date: "2026-07-06T09:20:00", type: "Fine", vehicleId: "TRUCK-11", tripId: "TR002", amount: 150, note: "Overspeed challan", loggedBy: "Raven K." },
  { id: "EXP-2004", date: "2026-07-07T13:45:00", type: "Permit", vehicleId: "VAN-12", tripId: "TR004", amount: 500, note: "Interstate permit renewal", loggedBy: "Priya S." },
  { id: "EXP-2005", date: "2026-07-08T15:30:00", type: "Other", vehicleId: "TRUCK-07", tripId: "TR005", amount: 220, note: "Parking + loading fee", loggedBy: "Priya S." },
  { id: "EXP-2006", date: "2026-07-09T08:05:00", type: "Toll", vehicleId: "SEDAN-02", tripId: "TR006", amount: 80, note: "City toll", loggedBy: "Raven K." },
];

const MAINTENANCE_LOGS = [
  { id: "MT-3001", title: "Oil Change", vehicleId: "VAN-05", cost: 2500, status: "Active", startedAt: "2026-07-07", closedAt: null, category: "Preventive", description: "Scheduled 10k km oil & filter change" },
  { id: "MT-3002", title: "Engine Repair", vehicleId: "TRUCK-11", cost: 18000, status: "Closed", startedAt: "2026-06-28", closedAt: "2026-07-03", category: "Corrective", description: "Turbocharger seal replacement" },
  { id: "MT-3003", title: "Tyre Replace", vehicleId: "MINI-03", cost: 6200, status: "Active", startedAt: "2026-07-06", closedAt: null, category: "Preventive", description: "Front axle tyre set replacement" },
  { id: "MT-3004", title: "Brake Pad Service", vehicleId: "VAN-12", cost: 3400, status: "Closed", startedAt: "2026-06-20", closedAt: "2026-06-21", category: "Preventive", description: "Front & rear brake pad replacement" },
  { id: "MT-3005", title: "Clutch Repair", vehicleId: "TRUCK-07", cost: 12800, status: "Closed", startedAt: "2026-06-10", closedAt: "2026-06-14", category: "Corrective", description: "Clutch plate + pressure plate replaced" },
  { id: "MT-3006", title: "AC Service", vehicleId: "SEDAN-02", cost: 1800, status: "Closed", startedAt: "2026-07-01", closedAt: "2026-07-01", category: "Preventive", description: "AC gas refill & cabin filter" },
];

// Completed-trip revenue, aggregated per vehicle (would normally come from the Trips service).
const TRIP_REVENUE_BY_VEHICLE = {
  "VAN-05": 118000,
  "TRUCK-11": 96000,
  "MINI-03": 54000,
  "VAN-12": 132000,
  "TRUCK-07": 261000,
  "SEDAN-02": 88000,
};

const MONTHLY_REVENUE_EXPENSE = [
  { period: "Feb", revenue: 210000, expenses: 148000 },
  { period: "Mar", revenue: 238000, expenses: 165000 },
  { period: "Apr", revenue: 226000, expenses: 171000 },
  { period: "May", revenue: 257000, expenses: 179000 },
  { period: "Jun", revenue: 271000, expenses: 188000 },
  { period: "Jul", revenue: 289000, expenses: 194000 },
];

const MONTHLY_EXPENSE_TREND = MONTHLY_REVENUE_EXPENSE.map((m) => ({ month: m.period, expense: m.expenses }));

/* -------------------------------------------------------------------------- */
/*  Derived helpers                                                            */
/* -------------------------------------------------------------------------- */

function vehicleLookup(id) {
  return VEHICLES.find((v) => v.id === id);
}

function totalsByVehicle() {
  const map = {};
  VEHICLES.forEach((v) => {
    map[v.id] = { fuel: 0, maintenance: 0, other: 0 };
  });
  FUEL_LOGS.forEach((f) => {
    if (map[f.vehicleId]) map[f.vehicleId].fuel += f.totalCost;
  });
  MAINTENANCE_LOGS.forEach((m) => {
    if (map[m.vehicleId]) map[m.vehicleId].maintenance += m.cost;
  });
  EXPENSES.forEach((e) => {
    if (map[e.vehicleId]) map[e.vehicleId].other += e.amount;
  });
  return map;
}

/* -------------------------------------------------------------------------- */
/*  Public API — Dashboard                                                     */
/* -------------------------------------------------------------------------- */

export async function getDashboardSummary() {
  await delay();

  const totals = totalsByVehicle();
  const totalRevenue = Object.values(TRIP_REVENUE_BY_VEHICLE).reduce((s, v) => s + v, 0);
  const totalFuel = Object.values(totals).reduce((s, t) => s + t.fuel, 0);
  const totalMaintenance = Object.values(totals).reduce((s, t) => s + t.maintenance, 0);
  const totalOther = Object.values(totals).reduce((s, t) => s + t.other, 0);
  const totalOperationalCost = totalFuel + totalMaintenance + totalOther;
  const netProfit = totalRevenue - totalOperationalCost;
  const netMargin = totalRevenue ? (netProfit / totalRevenue) * 100 : 0;

  // Rough distance estimate from odometer deltas, used only for cost/km KPI.
  const totalDistance = FUEL_LOGS.reduce((s, f) => s + (f.odometer - f.prevOdometer), 0);
  const costPerKm = totalDistance ? totalOperationalCost / totalDistance : 0;

  const kpis = [
    { label: "Total Revenue", value: totalRevenue, changePercent: 6.4, icon: "revenue" },
    { label: "Total Operational Cost", value: totalOperationalCost, changePercent: 3.1, icon: "expenses" },
    { label: "Net Profit", value: netProfit, changePercent: netMargin, icon: "profit" },
    { label: "Avg. Cost / Km", value: Math.round(costPerKm), changePercent: -2.2, icon: "efficiency" },
  ];

  const expenseBreakdownData = [
    { name: "Fuel", value: totalFuel },
    { name: "Maintenance", value: totalMaintenance },
    { name: "Tolls", value: EXPENSES.filter((e) => e.type === "Toll").reduce((s, e) => s + e.amount, 0) },
    { name: "Permits", value: EXPENSES.filter((e) => e.type === "Permit").reduce((s, e) => s + e.amount, 0) },
    { name: "Fines", value: EXPENSES.filter((e) => e.type === "Fine").reduce((s, e) => s + e.amount, 0) },
    { name: "Other", value: EXPENSES.filter((e) => e.type === "Other").reduce((s, e) => s + e.amount, 0) },
  ].filter((d) => d.value > 0);

  const costIntensiveVehicles = VEHICLES.map((v) => ({
    name: v.id,
    cost: totals[v.id].fuel + totals[v.id].maintenance + totals[v.id].other,
  }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  return {
    kpis,
    revenueExpenseData: MONTHLY_REVENUE_EXPENSE,
    monthlyExpenseTrendData: MONTHLY_EXPENSE_TREND,
    expenseBreakdownData,
    costIntensiveVehicles,
    netMargin,
  };
}

/* -------------------------------------------------------------------------- */
/*  Public API — Expense Management                                           */
/* -------------------------------------------------------------------------- */

export async function getExpenses({ search = "", type = "All", from, to } = {}) {
  await delay();
  let rows = EXPENSES.map((e) => ({ ...e, vehicle: vehicleLookup(e.vehicleId) }));

  if (type !== "All") rows = rows.filter((r) => r.type === type);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.vehicleId.toLowerCase().includes(q) ||
        r.tripId.toLowerCase().includes(q) ||
        r.note.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }
  if (from) rows = rows.filter((r) => new Date(r.date) >= new Date(from));
  if (to) rows = rows.filter((r) => new Date(r.date) <= new Date(to));

  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function logExpense(payload) {
  await delay(250);
  const entry = {
    id: `EXP-${2000 + EXPENSES.length + 1}`,
    date: new Date().toISOString(),
    loggedBy: "Raven K.",
    ...payload,
    amount: Number(payload.amount),
  };
  EXPENSES.unshift(entry);
  return entry;
}

/* -------------------------------------------------------------------------- */
/*  Public API — Fuel & Consumption                                           */
/* -------------------------------------------------------------------------- */

export async function getFuelLogs({ search = "" } = {}) {
  await delay();
  let rows = FUEL_LOGS.map((f) => {
    const vehicle = vehicleLookup(f.vehicleId);
    const efficiency = calculateFuelEfficiency(f.odometer - f.prevOdometer, f.liters);
    const baseline = FUEL_BASELINE_BY_TYPE[vehicle?.type] ?? null;
    return {
      ...f,
      vehicle,
      pricePerLiter: calculatePricePerLiter(f.totalCost, f.liters),
      efficiency,
      baseline,
      isOutlier: isFuelOutlier(efficiency, baseline),
    };
  });

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((r) => r.vehicleId.toLowerCase().includes(q) || r.tripId.toLowerCase().includes(q));
  }

  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getFuelSummary() {
  const rows = await getFuelLogs();
  const totalExpenditure = rows.reduce((s, r) => s + r.totalCost, 0);
  const totalLiters = rows.reduce((s, r) => s + r.liters, 0);
  const avgEfficiency = rows.length
    ? rows.reduce((s, r) => s + (r.efficiency || 0), 0) / rows.filter((r) => r.efficiency !== null).length
    : 0;
  const avgPricePerLiter = totalLiters ? totalExpenditure / totalLiters : 0;

  return [
    { label: "Total Fuel Expenditure", value: totalExpenditure, icon: "expenses" },
    { label: "Total Liters Consumed", value: `${formatLiters(totalLiters)} L`, icon: "efficiency" },
    { label: "Avg. Fuel Efficiency", value: `${avgEfficiency.toFixed(1)} km/L`, icon: "revenue" },
    { label: "Avg. Price / Liter", value: avgPricePerLiter, icon: "profit" },
  ];
}

function formatLiters(n) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

export async function logFuelPurchase(payload) {
  await delay(250);
  const prev = [...FUEL_LOGS].reverse().find((f) => f.vehicleId === payload.vehicleId);
  const entry = {
    id: `FL-${1000 + FUEL_LOGS.length + 1}`,
    prevOdometer: prev ? prev.odometer : Number(payload.odometer) - 0,
    ...payload,
    liters: Number(payload.liters),
    totalCost: Number(payload.totalCost),
    odometer: Number(payload.odometer),
  };
  FUEL_LOGS.unshift(entry);
  return entry;
}

/* -------------------------------------------------------------------------- */
/*  Public API — Maintenance Costs                                            */
/* -------------------------------------------------------------------------- */

export async function getMaintenanceLogs({ search = "", status = "All" } = {}) {
  await delay();
  let rows = MAINTENANCE_LOGS.map((m) => ({ ...m, vehicle: vehicleLookup(m.vehicleId) }));

  if (status !== "All") rows = rows.filter((r) => r.status === status);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (r) => r.vehicleId.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
  }

  return rows.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

export async function getMaintenanceSummary() {
  const rows = await getMaintenanceLogs();
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const preventive = rows.filter((r) => r.category === "Preventive").reduce((s, r) => s + r.cost, 0);
  const corrective = rows.filter((r) => r.category === "Corrective").reduce((s, r) => s + r.cost, 0);

  const closedDurations = rows
    .filter((r) => r.status === "Closed" && r.closedAt)
    .map((r) => (new Date(r.closedAt) - new Date(r.startedAt)) / (1000 * 60 * 60 * 24));
  const avgDowntime = closedDurations.length
    ? closedDurations.reduce((s, d) => s + d, 0) / closedDurations.length
    : 0;

  return { totalCost, preventive, corrective, avgDowntime, rows };
}

/* -------------------------------------------------------------------------- */
/*  Public API — Vehicle ROI & Profitability                                  */
/* -------------------------------------------------------------------------- */

export async function getRoiAnalysis() {
  await delay();
  const totals = totalsByVehicle();

  return VEHICLES.map((v) => {
    const t = totals[v.id];
    const tripRevenue = TRIP_REVENUE_BY_VEHICLE[v.id] ?? 0;
    const netProfit = calculateNetProfit({
      tripRevenue,
      maintenanceCost: t.maintenance,
      fuelCost: t.fuel,
      otherExpenses: t.other,
    });
    const roi = calculateROI({
      tripRevenue,
      maintenanceCost: t.maintenance,
      fuelCost: t.fuel,
      otherExpenses: t.other,
      acquisitionCost: v.acquisitionCost,
    });

    return {
      vehicleId: v.id,
      model: v.model,
      type: v.type,
      status: v.status,
      acquisitionCost: v.acquisitionCost,
      tripRevenue,
      fuelCost: t.fuel,
      maintenanceCost: t.maintenance,
      otherExpenses: t.other,
      netProfit,
      roi,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  CSV export utility                                                        */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Public API — Fuel & Expense Management (combined page 6)                  */
/* -------------------------------------------------------------------------- */

/** Combined KPI row for the Fuel & Expense Management screen. */
export async function getFuelExpenseSummary() {
  await delay();
  const fuelRows = await getFuelLogs();
  const totalFuelCost = fuelRows.reduce((s, r) => s + r.totalCost, 0);
  const totalOtherExpenses = EXPENSES.reduce((s, e) => s + e.amount, 0);
  const totalMaintenance = MAINTENANCE_LOGS.reduce((s, m) => s + m.cost, 0);
  const totalOperationalCost = totalFuelCost + totalOtherExpenses + totalMaintenance;

  return {
    totalFuelCost,
    totalOtherExpenses,
    totalMaintenance,
    totalOperationalCost,
  };
}

/* -------------------------------------------------------------------------- */
/*  Public API — Reports & Analytics (combined page 7)                        */
/* -------------------------------------------------------------------------- */

/** Combined KPI + chart payload for the Reports & Analytics screen. */
export async function getAnalyticsSummary() {
  await delay();

  const fuelRows = await getFuelLogs();
  const avgFuelEfficiency = fuelRows.length
    ? fuelRows.filter((r) => r.efficiency !== null).reduce((s, r) => s + r.efficiency, 0) /
      (fuelRows.filter((r) => r.efficiency !== null).length || 1)
    : 0;

  const onTripOrShop = VEHICLES.filter((v) => v.status === "On Trip" || v.status === "In Shop").length;
  const fleetUtilization = VEHICLES.length ? (onTripOrShop / VEHICLES.length) * 100 : 0;

  const totals = totalsByVehicle();
  const totalFuel = Object.values(totals).reduce((s, t) => s + t.fuel, 0);
  const totalMaintenance = Object.values(totals).reduce((s, t) => s + t.maintenance, 0);
  const totalOther = Object.values(totals).reduce((s, t) => s + t.other, 0);
  const totalOperationalCost = totalFuel + totalMaintenance + totalOther;

  const roiRows = await getRoiAnalysis();
  const validRoi = roiRows.filter((r) => r.roi !== null);
  const avgRoi = validRoi.length ? validRoi.reduce((s, r) => s + r.roi, 0) / validRoi.length : 0;

  const costIntensiveVehicles = VEHICLES.map((v) => ({
    name: v.id,
    cost: totals[v.id].fuel + totals[v.id].maintenance + totals[v.id].other,
  }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  return {
    kpis: {
      fuelEfficiency: avgFuelEfficiency,
      fleetUtilization,
      operationalCost: totalOperationalCost,
      vehicleRoi: avgRoi,
    },
    monthlyRevenueData: MONTHLY_REVENUE_EXPENSE.map((m) => ({ period: m.period, revenue: m.revenue })),
    costIntensiveVehicles,
    roiRows,
  };
}

export function exportToCsv(filename, rows, columns) {
  if (!rows || rows.length === 0) return;

  const cols = columns || Object.keys(rows[0]).map((key) => ({ key, header: key }));
  const escapeCell = (value) => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = cols.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((row) => cols.map((c) => escapeCell(typeof c.accessor === "function" ? c.accessor(row) : row[c.key])).join(","))
    .join("\n");

  const csvContent = `${header}\n${body}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const VEHICLE_OPTIONS = VEHICLES.map((v) => ({ value: v.id, label: `${v.id} — ${v.model}` }));
export const TRIP_OPTIONS = FUEL_LOGS.map((f) => f.tripId).filter((v, i, arr) => arr.indexOf(v) === i);
