import { useMemo, useState } from "react";
import { isDecommissionCandidate, sortRows } from "../utils/financeHelpers";

/**
 * useRoiCalculations
 *
 * Takes the raw per-vehicle financial rows returned by
 * financialService.getRoiAnalysis() and layers on:
 *  - decommission-candidate flagging
 *  - status/search filtering
 *  - sortable "ROI leaderboard" ordering
 *
 * @param {Array<Object>} rows - raw ROI rows (vehicleId, acquisitionCost, tripRevenue, ...)
 */
export function useRoiCalculations(rows = []) {
  const [sortKey, setSortKey] = useState("roi");
  const [sortDirection, setSortDirection] = useState("desc");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const enriched = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        isDecommissionCandidate: isDecommissionCandidate({
          maintenanceCost: r.maintenanceCost,
          fuelCost: r.fuelCost,
          acquisitionCost: r.acquisitionCost,
          netProfit: r.netProfit,
        }),
      })),
    [rows]
  );

  const filtered = useMemo(() => {
    let result = enriched;
    if (statusFilter !== "All") result = result.filter((r) => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.vehicleId.toLowerCase().includes(q) || r.model.toLowerCase().includes(q));
    }
    return result;
  }, [enriched, statusFilter, search]);

  const sorted = useMemo(() => sortRows(filtered, sortKey, sortDirection), [filtered, sortKey, sortDirection]);

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const aggregates = useMemo(() => {
    const totalNetProfit = enriched.reduce((s, r) => s + (r.netProfit || 0), 0);
    const decommissionCandidates = enriched.filter((r) => r.isDecommissionCandidate).length;
    const bestPerformer = [...enriched].sort((a, b) => (b.roi ?? -Infinity) - (a.roi ?? -Infinity))[0] || null;
    const avgRoi = enriched.length
      ? enriched.reduce((s, r) => s + (r.roi || 0), 0) / enriched.length
      : 0;
    return { totalNetProfit, decommissionCandidates, bestPerformer, avgRoi };
  }, [enriched]);

  return {
    rows: sorted,
    sortKey,
    sortDirection,
    toggleSort,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    aggregates,
  };
}

export default useRoiCalculations;
