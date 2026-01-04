"use client";

import { useState, useEffect } from "react";
import { ApiError } from "@/lib/api";

/**
 * Custom hook for data fetching with automatic cancellation on unmount or dependency changes.
 *
 * @param apiCall - Function that performs the API call, receives optional AbortSignal
 * @param dependencies - Array of dependencies that trigger re-fetch when changed
 * @param debounceMs - Debounce delay in milliseconds (default: 0 for immediate fetch)
 *
 * @example
 * // Immediate fetch
 * const { data, loading, error } = useApi(() => apiService.getUsers(), []);
 *
 * @example
 * // Search with 300ms debounce
 * const { data, loading } = useApi(
 *   (signal) => apiService.getContacts(0, 15, searchTerm, signal),
 *   [searchTerm],
 *   300
 * );
 */
export function useApi<T>(
  apiCall: (signal?: AbortSignal) => Promise<T>,
  dependencies: any[] = [],
  debounceMs: number = 0
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiCall(abortController.signal);

        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        // Ignore AbortError (intentional cancellation)
        if (err instanceof Error && err.name === "AbortError") {
          if (process.env.NODE_ENV === "development") {
            console.debug("[useApi] Request cancelled");
          }
          return;
        }

        if (isMounted) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError("Error al cargar los datos");
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Apply debounce if specified
    if (debounceMs > 0) {
      timeoutId = setTimeout(() => {
        fetchData();
      }, debounceMs);
    } else {
      fetchData();
    }

    return () => {
      isMounted = false;
      abortController.abort();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, dependencies);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      // refetch is intentional, so we don't cancel it with AbortController
      const result = await apiCall();
      setData(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al cargar los datos");
      }
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}
