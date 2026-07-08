/**
 * Exam Service Unit Tests
 * Tests for exam service API functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
      .filter(([_, v]) => v !== undefined)
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
  getExamMetrics,
  saveExamMetrics,
  saveExamResult,
} from '../exam.service';
import { getData, getDataTable, postData, patchData, deleteData } from 'src/utils/request';

describe('Exam Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== EXAM SESSIONS ====================
  describe('Exam Sessions', () => {
    describe('getExamSessions', () => {
      it('should call getDataTable with correct URL', async () => {
        const mockResponse = { rows: [], count: 0 };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        await getExamSessions();

        expect(getDataTable).toHaveBeenCalledWith('/exam-sessions');
      });

      it('should pass query params correctly', async () => {
        const mockResponse = { rows: [], count: 0 };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        await getExamSessions({ page: 1, limit: 10 });

        expect(getDataTable).toHaveBeenCalledWith('/exam-sessions?page=1&limit=10');
      });
    });

    describe('getExamSession', () => {
      it('should call getData with correct URL', async () => {
        const mockSession = { id: 1, examType: 'far' };
        vi.mocked(getData).mockResolvedValue(mockSession);

        const result = await getExamSession(1);

        expect(getData).toHaveBeenCalledWith('/exam-sessions/1');
        expect(result).toEqual(mockSession);
      });
    });

    describe('createExamSession', () => {
      it('should call postData with correct data', async () => {
        const mockSession = { id: 1, examType: 'far' };
        vi.mocked(postData).mockResolvedValue(mockSession);

        const data = { examType: 'far', patientId: 1 };
        const result = await createExamSession(data);

        expect(postData).toHaveBeenCalledWith('/exam-sessions', data);
        expect(result).toEqual(mockSession);
      });
    });

    describe('updateExamSession', () => {
      it('should call patchData with correct URL and data', async () => {
        const mockSession = { id: 1, status: 'completed' };
        vi.mocked(patchData).mockResolvedValue(mockSession);

        const result = await updateExamSession(1, { status: 'completed' });

        expect(patchData).toHaveBeenCalledWith('/exam-sessions/1', { status: 'completed' });
        expect(result).toEqual(mockSession);
      });
    });

    describe('updateExamSessionStatus', () => {
      it('should update status without completedAt', async () => {
        const mockSession = { id: 1, status: 'incomplete' };
        vi.mocked(patchData).mockResolvedValue(mockSession);

        await updateExamSessionStatus(1, 'incomplete');

        expect(patchData).toHaveBeenCalledWith('/exam-sessions/1', { status: 'incomplete' });
      });

      it('should update status with completedAt', async () => {
        const mockSession = { id: 1, status: 'completed' };
        vi.mocked(patchData).mockResolvedValue(mockSession);

        const completedAt = new Date('2026-01-01');
        await updateExamSessionStatus(1, 'completed', completedAt);

        expect(patchData).toHaveBeenCalledWith('/exam-sessions/1', {
          status: 'completed',
          completedAt,
        });
      });
    });

    describe('deleteExamSession', () => {
      it('should call deleteData with correct URL', async () => {
        vi.mocked(deleteData).mockResolvedValue(undefined);

        await deleteExamSession(1);

        expect(deleteData).toHaveBeenCalledWith('/exam-sessions/1');
      });
    });
  });

  // ==================== EXAM RESULTS ====================
  describe('Exam Results', () => {
    describe('getExamResults', () => {
      it('should call getDataTable with correct URL', async () => {
        const mockResponse = { rows: [], count: 0 };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        await getExamResults();

        expect(getDataTable).toHaveBeenCalledWith('/exam-results');
      });

      it('should pass query params correctly', async () => {
        const mockResponse = { rows: [], count: 0 };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        await getExamResults({ examType: 'far', status: 'completed' });

        expect(getDataTable).toHaveBeenCalled();
      });
    });

    describe('getExamResult', () => {
      it('should call getData with correct URL', async () => {
        const mockResult = { id: 1, examType: 'far', rightEyeLevel: '10' };
        vi.mocked(getData).mockResolvedValue(mockResult);

        const result = await getExamResult(1);

        expect(getData).toHaveBeenCalledWith('/exam-results/1');
        expect(result).toEqual(mockResult);
      });
    });

    describe('createExamResult', () => {
      it('should call postData with correct data', async () => {
        const mockResult = { id: 1, examType: 'far' };
        vi.mocked(postData).mockResolvedValue(mockResult);

        const data = { examType: 'far', patientId: 1 };
        const result = await createExamResult(data);

        expect(postData).toHaveBeenCalledWith('/exam-results', data);
        expect(result).toEqual(mockResult);
      });
    });

    describe('updateExamResult', () => {
      it('should call patchData with correct URL and data', async () => {
        const mockResult = { id: 1, status: 'completed' };
        vi.mocked(patchData).mockResolvedValue(mockResult);

        const result = await updateExamResult({ id: 1, status: 'completed' });

        expect(patchData).toHaveBeenCalledWith('/exam-results/1', { id: 1, status: 'completed' });
        expect(result).toEqual(mockResult);
      });
    });

    describe('deleteExamResult', () => {
      it('should call deleteData with correct URL', async () => {
        vi.mocked(deleteData).mockResolvedValue(undefined);

        await deleteExamResult(1);

        expect(deleteData).toHaveBeenCalledWith('/exam-results/1');
      });
    });
  });

  // ==================== EXAM METRICS ====================
  describe('Exam Metrics', () => {
    describe('getExamMetrics', () => {
      it('should call getDataTable with correct URL', async () => {
        const mockResponse = { rows: [], count: 0 };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        await getExamMetrics();

        expect(getDataTable).toHaveBeenCalledWith('/exam-metrics');
      });
    });

    describe('saveExamMetrics', () => {
      it('should call postData with correct data', async () => {
        const mockMetric = { id: 1, examResultId: 1 };
        vi.mocked(postData).mockResolvedValue(mockMetric);

        const data = { examResultId: 1, accuracy: 0.8 } as any;
        const result = await saveExamMetrics(data);

        expect(postData).toHaveBeenCalledWith('/exam-metrics', data);
        expect(result).toEqual(mockMetric);
      });
    });
  });

  // ==================== COMPLEX OPERATIONS ====================
  describe('Complex Operations', () => {
    describe('saveExamResult', () => {
      it('should save exam result and metrics in sequence', async () => {
        const mockExamResult = { id: 1, examType: 'far' };
        const mockExamMetric = { id: 1, examResultId: 1 };

        vi.mocked(patchData).mockResolvedValue(mockExamResult);
        vi.mocked(postData).mockResolvedValue(mockExamMetric);

        const data = {
          examResult: { id: 1, examType: 'far' } as any,
          examMetric: { accuracy: 0.8 } as any,
        };

        const result = await saveExamResult(data);

        // Should update exam result first
        expect(patchData).toHaveBeenCalledWith('/exam-results/1', data.examResult);

        // Should save exam metric with examResultId
        expect(postData).toHaveBeenCalledWith('/exam-metrics', {
          ...data.examMetric,
          examResultId: 1,
        });

        expect(result.examResult).toEqual(mockExamResult);
        expect(result.examMetric).toEqual(mockExamMetric);
      });

      it('should throw error if exam result update fails', async () => {
        vi.mocked(patchData).mockRejectedValue(new Error('Update failed'));

        const data = {
          examResult: { id: 1, examType: 'far' } as any,
          examMetric: { accuracy: 0.8 } as any,
        };

        await expect(saveExamResult(data)).rejects.toThrow('Update failed');
      });

      it('should check session completion when examSessionId is provided', async () => {
        const mockExamResult = { id: 1, examType: 'far', examSessionId: 10 };
        const mockExamMetric = { id: 1, examResultId: 1 };
        const mockSession = {
          id: 10,
          examResults: [{ status: 'completed' }, { status: 'completed' }],
        };

        vi.mocked(patchData).mockResolvedValue(mockExamResult);
        vi.mocked(postData).mockResolvedValue(mockExamMetric);
        vi.mocked(getData).mockResolvedValue(mockSession);

        const data = {
          examResult: mockExamResult as any,
          examMetric: { accuracy: 0.8 } as any,
        };

        await saveExamResult(data);

        // Should fetch session to check completion
        expect(getData).toHaveBeenCalledWith('/exam-sessions/10');

        // Should update session status to completed
        expect(patchData).toHaveBeenCalledWith(
          '/exam-sessions/10',
          expect.objectContaining({
            status: 'completed',
          })
        );
      });
    });
  });
});
