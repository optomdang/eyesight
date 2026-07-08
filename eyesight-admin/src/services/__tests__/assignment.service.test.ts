/**
 * Assignment Service Unit Tests (Frontend)
 * Tests for exercise assignment API calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as assignmentService from '../assignment.service';
import * as request from 'src/utils/request';

// Mock the request utilities
vi.mock('src/utils/request', () => ({
  getData: vi.fn(),
  getDataTable: vi.fn(),
  postData: vi.fn(),
  patchData: vi.fn(),
  deleteData: vi.fn(),
}));

describe('Assignment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assignConfigToPatients', () => {
    it('should call POST with correct endpoint and data', async () => {
      const mockResponse = {
        rows: [
          {
            id: 1,
            patientId: 123,
            exerciseConfigId: 456,
            status: 'active',
          },
        ],
        count: 1,
      };

      vi.mocked(request.postData).mockResolvedValue(mockResponse);

      const result = await assignmentService.assignConfigToPatients(456, {
        patientIds: [123],
        visionLevel: 10,
        levelOverride: false,
      });

      expect(request.postData).toHaveBeenCalledWith(
        '/exercise-assignments/exercise-configs/456/assignments',
        {
          patientIds: [123],
          visionLevel: 10,
          levelOverride: false,
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle multiple patients', async () => {
      const mockResponse = {
        rows: [
          { id: 1, patientId: 123, exerciseConfigId: 456, status: 'active' },
          { id: 2, patientId: 124, exerciseConfigId: 456, status: 'active' },
        ],
        count: 2,
      };

      vi.mocked(request.postData).mockResolvedValue(mockResponse);

      const result = await assignmentService.assignConfigToPatients(456, {
        patientIds: [123, 124],
      });

      expect(result.rows).toHaveLength(2);
    });
  });

  describe('getPatientAssignments', () => {
    it('should call GET with correct endpoint and params', async () => {
      const mockResponse = {
        rows: [
          {
            id: 1,
            patientId: 123,
            exerciseConfigId: 456,
            status: 'active',
          },
        ],
        count: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      vi.mocked(request.getDataTable).mockResolvedValue(mockResponse);

      const result = await assignmentService.getPatientAssignments(123, {
        status: 'active',
        page: 1,
        limit: 10,
      });

      expect(request.getDataTable).toHaveBeenCalledWith(
        '/exercise-assignments/patients/123/assignments?status=active&page=1&limit=10'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty params', async () => {
      const mockResponse = {
        rows: [],
        count: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      vi.mocked(request.getDataTable).mockResolvedValue(mockResponse);

      await assignmentService.getPatientAssignments(123);

      expect(request.getDataTable).toHaveBeenCalledWith(
        '/exercise-assignments/patients/123/assignments'
      );
    });
  });

  describe('updateAssignment', () => {
    it('should call PATCH with correct endpoint and data', async () => {
      const mockResponse = {
        id: 1,
        patientId: 123,
        exerciseConfigId: 456,
        status: 'paused',
        notes: 'Updated notes',
      };

      vi.mocked(request.patchData).mockResolvedValue(mockResponse);

      const result = await assignmentService.updateAssignment(123, 1, {
        id: 1,
        status: 'paused',
        notes: 'Updated notes',
      });

      expect(request.patchData).toHaveBeenCalledWith(
        '/exercise-assignments/patients/123/assignments/1',
        {
          id: 1,
          status: 'paused',
          notes: 'Updated notes',
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('removeAssignment', () => {
    it('should call DELETE with correct endpoint', async () => {
      vi.mocked(request.deleteData).mockResolvedValue(undefined);

      await assignmentService.removeAssignment(123, 1);

      expect(request.deleteData).toHaveBeenCalledWith(
        '/exercise-assignments/patients/123/assignments/1'
      );
    });
  });

  describe('getMyAssignments (Portal)', () => {
    it('should call GET /me/assignments with filters', async () => {
      const mockResponse = {
        rows: [
          {
            id: 1,
            patientId: 123,
            exerciseConfigId: 456,
            status: 'active',
            currentSession: {
              id: 789,
              executionsCompleted: 2,
            },
          },
        ],
        count: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      vi.mocked(request.getDataTable).mockResolvedValue(mockResponse);

      const result = await assignmentService.getMyAssignments({
        status: 'active',
        page: 1,
        limit: 10,
      });

      expect(request.getDataTable).toHaveBeenCalledWith(
        'me/assignments?status=active&page=1&limit=10'
      );
      expect(result.rows[0].currentSession).toBeDefined();
    });

    it('should handle no params', async () => {
      const mockResponse = {
        rows: [],
        count: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      vi.mocked(request.getDataTable).mockResolvedValue(mockResponse);

      await assignmentService.getMyAssignments();

      expect(request.getDataTable).toHaveBeenCalledWith('me/assignments');
    });
  });

  describe('getMyAssignment', () => {
    it('should call GET /me/assignments/:id', async () => {
      const mockResponse = {
        id: 1,
        patientId: 123,
        exerciseConfigId: 456,
        status: 'active',
        todayProgress: {
          completed: 2,
          required: 3,
          canStart: true,
        },
      };

      vi.mocked(request.getData).mockResolvedValue(mockResponse);

      const result = await assignmentService.getMyAssignment(1);

      expect(request.getData).toHaveBeenCalledWith('me/assignments/1');
      expect(result.todayProgress).toBeDefined();
    });
  });

  describe('submitMySessionResult', () => {
    it('should call POST with correct endpoint and data', async () => {
      const mockResponse = {
        id: 999,
        score: 100,
        accuracy: 95,
      };

      vi.mocked(request.postData).mockResolvedValue(mockResponse);

      const result = await assignmentService.submitMySessionResult(1, 789, {
        score: 100,
        accuracy: 95,
        duration: 300,
      });

      expect(request.postData).toHaveBeenCalledWith('me/assignments/1/sessions/789/results', {
        score: 100,
        accuracy: 95,
        duration: 300,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMyAssignmentStats', () => {
    it('should call GET /me/assignments/stats', async () => {
      const mockResponse = {
        summary: {
          activeAssignments: 3,
          totalSessions: 15,
          averageScore: 85,
        },
        assignments: [
          {
            assignmentId: 1,
            exerciseName: 'Game 2048',
            todayCompleted: 2,
            todayRequired: 3,
          },
        ],
      };

      vi.mocked(request.getData).mockResolvedValue(mockResponse);

      const result = await assignmentService.getMyAssignmentStats();

      expect(request.getData).toHaveBeenCalledWith('me/assignments/stats');
      expect(result.summary).toBeDefined();
      expect(result.assignments).toBeDefined();
    });

    it('should handle date filters', async () => {
      const mockResponse = {
        summary: {
          activeAssignments: 3,
          totalSessions: 15,
        },
        assignments: [],
      };

      vi.mocked(request.getData).mockResolvedValue(mockResponse);

      await assignmentService.getMyAssignmentStats({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(request.getData).toHaveBeenCalledWith(
        'me/assignments/stats?startDate=2024-01-01&endDate=2024-01-31'
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from API', async () => {
      const error = new Error('Network error');
      vi.mocked(request.postData).mockRejectedValue(error);

      await expect(
        assignmentService.assignConfigToPatients(456, { patientIds: [123] })
      ).rejects.toThrow('Network error');
    });

    it('should propagate 404 errors', async () => {
      const error = new Error('Assignment not found');
      vi.mocked(request.getData).mockRejectedValue(error);

      await expect(assignmentService.getMyAssignment(99999)).rejects.toThrow(
        'Assignment not found'
      );
    });
  });
});
