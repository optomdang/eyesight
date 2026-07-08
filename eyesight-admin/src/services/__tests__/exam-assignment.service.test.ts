/**
 * Exam Assignment Service Unit Tests
 * Tests for exam assignment CRUD operations
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
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return query ? `${base}?${query}` : base;
  }),
}));

import {
  getExamAssignments,
  getExamAssignment,
  createExamAssignment,
  updateExamAssignment,
  deleteExamAssignment,
  getExamAssignmentsByPatient,
  getExamAssignmentByType,
  toggleExamAssignment,
} from '../exam-assignment.service';
import { getData, getDataTable, postData, patchData, deleteData } from 'src/utils/request';

describe('Exam Assignment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== CRUD OPERATIONS ====================
  describe('CRUD Operations', () => {
    describe('getExamAssignments', () => {
      it('should use RESTful endpoint when patientId is provided', async () => {
        const mockResponse = { rows: [], count: 0 };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        await getExamAssignments({ patientId: 1 });

        expect(getDataTable).toHaveBeenCalledWith('/patients/1/exam-configs');
      });

      it('should use deprecated endpoint when no patientId', async () => {
        const mockResponse = { rows: [], count: 0 };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        await getExamAssignments();

        expect(getDataTable).toHaveBeenCalledWith('/exam-assignment-configs');
      });

      it('should pass other params when using RESTful endpoint', async () => {
        const mockResponse = { rows: [], count: 0 };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        await getExamAssignments({ patientId: 1, page: 1, limit: 10 });

        expect(getDataTable).toHaveBeenCalledWith('/patients/1/exam-configs?page=1&limit=10');
      });
    });

    describe('getExamAssignment', () => {
      it('should call getData with correct URL', async () => {
        const mockAssignment = { id: 1, examType: 'far', patientId: 1 };
        vi.mocked(getData).mockResolvedValue(mockAssignment);

        const result = await getExamAssignment(1, 10);

        expect(getData).toHaveBeenCalledWith('/patients/1/exam-configs/10');
        expect(result).toEqual(mockAssignment);
      });
    });

    describe('createExamAssignment', () => {
      it('should call postData with correct URL and data', async () => {
        const mockAssignment = { id: 1, examType: 'far' };
        vi.mocked(postData).mockResolvedValue(mockAssignment);

        const data = { examType: 'far', frequency: 'weekly', isEnabled: true };
        const result = await createExamAssignment(1, data);

        expect(postData).toHaveBeenCalledWith('/patients/1/exam-configs', data);
        expect(result).toEqual(mockAssignment);
      });
    });

    describe('updateExamAssignment', () => {
      it('should call patchData with correct URL and data', async () => {
        const mockAssignment = { id: 10, examType: 'far', frequency: 'monthly' };
        vi.mocked(patchData).mockResolvedValue(mockAssignment);

        const data = { frequency: 'monthly' };
        const result = await updateExamAssignment(1, 10, data);

        expect(patchData).toHaveBeenCalledWith('/patients/1/exam-configs/10', data);
        expect(result).toEqual(mockAssignment);
      });
    });

    describe('deleteExamAssignment', () => {
      it('should call deleteData with correct URL', async () => {
        vi.mocked(deleteData).mockResolvedValue(undefined);

        await deleteExamAssignment(1, 10);

        expect(deleteData).toHaveBeenCalledWith('/patients/1/exam-configs/10');
      });
    });
  });

  // ==================== CONVENIENCE FUNCTIONS ====================
  describe('Convenience Functions', () => {
    describe('getExamAssignmentsByPatient', () => {
      it('should call getDataTable with patient-specific URL', async () => {
        const mockResponse = { rows: [], count: 0 };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        await getExamAssignmentsByPatient(1);

        expect(getDataTable).toHaveBeenCalledWith('/patients/1/exam-configs');
      });
    });

    describe('getExamAssignmentByType', () => {
      it('should return matching exam assignment', async () => {
        const mockResponse = {
          rows: [
            { id: 1, examType: 'far' },
            { id: 2, examType: 'near' },
          ],
          count: 2,
        };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        const result = await getExamAssignmentByType(1, 'far');

        expect(result).toEqual({ id: 1, examType: 'far' });
      });

      it('should return null if no matching type', async () => {
        const mockResponse = {
          rows: [{ id: 1, examType: 'far' }],
          count: 1,
        };
        vi.mocked(getDataTable).mockResolvedValue(mockResponse);

        const result = await getExamAssignmentByType(1, 'contrast');

        expect(result).toBeNull();
      });

      it('should return null on error', async () => {
        vi.mocked(getDataTable).mockRejectedValue(new Error('Network error'));

        const result = await getExamAssignmentByType(1, 'far');

        expect(result).toBeNull();
      });
    });

    describe('toggleExamAssignment', () => {
      it('should call patchData with toggle endpoint', async () => {
        const mockAssignment = { id: 10, isEnabled: false };
        vi.mocked(patchData).mockResolvedValue(mockAssignment);

        const result = await toggleExamAssignment(1, 10);

        expect(patchData).toHaveBeenCalledWith('/patients/1/exam-configs/10/toggle', {});
        expect(result).toEqual(mockAssignment);
      });
    });
  });
});
