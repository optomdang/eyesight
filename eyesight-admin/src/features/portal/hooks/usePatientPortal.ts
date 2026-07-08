/**
 * Patient Portal Hooks
 * Custom hooks để sử dụng Patient Portal APIs với /me/* endpoints (RESTful)
 *
 * NOTE: Session creation is handled by backend job automatically.
 * Frontend should NOT create sessions manually.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getMyAssignments as getMyAssignmentsAPI,
  getMyAssignment as getMyAssignmentAPI,
  submitMySessionResult,
  getMyAssignmentResults,
  getMyAssignmentStats,
} from 'src/services/assignment.service';
import {
  getMyPatientInfo as getMyPatientInfoAPI,
  getMyExerciseResults,
  submitExerciseResult,
} from 'src/services/patient.service';
import { Assignment, ExerciseResult, VisualSettings } from 'src/types/core';
import { SubmitExerciseResultRequest, UseExerciseReturn, UseExerciseResultsReturn } from '../types';

// ==================== SESSION MANAGEMENT HOOKS ====================

// NOTE: useStartSession removed - sessions are created by backend job automatically
// Patient should use existing currentSession from assignment data

// Hook để submit session results (RESTful API)
export const useSubmitSessionResult = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitResult = async (
    assignmentId: number,
    sessionId: number,
    results: {
      score?: number;
      accuracy?: number;
      reactionTime?: number;
      duration?: number;
      exerciseData?: any;
      notes?: string;
    },
    onSuccess?: () => void
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await submitMySessionResult(assignmentId, sessionId, results);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      return response;
    } catch (err: any) {
      setError(err.message || 'Không thể gửi kết quả session');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitResult,
    loading,
    error,
  };
};

// Hook để lấy danh sách assignments của bệnh nhân (Updated API)
export const useMyAssignments = (): UseExerciseReturn => {
  const [exercises, setExercises] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExercises = useCallback(
    async (params?: {
      status?: 'active' | 'inactive' | 'completed';
      complianceStatus?: 'compliant' | 'overdue' | 'critical';
      page?: number;
      limit?: number;
    }) => {
      try {
        setLoading(true);
        setError(null);

        // Build query string
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.complianceStatus)
          queryParams.append('complianceStatus', params.complianceStatus);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        const response = await getMyAssignmentsAPI({
          status: params?.status,
          complianceStatus: params?.complianceStatus,
          page: params?.page,
          limit: params?.limit,
        });

        setExercises(response.rows || []);
      } catch (err: any) {
        setError(err.message || 'Không thể tải danh sách assignments');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  return {
    exercises,
    loading,
    error,
    reload: loadExercises,
  };
};

// Hook để lấy kết quả bài tập
export const useMyExerciseResults = (): UseExerciseResultsReturn => {
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadResults = async (params?: {
    exerciseId?: string;
    sessionId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await getMyExerciseResults({
        exerciseId: params?.exerciseId,
        sessionId: params?.sessionId,
        startDate: params?.startDate,
        endDate: params?.endDate,
        page: params?.page,
        limit: params?.limit,
      });

      setResults(response.rows || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải kết quả bài tập');
    } finally {
      setLoading(false);
    }
  };

  const submitResult = async (data: SubmitExerciseResultRequest) => {
    try {
      setError(null);
      const response = await submitExerciseResult(data.assignmentId, data.sessionId, data);
      // Reload results after successful submission
      await loadResults();
      return response;
    } catch (err: any) {
      setError(err.message || 'Không thể gửi kết quả bài tập');
      throw err;
    }
  };

  return {
    results,
    loading,
    error,
    loadResults,
    submitResult,
  };
};

// Hook để lấy chi tiết assignment với today's progress
export const useMyAssignmentDetail = (assignmentId?: number) => {
  const [assignment, setAssignment] = useState<Assignment>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignmentDetail = useCallback(async () => {
    if (!assignmentId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getMyAssignmentAPI(assignmentId);
      setAssignment(response);
    } catch (err: any) {
      setError(err.message || 'Không thể tải thông tin assignment');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadAssignmentDetail();
  }, [loadAssignmentDetail]);

  return {
    assignment,
    loading,
    error,
    reload: loadAssignmentDetail,
  };
};
