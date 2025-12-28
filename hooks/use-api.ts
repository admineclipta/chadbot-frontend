"use client";

import { useState, useEffect } from "react";
import { ApiError } from "@/lib/api";

export function useApi<T>(apiCall: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiCall();

        if (isMounted) {
          setData(result);
        }
      } catch (err) {
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

    // Agregar un pequeño debounce para evitar llamadas excesivas
    timeoutId = setTimeout(() => {
      fetchData();
    }, 10);

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, dependencies);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
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
