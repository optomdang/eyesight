import { useState, useCallback, useEffect, useRef } from 'react';
import { SelectOptions } from 'src/types/core';

interface UseAutocompleteOptionsProps<T> {
  fetchFn: (searchTerm: string) => Promise<{ rows: T[] }>;
  mapToOption: (item: T) => SelectOptions;
  searchOnMount?: boolean;
  initialSearch?: string;
  debounceMs?: number;
  initialData?: T[]; // Add initial data support
}

interface UseAutocompleteOptionsReturn {
  options: SelectOptions[];
  loading: boolean;
  search: (term: string) => void;
}

/**
 * Hook for autocomplete with debounced search
 * @param fetchFn - Function to fetch data with search term
 * @param mapToOption - Function to map data item to SelectOptions
 * @param searchOnMount - Whether to fetch initial data on mount
 * @param initialSearch - Initial search term (default: '')
 * @param debounceMs - Debounce delay in ms (default: 300)
 */
export function useAutocompleteOptions<T>({
  fetchFn,
  mapToOption,
  searchOnMount = true,
  initialSearch = '',
  debounceMs = 300,
  initialData = [],
}: UseAutocompleteOptionsProps<T>): UseAutocompleteOptionsReturn {
  const [options, setOptions] = useState<SelectOptions[]>(() => {
    // Set initial options if initialData is provided
    return initialData.map(mapToOption);
  });
  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const latestRequestIdRef = useRef(0);

  // Use refs for fetchFn/mapToOption to avoid dependency chain issues
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;
  const mapToOptionRef = useRef(mapToOption);
  mapToOptionRef.current = mapToOption;

  const fetchOptions = useCallback(
    async (searchTerm: string) => {
      const currentRequestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = currentRequestId;

      setLoading(true);

      try {
        const response = await fetchFnRef.current(searchTerm);

        if (mountedRef.current && currentRequestId === latestRequestIdRef.current) {
          const mappedOptions = response.rows.map(mapToOptionRef.current);
          setOptions(mappedOptions);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching autocomplete options:', error);
        if (mountedRef.current && currentRequestId === latestRequestIdRef.current) {
          setOptions([]);
          setLoading(false);
        }
      }
    },
    [] // stable — reads latest fetchFn/mapToOption via refs
  );

  const search = useCallback(
    (term: string) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        fetchOptions(term);
      }, debounceMs);
    },
    [fetchOptions, debounceMs]
  );

  // Fetch initial data on mount only
  useEffect(() => {
    if (searchOnMount) {
      fetchOptions(initialSearch);
    }

    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  return { options, loading, search };
}
