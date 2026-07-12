import { useEffect, useRef, useState } from "react";

/**
 * useFinancialData
 *
 * Generic async data-loading hook shared across all Financial Analyst pages.
 * Wraps any service call (dashboard summary, expenses, fuel logs, etc.) with
 * loading / error state and a `refetch` handle so pages can re-pull data
 * after a modal mutation (e.g. logging a new expense) without a full reload.
 *
 * @param {() => Promise<any>} fetcher - async function returning the data
 * @param {Array<any>} deps - dependency array, same semantics as useEffect
 * @param {{ initialData?: any }} [options]
 */
export function useFinancialData(fetcher, deps = [], options = {}) {
  const { initialData = null } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  // Keep the latest fetcher in a ref so `load`/`refetch` always call the
  // current closure without needing a useCallback dependency array built
  // from a variable-length `deps` argument (not allowed by the linter).
  // Synced in its own effect (not during render) to satisfy react-hooks/refs.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (isMounted.current) setData(result);
    } catch (err) {
      if (isMounted.current) setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    // Data fetching on mount/dep-change is an intentional side effect that
    // syncs component state with the (mock) backend service.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: load };
}

export default useFinancialData;
