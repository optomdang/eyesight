/**
 * Comprehensive Exam Service Tests
 * Extended tests for exam service covering edge cases and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the request utilities
vi.mock('src/utils/request', () => ({
  getData: vi.fn(),
  getDataTable: vi.fn(),
  postData: vi.fn(),
  patchData: vi.fn(),
  deleteData: vi.fn(),
}));

vi.mock('src/utils/query-builder', () => ({
  buildUrl: vi.fn((base, params) => {
    if (!params) return base;
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return query ? `${base}?${query}` : base;
  }),
}));

import {
  getExamSessions,
  getExamSession,
  createExamSession,
  updateExamSession,
  updateExamSessionStatus,
  deleteExamSession,
  getExamResults,
  getExamResult,
  createExamResult,
  updateExamResult,
  deleteExamResult,
} from '../exam.service';
import { getData, getDataTable, postData, patchData, deleteData } from 'src/utils/request';

describe('Exam Service - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== EXAM SESSIONS - EDGE CASES ====================
  describe('Exam Sessions - Edge Cases', () => {
    describe('getExamSessions', () => {
      it('should handle empty response', async () => {
        const mockResponse = { rows: [], count: 0, page: 1, limit: 10, totalPages: 0 };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        const result = await getExamSessions();

        expect(result.rows).toHaveLength(0);
        expect(result.count).toBe(0);
      });

      it('should handle multiple filter params', async () => {
        const mockResponse = { rows: [], count: 0 };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        await getExamSessions({
          patientId: 1,
          examType: 'far',
          status: 'completed',
          page: 2,
          limit: 20,
        });

        expect(getDataTable).toHaveBeenCalledWith(
          '/exam-sessions?patientId=1&examType=far&status=completed&page=2&limit=20'
        );
      });

      it('should handle network error', async () => {
        const networkError = new Error('Network error');
        vi.mocked(getDataTable).mockRejectedValue(networkError);

        await expect(getExamSessions()).rejects.toThrow('Network error');
      });
    });

    describe('createExamSession', () => {
      it('should create session with all exam types', async () => {
        const examTypes = ['far', 'near', 'contrast', 'stereopsis'] as const;

        for (const examType of examTypes) {
          const mockSession = { id: 1, examType, status: 'incomplete' };
          vi.mocked(postData).mockResolvedValue(mockSession);

          const result = await createExamSession({ examType, patientId: 1 });

          expect(result.examType).toBe(examType);
        }
      });

      it('should handle validation error from server', async () => {
        const validationError = new Error('Loại kiểm tra là bắt buộc');
        vi.mocked(postData).mockRejectedValue(validationError);

        await expect(createExamSession({ patientId: 1 })).rejects.toThrow(
          'Loại kiểm tra là bắt buộc'
        );
      });

      it('should handle duplicate code error', async () => {
        const duplicateError = new Error('Mã phiên kiểm tra đã tồn tại');
        vi.mocked(postData).mockRejectedValue(duplicateError);

        await expect(
          createExamSession({ examType: 'far', patientId: 1, code: 'DUPLICATE' })
        ).rejects.toThrow('Mã phiên kiểm tra đã tồn tại');
      });
    });

    describe('updateExamSessionStatus', () => {
      it('should update status to incomplete', async () => {
        const mockSession = { id: 1, status: 'incomplete', startedAt: new Date().toISOString() };
        vi.mocked(patchData).mockResolvedValue(mockSession);

        const result = await updateExamSessionStatus(1, 'incomplete');

        expect(patchData).toHaveBeenCalledWith('/exam-sessions/1', { status: 'incomplete' });
        expect(result.status).toBe('incomplete');
      });

      it('should update status to completed with completedAt', async () => {
        const completedAt = new Date();
        const mockSession = { id: 1, status: 'completed', completedAt: completedAt.toISOString() };
        vi.mocked(patchData).mockResolvedValue(mockSession);

        const result = await updateExamSessionStatus(1, 'completed', completedAt);

        expect(patchData).toHaveBeenCalledWith('/exam-sessions/1', {
          status: 'completed',
          completedAt,
        });
        expect(result.status).toBe('completed');
      });

      it('should handle not found error', async () => {
        const notFoundError = new Error('Phiên kiểm tra không tồn tại');
        vi.mocked(patchData).mockRejectedValue(notFoundError);

        await expect(updateExamSessionStatus(999, 'completed')).rejects.toThrow(
          'Phiên kiểm tra không tồn tại'
        );
      });
    });
  });

  // ==================== EXAM RESULTS - EDGE CASES ====================
  describe('Exam Results - Edge Cases', () => {
    describe('createExamResult', () => {
      it('should create result with eye levels', async () => {
        const resultData = {
          examSessionId: 1,
          examType: 'far',
          leftEyeLevel: 8,
          rightEyeLevel: 10,
          leftEyeAccuracy: 85,
          rightEyeAccuracy: 90,
        };

        const mockResult = { id: 1, ...resultData, status: 'incomplete' };
        vi.mocked(postData).mockResolvedValue(mockResult);

        const result = await createExamResult(resultData);

        expect(result.leftEyeLevel).toBe(8);
        expect(result.rightEyeLevel).toBe(10);
      });

      it('should create stereopsis result with bothEye only', async () => {
        const resultData = {
          examSessionId: 1,
          examType: 'stereopsis',
          bothEyeLevel: 5,
          bothEyeAccuracy: 95,
        };

        const mockResult = { id: 1, ...resultData, status: 'incomplete' };
        vi.mocked(postData).mockResolvedValue(mockResult);

        const result = await createExamResult(resultData);

        expect(result.bothEyeLevel).toBe(5);
        expect(result.examType).toBe('stereopsis');
      });

      it('should handle missing examSessionId error', async () => {
        const error = new Error('examSessionId is required');
        vi.mocked(postData).mockRejectedValue(error);

        await expect(createExamResult({ examType: 'far' })).rejects.toThrow(
          'examSessionId is required'
        );
      });
    });

    describe('updateExamResult', () => {
      it('should update result with new eye levels', async () => {
        const updateData = {
          id: 1,
          leftEyeLevel: 10,
          rightEyeLevel: 12,
          status: 'completed',
          completedAt: new Date().toISOString(),
        };

        const mockResult = { ...updateData };
        vi.mocked(patchData).mockResolvedValue(mockResult);

        const result = await updateExamResult(updateData);

        expect(patchData).toHaveBeenCalledWith('/exam-results/1', updateData);
        expect(result.status).toBe('completed');
      });

      it('should handle concurrent update conflict', async () => {
        const conflictError = new Error('Conflict: Record was modified');
        vi.mocked(patchData).mockRejectedValue(conflictError);

        await expect(updateExamResult({ id: 1, status: 'completed' })).rejects.toThrow('Conflict');
      });
    });

    describe('getExamResults', () => {
      it('should filter by examType', async () => {
        const mockResponse = {
          rows: [
            { id: 1, examType: 'far' },
            { id: 2, examType: 'far' },
          ],
          count: 2,
        };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        const result = await getExamResults({ examType: 'far' });

        expect(getDataTable).toHaveBeenCalledWith('/exam-results?examType=far');
        expect(result.rows.every((r) => r.examType === 'far')).toBe(true);
      });

      it('should filter by status', async () => {
        const mockResponse = {
          rows: [{ id: 1, status: 'completed' }],
          count: 1,
        };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        const result = await getExamResults({ status: 'completed' });

        expect(getDataTable).toHaveBeenCalledWith('/exam-results?status=completed');
        expect(result.rows[0].status).toBe('completed');
      });
    });
  });

  // ==================== ERROR HANDLING ====================
  describe('Error Handling', () => {
    it('should propagate 401 unauthorized error', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;
      vi.mocked(getData).mockRejectedValue(authError);

      await expect(getExamSession(1)).rejects.toThrow('Unauthorized');
    });

    it('should propagate 403 forbidden error', async () => {
      const forbiddenError = new Error('Không có quyền truy cập');
      (forbiddenError as any).status = 403;
      vi.mocked(patchData).mockRejectedValue(forbiddenError);

      await expect(updateExamSession(1, { status: 'completed' })).rejects.toThrow(
        'Không có quyền truy cập'
      );
    });

    it('should propagate 404 not found error', async () => {
      const notFoundError = new Error('Phiên kiểm tra không tồn tại');
      (notFoundError as any).status = 404;
      vi.mocked(getData).mockRejectedValue(notFoundError);

      await expect(getExamSession(999)).rejects.toThrow('Phiên kiểm tra không tồn tại');
    });

    it('should propagate 500 server error', async () => {
      const serverError = new Error('Internal Server Error');
      (serverError as any).status = 500;
      vi.mocked(postData).mockRejectedValue(serverError);

      await expect(createExamSession({ examType: 'far', patientId: 1 })).rejects.toThrow(
        'Internal Server Error'
      );
    });
  });

  // ==================== DELETE OPERATIONS ====================
  describe('Delete Operations', () => {
    describe('deleteExamSession', () => {
      it('should delete session successfully', async () => {
        vi.mocked(deleteData).mockResolvedValue(undefined);

        await deleteExamSession(1);

        expect(deleteData).toHaveBeenCalledWith('/exam-sessions/1');
      });

      it('should handle delete of non-existent session', async () => {
        const notFoundError = new Error('Phiên kiểm tra không tồn tại');
        vi.mocked(deleteData).mockRejectedValue(notFoundError);

        await expect(deleteExamSession(999)).rejects.toThrow('Phiên kiểm tra không tồn tại');
      });
    });

    describe('deleteExamResult', () => {
      it('should delete result successfully', async () => {
        vi.mocked(deleteData).mockResolvedValue(undefined);

        await deleteExamResult(1);

        expect(deleteData).toHaveBeenCalledWith('/exam-results/1');
      });

      it('should handle delete of non-existent result', async () => {
        const notFoundError = new Error('Kết quả khám không tồn tại');
        vi.mocked(deleteData).mockRejectedValue(notFoundError);

        await expect(deleteExamResult(999)).rejects.toThrow('Kết quả khám không tồn tại');
      });
    });
  });

  // ==================== PAGINATION ====================
  describe('Pagination', () => {
    it('should handle large page numbers', async () => {
      const mockResponse = { rows: [], count: 100, page: 100, limit: 10, totalPages: 10 };
      vi.mocked(getDataTable).mockResolvedValue(mockResponse);

      const result = await getExamSessions({ page: 100, limit: 10 });

      expect(getDataTable).toHaveBeenCalledWith('/exam-sessions?page=100&limit=10');
      expect(result.rows).toHaveLength(0);
    });

    it('should handle custom limit', async () => {
      const mockResponse = { rows: new Array(50).fill({ id: 1 }), count: 100, page: 1, limit: 50 };
      vi.mocked(getDataTable).mockResolvedValue(mockResponse);

      const result = await getExamSessions({ limit: 50 });

      expect(getDataTable).toHaveBeenCalledWith('/exam-sessions?limit=50');
      expect(result.rows).toHaveLength(50);
    });
  });
});
