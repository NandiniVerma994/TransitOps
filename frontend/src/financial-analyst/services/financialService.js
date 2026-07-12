import { api } from "../../api";

const unwrap = (response) => response?.data ?? response;

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "All") {
      search.append(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function getVehicleOptions() {
  return unwrap(await api.get("/api/financial/options/vehicles"));
}

export async function getTripOptions() {
  return unwrap(await api.get("/api/financial/options/trips"));
}

export async function getDashboardSummary() {
  return unwrap(await api.get("/api/financial/dashboard"));
}

export async function getExpenses({ search = "", type = "All", from, to } = {}) {
  return unwrap(await api.get(`/api/financial/expenses${queryString({ search, type, from, to })}`));
}

export async function logExpense(payload) {
  return unwrap(
    await api.post("/api/financial/expenses", {
      vehicle_id: payload.vehicleId,
      trip_id: payload.tripId || "",
      type: payload.type,
      amount: Number(payload.amount),
      note: payload.note,
    })
  );
}

export async function getFuelLogs({ search = "" } = {}) {
  return unwrap(await api.get(`/api/financial/fuel-logs${queryString({ search })}`));
}

export async function getFuelSummary() {
  return unwrap(await api.get("/api/financial/fuel-summary"));
}

export async function logFuelPurchase(payload) {
  return unwrap(
    await api.post("/api/financial/fuel-logs", {
      vehicle_id: payload.vehicleId,
      trip_id: payload.tripId || "",
      liters: Number(payload.liters),
      total_cost: Number(payload.totalCost),
      date: payload.date,
      odometer: Number(payload.odometer),
    })
  );
}

export async function getMaintenanceLogs({ search = "", status = "All" } = {}) {
  return unwrap(await api.get(`/api/financial/maintenance${queryString({ search, status })}`));
}

export async function getMaintenanceSummary() {
  return unwrap(await api.get("/api/financial/maintenance-summary"));
}

export async function getRoiAnalysis() {
  return unwrap(await api.get("/api/financial/roi"));
}

export async function getFuelExpenseSummary() {
  return unwrap(await api.get("/api/financial/fuel-expense-summary"));
}

export async function getAnalyticsSummary() {
  return unwrap(await api.get("/api/financial/analytics"));
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

export const VEHICLE_OPTIONS = [];
export const TRIP_OPTIONS = [];
