/**
 * Unit Tests for usePatientStatus Hook
 * Tests patient treatment status checking for access control
 *
 * **Validates: Requirements 2.6, 2.7**
 * - 2.6: Frontend hook fetches patient status and handles errors
 * - 2.7: Hook provides loading states during API calls
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePatientStatus } from '../usePatientStatus';
import * as patientService from 'src/services/patient.service';
import type { PatientInfo } from 'src/types/core/patient';

// Mock the patient service
vi.mock('src/services/patient.service');

describe('usePatientStatus Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Active Patient Status (treatmentStatus = true)', () => {
    it('should return isActive=true for active patient', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'active',
        doctorId: 10,
        doctor: {
          name: 'Dr. Nguyen',
          phoneNumber: '0901234567',
        },
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Assert - Initial state
      expect(result.current.loading).toBe(true);
      expect(result.current.isActive).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.patientInfo).toBe(null);

      // Wait for async operation
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert - Final state
      expect(result.current.isActive).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.patientInfo).toEqual(mockPatientInfo);
      expect(patientService.getMyPatientInfo).toHaveBeenCalledTimes(1);
    });

    it('should set patientInfo with doctor details for active patient', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 2,
        code: 'P002',
        treatmentStatus: 'active',
        doctorId: 20,
        doctor: {
          name: 'Dr. Tran Van A',
          phoneNumber: '0912345678',
        },
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.patientInfo).toEqual(mockPatientInfo);
      expect(result.current.patientInfo?.doctor?.name).toBe('Dr. Tran Van A');
      expect(result.current.patientInfo?.doctor?.phoneNumber).toBe('0912345678');
    });
  });

  describe('Inactive Patient Status (treatmentStatus = false)', () => {
    it('should return isActive=false for inactive patient', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 3,
        code: 'P003',
        treatmentStatus: 'paused',
        doctorId: 30,
        doctor: {
          name: 'Dr. Le Thi B',
          phoneNumber: '0923456789',
        },
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.isActive).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.patientInfo).toEqual(mockPatientInfo);
      expect(patientService.getMyPatientInfo).toHaveBeenCalledTimes(1);
    });

    it('should provide doctor contact info for inactive patient', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 4,
        code: 'P004',
        treatmentStatus: 'paused',
        doctorId: 40,
        doctor: {
          name: 'Dr. Pham Van C',
          phoneNumber: '0934567890',
        },
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert - Doctor info should be available for InactivePage
      expect(result.current.patientInfo?.doctor).toBeDefined();
      expect(result.current.patientInfo?.doctor?.name).toBe('Dr. Pham Van C');
      expect(result.current.patientInfo?.doctor?.phoneNumber).toBe('0934567890');
    });

    it('should handle inactive patient without doctor phone number', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 5,
        code: 'P005',
        treatmentStatus: 'paused',
        doctorId: 50,
        doctor: {
          name: 'Dr. Hoang Van D',
          // phoneNumber is optional
        },
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.isActive).toBe(false);
      expect(result.current.patientInfo?.doctor?.name).toBe('Dr. Hoang Van D');
      expect(result.current.patientInfo?.doctor?.phoneNumber).toBeUndefined();
    });
  });

  describe('API Errors - Verify error state is set', () => {
    it('should set error state when API call fails', async () => {
      // Arrange
      const mockError = new Error('Network error');
      vi.mocked(patientService.getMyPatientInfo).mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Network error');
      expect(result.current.isActive).toBe(null);
      expect(result.current.patientInfo).toBe(null);
      expect(patientService.getMyPatientInfo).toHaveBeenCalledTimes(1);
    });

    it('should set default error message when error has no message', async () => {
      // Arrange
      vi.mocked(patientService.getMyPatientInfo).mockRejectedValue({});

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Không thể tải thông tin bệnh nhân');
      expect(result.current.isActive).toBe(null);
      expect(result.current.patientInfo).toBe(null);
    });

    it('should handle 401 Unauthorized error', async () => {
      // Arrange
      const mockError = new Error('Unauthorized');
      vi.mocked(patientService.getMyPatientInfo).mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Unauthorized');
      expect(result.current.isActive).toBe(null);
    });

    it('should handle 403 Forbidden error', async () => {
      // Arrange
      const mockError = new Error('Không có quyền truy cập');
      vi.mocked(patientService.getMyPatientInfo).mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Không có quyền truy cập');
      expect(result.current.isActive).toBe(null);
    });

    it('should handle 404 Not Found error', async () => {
      // Arrange
      const mockError = new Error('Bệnh nhân không tồn tại');
      vi.mocked(patientService.getMyPatientInfo).mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Bệnh nhân không tồn tại');
      expect(result.current.isActive).toBe(null);
    });

    it('should handle 500 Internal Server Error', async () => {
      // Arrange
      const mockError = new Error('Có lỗi xảy ra');
      vi.mocked(patientService.getMyPatientInfo).mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Có lỗi xảy ra');
      expect(result.current.isActive).toBe(null);
    });
  });

  describe('Loading States - Verify loading transitions', () => {
    it('should start with loading=true', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 6,
        code: 'P006',
        treatmentStatus: 'active',
        doctorId: 60,
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Assert - Initial state
      expect(result.current.loading).toBe(true);
    });

    it('should set loading=false after successful API call', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 7,
        code: 'P007',
        treatmentStatus: 'active',
        doctorId: 70,
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Assert - Initial loading
      expect(result.current.loading).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert - Final state
      expect(result.current.loading).toBe(false);
      expect(result.current.isActive).toBe(true);
    });

    it('should set loading=false after failed API call', async () => {
      // Arrange
      const mockError = new Error('API Error');
      vi.mocked(patientService.getMyPatientInfo).mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Assert - Initial loading
      expect(result.current.loading).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert - Final state
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('API Error');
    });

    it('should transition loading state correctly: true -> false', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 8,
        code: 'P008',
        treatmentStatus: 'paused',
        doctorId: 80,
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Assert - Track loading state transitions
      const loadingStates: boolean[] = [result.current.loading];

      await waitFor(() => {
        if (result.current.loading !== loadingStates[loadingStates.length - 1]) {
          loadingStates.push(result.current.loading);
        }
        expect(result.current.loading).toBe(false);
      });

      // Assert - Should transition from true to false
      expect(loadingStates[0]).toBe(true);
      expect(loadingStates[loadingStates.length - 1]).toBe(false);
    });

    it('should maintain loading=false after completion', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 9,
        code: 'P009',
        treatmentStatus: 'active',
        doctorId: 90,
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert - Loading should stay false
      expect(result.current.loading).toBe(false);

      // Wait a bit more to ensure it doesn't change
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Hook Behavior', () => {
    it('should call getMyPatientInfo only once on mount', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 10,
        code: 'P010',
        treatmentStatus: 'active',
        doctorId: 100,
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(patientService.getMyPatientInfo).toHaveBeenCalledTimes(1);
      });

      // Assert
      expect(patientService.getMyPatientInfo).toHaveBeenCalledTimes(1);
    });

    it('should not call API again on re-render', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 11,
        code: 'P011',
        treatmentStatus: 'active',
        doctorId: 110,
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      const { rerender } = renderHook(() => usePatientStatus());

      // Wait for initial call
      await waitFor(() => {
        expect(patientService.getMyPatientInfo).toHaveBeenCalledTimes(1);
      });

      // Rerender
      rerender();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Should still be called only once
      expect(patientService.getMyPatientInfo).toHaveBeenCalledTimes(1);
    });

    it('should return all required fields in the interface', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 12,
        code: 'P012',
        treatmentStatus: 'active',
        doctorId: 120,
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert - Check all interface fields
      expect(result.current).toHaveProperty('isActive');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('patientInfo');
    });
  });

  describe('Edge Cases', () => {
    it('should handle patient without doctor info', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 13,
        code: 'P013',
        treatmentStatus: 'active',
        doctorId: 130,
        // doctor field is optional
      };

      vi.mocked(patientService.getMyPatientInfo).mockResolvedValue(mockPatientInfo);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.isActive).toBe(true);
      expect(result.current.patientInfo?.doctor).toBeUndefined();
    });

    it('should handle slow API response', async () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 14,
        code: 'P014',
        treatmentStatus: 'active',
        doctorId: 140,
      };

      vi.mocked(patientService.getMyPatientInfo).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockPatientInfo), 500))
      );

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Assert - Should be loading
      expect(result.current.loading).toBe(true);

      // Wait for completion
      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 1000 }
      );

      // Assert - Should have data
      expect(result.current.isActive).toBe(true);
      expect(result.current.patientInfo).toEqual(mockPatientInfo);
    });

    it('should handle API timeout', async () => {
      // Arrange
      const mockError = new Error('Request timeout');
      vi.mocked(patientService.getMyPatientInfo).mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => usePatientStatus());

      // Wait for completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Request timeout');
      expect(result.current.isActive).toBe(null);
    });
  });
});
