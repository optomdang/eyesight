import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAutocompleteOptions } from './useAutocompleteOptions';

describe('useAutocompleteOptions - Real Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return mapped options after fetch completes', async () => {
    const mockFetchFn = vi.fn().mockResolvedValue({
      rows: [
        { id: 1, code: 'DT001', name: 'Doctor A' },
        { id: 2, code: 'DT002', name: 'Doctor B' },
      ],
    });

    const mockMapToOption = vi.fn((item) => ({
      value: item.id,
      label: `${item.code} - ${item.name}`,
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

    // Verify options are mapped correctly
    expect(result.current.options).toHaveLength(2);
    expect(result.current.options[0]).toEqual({
      value: 1,
      label: 'DT001 - Doctor A',
    });
    expect(result.current.options[1]).toEqual({
      value: 2,
      label: 'DT002 - Doctor B',
    });

    // Verify mapToOption was called for each item
    expect(mockMapToOption).toHaveBeenCalledTimes(2);
  });

  it('should update options when search is called', async () => {
    const mockFetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ id: 1, code: 'DT001', name: 'Doctor A' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 2, code: 'DT002', name: 'Doctor Dai' }],
      });

    const mockMapToOption = vi.fn((item) => ({
      value: item.id,
      label: `${item.code} - ${item.name}`,
    }));

    const { result } = renderHook(() =>
      useAutocompleteOptions({
        fetchFn: mockFetchFn,
        mapToOption: mockMapToOption,
        searchOnMount: true,
        initialSearch: '',
        debounceMs: 100,
      })
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.options).toHaveLength(1);
    expect(result.current.options[0].label).toBe('DT001 - Doctor A');

    // Trigger search
    act(() => {
      result.current.search('dai');
    });

    // Wait for debounce + fetch
    await waitFor(
      () => {
        expect(mockFetchFn).toHaveBeenCalledWith('dai');
      },
      { timeout: 500 }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify options updated
    expect(result.current.options).toHaveLength(1);
    expect(result.current.options[0].label).toBe('DT002 - Doctor Dai');
  });

  it('should handle empty results', async () => {
    const mockFetchFn = vi.fn().mockResolvedValue({
      rows: [],
    });

    const mockMapToOption = vi.fn();

    const { result } = renderHook(() =>
      useAutocompleteOptions({
        fetchFn: mockFetchFn,
        mapToOption: mockMapToOption,
        searchOnMount: true,
        initialSearch: 'nonexistent',
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.options).toEqual([]);
    expect(mockMapToOption).not.toHaveBeenCalled();
  });

  it('should prove options are available for autocomplete', async () => {
    // This test proves that the hook returns options that can be used by autocomplete
    const realDoctorData = {
      rows: [
        { id: 5, code: 'DT26013086C', user: { name: 'Lê Trọng Đại' } },
        { id: 1, code: 'DT260119E0L', user: { name: 'Bác sĩ Nguyễn Văn A' } },
      ],
    };

    const mockFetchFn = vi.fn().mockResolvedValue(realDoctorData);

    const mockMapToOption = (doctor: any) => ({
      value: doctor.id || 0,
      label: `${doctor.code} - ${doctor.user?.name || 'N/A'}`,
    });

    const { result } = renderHook(() =>
      useAutocompleteOptions({
        fetchFn: mockFetchFn,
        mapToOption: mockMapToOption,
        searchOnMount: true,
        initialSearch: '',
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // PROOF: Options are available and correctly formatted
    expect(result.current.options).toHaveLength(2);

    const option1 = result.current.options.find((opt) => opt.value === 5);
    expect(option1).toBeDefined();
    expect(option1?.label).toBe('DT26013086C - Lê Trọng Đại');

    const option2 = result.current.options.find((opt) => opt.value === 1);
    expect(option2).toBeDefined();
    expect(option2?.label).toBe('DT260119E0L - Bác sĩ Nguyễn Văn A');

    // PROOF: These options can be passed to MUI Autocomplete
    // MUI Autocomplete expects: Array<{ value: any, label: string }>
    result.current.options.forEach((option) => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(typeof option.label).toBe('string');
    });
  });
});
