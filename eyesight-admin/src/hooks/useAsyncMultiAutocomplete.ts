import { useState, useCallback, useRef } from 'react';

interface UseAsyncMultiAutocompleteProps<T> {
  /** Async function to fetch items by search term */
  fetchFn: (searchTerm: string) => Promise<{ rows: T[] }>;
  /** Map raw item to { value, label } for display */
  mapToOption: (item: T) => { value: number; label: string };
  /** Get unique ID from raw item (for deduplication) */
  getItemId: (item: T) => number;
  /** Minimum characters before triggering search (default: 2) */
  minChars?: number;
  /** Debounce delay in ms (default: 400) */
  debounceMs?: number;
}

interface UseAsyncMultiAutocompleteReturn<T> {
  /** Current options for the Autocomplete dropdown */
  options: Array<{ value: number; label: string }>;
  /** Whether a search request is in-flight */
  loading: boolean;
  /** Currently selected raw items */
  selectedItems: T[];
  /** Options derived from currently selected items (for Autocomplete value) */
  selectedOptions: Array<{ value: number; label: string }>;
  /** Call on MUI Autocomplete onInputChange — handles reason filtering + debounce */
  handleInputChange: (inputValue: string, reason: string) => void;
  /** Call on MUI Autocomplete onChange — syncs selected items + options */
  handleChange: (newValue: Array<{ value: number; label: string }>) => void;
  /** Reset all state (e.g. on dialog close) */
  reset: () => void;
  /** Find raw item by id from internal list */
  findItem: (id: number) => T | undefined;
  /** Fetch initial records (e.g. on dialog open) */
  initialFetch: () => void;
}

/**
 * Hook for async multi-select Autocomplete with:
 * - Debounced server-side search
 * - Selected items preserved across searches
 * - Reason-based input filtering (only 'input' triggers search)
 * - Stale request cancellation
 */
export function useAsyncMultiAutocomplete<T>({
  fetchFn,
  mapToOption,
  getItemId,
  minChars = 2,
  debounceMs = 400,
}: UseAsyncMultiAutocompleteProps<T>): UseAsyncMultiAutocompleteReturn<T> {
  const [options, setOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  /** Full list of items (selected + search results) for reverse-lookup */
  const itemsRef = useRef<T[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const latestRequestRef = useRef(0);

  // Keep refs for unstable callbacks
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;
  const mapToOptionRef = useRef(mapToOption);
  mapToOptionRef.current = mapToOption;
  const getItemIdRef = useRef(getItemId);
  getItemIdRef.current = getItemId;

  const doSearch = useCallback(async (term: string, currentSelected: T[]) => {
    const requestId = ++latestRequestRef.current;
    setLoading(true);

    try {
      const response = await fetchFnRef.current(term);

      if (!mountedRef.current || requestId !== latestRequestRef.current) return;

      // Merge: keep selected items + add new search results (deduplicated)
      const selectedIds = new Set(currentSelected.map(getItemIdRef.current));
      const newItems = response.rows.filter((item) => !selectedIds.has(getItemIdRef.current(item)));
      const merged = [...currentSelected, ...newItems];

      itemsRef.current = merged;
      setOptions(merged.map(mapToOptionRef.current));
    } catch (error) {
      console.error('useAsyncMultiAutocomplete search error:', error);
      if (mountedRef.current && requestId === latestRequestRef.current) {
        // Keep selected items as options even on error
        setOptions(currentSelected.map(mapToOptionRef.current));
      }
    } finally {
      if (mountedRef.current && requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleInputChange = useCallback(
    (inputValue: string, reason: string) => {
      // Only search on actual user typing
      if (reason !== 'input') return;

      if (timerRef.current) clearTimeout(timerRef.current);

      if (inputValue.trim().length < minChars) {
        setOptions((prev) => {
          // When input cleared, show only selected items as options
          const selectedIds = new Set(selectedItems.map(getItemIdRef.current));
          return prev.filter((opt) => selectedIds.has(opt.value));
        });
        return;
      }

      timerRef.current = setTimeout(() => {
        // Read latest selectedItems via closure
        setSelectedItems((current) => {
          doSearch(inputValue, current);
          return current;
        });
      }, debounceMs);
    },
    [doSearch, debounceMs, minChars, selectedItems]
  );

  const handleChange = useCallback((newValue: Array<{ value: number; label: string }>) => {
    const newSelectedIds = new Set(newValue.map((v) => v.value));
    const selected = itemsRef.current.filter((item) =>
      newSelectedIds.has(getItemIdRef.current(item))
    );
    setSelectedItems(selected);
  }, []);

  const selectedOptions = selectedItems.map(mapToOption);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOptions([]);
    setSelectedItems([]);
    setLoading(false);
    itemsRef.current = [];
    latestRequestRef.current = 0;
  }, []);

  const findItem = useCallback((id: number) => {
    return itemsRef.current.find((item) => getItemIdRef.current(item) === id);
  }, []);

  /** Fetch initial records with empty search term (useful for pre-loading on dialog open) */
  const initialFetch = useCallback(() => {
    setSelectedItems((current) => {
      doSearch('', current);
      return current;
    });
  }, [doSearch]);

  return {
    options,
    loading,
    selectedItems,
    selectedOptions,
    handleInputChange,
    handleChange,
    reset,
    findItem,
    initialFetch,
  };
}
