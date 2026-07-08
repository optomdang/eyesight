import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { act } from 'react';
import { useDataTable } from 'src/contexts/data-context/useDataTable';
import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';
import { ConfirmProvider } from 'src/hooks/useConfirm';
import * as request from 'src/utils/request';

// Mock dependencies
vi.mock('src/utils/request');
vi.mock('src/contexts/UseSnackbar', () => ({
  default: () => ({
    showSnackbar: vi.fn(),
  }),
}));

describe('useDataTable Hook', () => {
  const mockData = {
    rows: [
      { id: 1, code: 'P001', name: 'Patient 1' },
      { id: 2, code: 'P002', name: 'Patient 2' },
    ],
    count: 2,
    totalPages: 1,
    page: 1,
    limit: 10,
  };

  // Wrapper component for providing context (ConfirmProvider required by DataTableContext)
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      ConfirmProvider,
      {},
      React.createElement(DataTableProvider, { endpoint: 'patients', children })
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchData', () => {
    it('should fetch data successfully', async () => {
      // Arrange
      vi.spyOn(request, 'getDataTable').mockResolvedValue(mockData);
      const { result } = renderHook(() => useDataTable(), { wrapper });

      // Act
      await act(async () => {
        await result.current.fetchData();
      });

      // Assert
      await waitFor(() => {
        expect(result.current.dataRes.rows).toHaveLength(2);
        expect(result.current.dataRes.count).toBe(2);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle fetch error', async () => {
      // Arrange
      const error = new Error('Network error');
      vi.spyOn(request, 'getDataTable').mockRejectedValue(error);
      const { result } = renderHook(() => useDataTable(), { wrapper });

      // Act
      await act(async () => {
        try {
          await result.current.fetchData();
        } catch (e) {
          // Expected error
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.dataRes.rows).toHaveLength(0);
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('createData', () => {
    it('should create data successfully', async () => {
      // Arrange
      const newPatient = { code: 'P003', name: 'Patient 3' };
      vi.spyOn(request, 'postData').mockResolvedValue({ id: 3, ...newPatient });
      vi.spyOn(request, 'getDataTable').mockResolvedValue(mockData);

      const { result } = renderHook(() => useDataTable(), { wrapper });

      // Act
      await act(async () => {
        await result.current.createData(newPatient);
      });

      // Assert
      expect(request.postData).toHaveBeenCalledWith('patients', newPatient);
    });
  });

  describe('updateData', () => {
    it('should update data successfully', async () => {
      // Arrange
      const updatedData = { id: 1, code: 'P001', name: 'Updated Patient' };
      vi.spyOn(request, 'patchData').mockResolvedValue(updatedData);
      vi.spyOn(request, 'getDataTable').mockResolvedValue(mockData);

      const { result } = renderHook(() => useDataTable(), { wrapper });

      // Act
      await act(async () => {
        await result.current.updateData(1, { name: 'Updated Patient' });
      });

      // Assert
      expect(request.patchData).toHaveBeenCalledWith('patients/1', {
        name: 'Updated Patient',
      });
    });
  });

  describe('removeData', () => {
    it('should delete data successfully', async () => {
      // Arrange
      vi.spyOn(request, 'deleteData').mockResolvedValue({});
      vi.spyOn(request, 'getDataTable').mockResolvedValue(mockData);

      const { result } = renderHook(() => useDataTable(), { wrapper });

      // Act
      await act(async () => {
        await result.current.removeData(1);
      });

      // Assert
      expect(request.deleteData).toHaveBeenCalledWith('patients/1');
    });
  });

  describe('searchData', () => {
    it('should search with filters and reset to page 0', async () => {
      // Arrange
      const filteredData = { ...mockData, count: 1, rows: [mockData.rows[0]] };
      vi.spyOn(request, 'getDataTable').mockResolvedValue(filteredData);

      const { result } = renderHook(() => useDataTable(), { wrapper });

      // Act
      await act(async () => {
        await result.current.searchData({ code: 'P001' });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.dataRes.rows).toHaveLength(1);
        expect(result.current.tableState.page).toBe(0);
      });
    });
  });

  describe('onTableChange', () => {
    it('should handle page change', async () => {
      // Arrange
      vi.spyOn(request, 'getDataTable').mockResolvedValue(mockData);
      const { result } = renderHook(() => useDataTable(), { wrapper });

      // Act
      await act(async () => {
        result.current.onTableChange('changePage', { page: 1, rowsPerPage: 10 } as any);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.tableState.page).toBe(1);
      });
    });

    it('should handle sort change', async () => {
      // Arrange
      vi.spyOn(request, 'getDataTable').mockResolvedValue(mockData);
      const { result } = renderHook(() => useDataTable(), { wrapper });

      // Act
      await act(async () => {
        result.current.onTableChange('sort', {
          page: 0,
          rowsPerPage: 10,
          sortOrder: { name: 'code', direction: 'desc' },
        } as any);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.tableState.sortOrder).toEqual({
          name: 'code',
          direction: 'desc',
        });
      });
    });
  });
});
