import { useState, useEffect, useRef } from 'react';

/**
 * Generic hook for fetching data from an async function
 * @template T - The type of data being fetched
 * @param asyncFn - Async function that returns data of type T
 * @param dependencies - Dependencies array for useEffect
 * @returns Object with data, loading, error, and refetch function
 */
export function useDataFetch<T>(asyncFn: () => Promise<T>, dependencies?: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const asyncFnRef = useRef(asyncFn);

  useEffect(() => {
    asyncFnRef.current = asyncFn;
  }, [asyncFn]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await asyncFnRef.current();
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFnRef.current();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    refetch,
  };
}
