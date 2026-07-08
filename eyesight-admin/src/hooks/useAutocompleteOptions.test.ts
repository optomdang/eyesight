import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAutocompleteOptions } from './useAutocompleteOptions';

describe('useAutocompleteOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fetch and map options on mount when searchOnMount is true', async () => {
    const mockFetchFn = vi.fn().mockResolvedValue({
      rows: [
        { id: 1, name: 'Doctor A' },
        { id: 2, name: 'Doctor B' },
      ],
    });

    const mockMapToOption = vi.fn((item) => ({
      value: item.id,
      label: item.name,
    }));

    const { result } = renderHook(() =>
      useAutocompleteOptions({
        fetchFn: mockFetchFn,
        mapToOption: mockMapToOption,
        searchOnMount: true,
        initialSearch: '',
      })
    );

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.options).toEqual([]);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check results
    expect(mockFetchFn).toHaveBeenCalledWith('');
    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    expect(mockMapToOption).toHaveBeenCalledTimes(2);
    expect(result.current.options).toEqual([
      { value: 1, label: 'Doctor A' },
      { value: 2, label: 'Doctor B' },
    ]);
  });

  it('should not fetch on mount when searchOnMount is false', async () => {
    const mockFetchFn = vi.fn().mockResolvedValue({ rows: [] });
    const mockMapToOption = vi.fn();

    const { result } = renderHook(() =>
      useAutocompleteOptions({
        fetchFn: mockFetchFn,
        mapToOption: mockMapToOption,
        searchOnMount: false,
      })
    );

    // Should not be loading
    expect(result.current.loading).toBe(false);
    expect(mockFetchFn).not.toHaveBeenCalled();
  });

  it('should handle search with debounce', async () => {
    vi.useFakeTimers();

    const mockFetchFn = vi.fn().mockResolvedValue({
      rows: [{ id: 1, name: 'Doctor Dai' }],
    });

    const mockMapToOption = vi.fn((item) => ({
      value: item.id,
      label: item.name,
    }));

    const { result } = renderHook(() =>
      useAutocompleteOptions({
        fetchFn: mockFetchFn,
        mapToOption: mockMapToOption,
        searchOnMount: false,
        debounceMs: 300,
      })
    );

    // Trigger search
    result.current.search('dai');

    // Should not call immediately
    expect(mockFetchFn).not.toHaveBeenCalled();

    // Advance all timers and wait for async operations
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockFetchFn).toHaveBeenCalledWith('dai');
    expect(result.current.options).toEqual([{ value: 1, label: 'Doctor Dai' }]);
    expect(result.current.loading).toBe(false);
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockFetchFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const mockMapToOption = vi.fn();

    const { result } = renderHook(() =>
      useAutocompleteOptions({
        fetchFn: mockFetchFn,
        mapToOption: mockMapToOption,
        searchOnMount: true,
        initialSearch: 'test',
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.options).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching autocomplete options:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should cancel previous debounced search when new search is triggered', async () => {
    vi.useFakeTimers();

    const mockFetchFn = vi.fn().mockResolvedValue({ rows: [] });
    const mockMapToOption = vi.fn();

    const { result } = renderHook(() =>
      useAutocompleteOptions({
        fetchFn: mockFetchFn,
        mapToOption: mockMapToOption,
        searchOnMount: false,
        debounceMs: 300,
      })
    );

    // First search
    result.current.search('da');
    vi.advanceTimersByTime(100);

    // Second search (should cancel first)
    result.current.search('dai');

    // Advance all timers and wait for async operations
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Should only call with latest search term
    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    expect(mockFetchFn).toHaveBeenCalledWith('dai');
  });
});
