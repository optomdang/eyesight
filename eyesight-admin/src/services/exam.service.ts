/**
 * Exam Service - Exam sessions, results, and metrics
 * Handles legacy exam system APIs
 */

import { getData, getDataTable, patchData, postData, deleteData } from 'src/utils/request';
import { buildUrl } from 'src/utils/query-builder';
import { PaginatedResponse } from 'src/types/core';
import type { ExamSession, ExamResult, ExamMetric, QueryParams } from './types';

// ==================== EXAM SESSIONS ====================

export const getExamSessions = (params?: QueryParams): Promise<PaginatedResponse<ExamSession>> => {
  const url = buildUrl('/exam-sessions', params);
  return getDataTable<ExamSession>(url);
};

export const getExamSession = (sessionId: number): Promise<ExamSession> => {
  return getData<ExamSession>(`/exam-sessions/${sessionId}`);
};

export const createExamSession = (data: Partial<ExamSession>): Promise<ExamSession> => {
  return postData<ExamSession>('/exam-sessions', data);
};

export const updateExamSession = (
  sessionId: number,
  data: Partial<ExamSession>
): Promise<ExamSession> => {
  return patchData<ExamSession>(`/exam-sessions/${sessionId}`, data);
};

export const updateExamSessionStatus = (
  sessionId: number,
  status: string,
  completedAt?: Date
): Promise<ExamSession> => {
  const data: any = { status };
  if (completedAt) data.completedAt = completedAt;
  return patchData<ExamSession>(`/exam-sessions/${sessionId}`, data);
};

export const deleteExamSession = (sessionId: number): Promise<void> => {
  return deleteData(`/exam-sessions/${sessionId}`);
};

// ==================== EXAM RESULTS ====================

export const getExamResults = (params?: QueryParams): Promise<PaginatedResponse<ExamResult>> => {
  const url = buildUrl('/exam-results', params);
  return getDataTable<ExamResult>(url);
};

export const getExamResult = (resultId: number): Promise<ExamResult> => {
  return getData<ExamResult>(`/exam-results/${resultId}`);
};

export const createExamResult = (data: Partial<ExamResult>): Promise<ExamResult> => {
  return postData<ExamResult>('/exam-results', data);
};

export const updateExamResult = (data: Partial<ExamResult>): Promise<ExamResult> => {
  return patchData<ExamResult>(`/exam-results/${data.id}`, data);
};

export const deleteExamResult = (resultId: number): Promise<void> => {
  return deleteData(`/exam-results/${resultId}`);
};

// ==================== EXAM METRICS ====================

export const getExamMetrics = (params?: QueryParams): Promise<PaginatedResponse<ExamMetric>> => {
  const url = buildUrl('/exam-metrics', params);
  return getDataTable<ExamMetric>(url);
};

export const getExamMetric = (metricId: number): Promise<ExamMetric> => {
  return getData<ExamMetric>(`/exam-metrics/${metricId}`);
};

export const saveExamMetrics = (data: ExamMetric): Promise<ExamMetric> => {
  return postData<ExamMetric>('/exam-metrics', data);
};

export const updateExamMetric = (
  metricId: number,
  data: Partial<ExamMetric>
): Promise<ExamMetric> => {
  return patchData<ExamMetric>(`/exam-metrics/${metricId}`, data);
};

export const deleteExamMetric = (metricId: number): Promise<void> => {
  return deleteData(`/exam-metrics/${metricId}`);
};

// ==================== COMPLEX EXAM OPERATIONS ====================

/**
 * Save the test result to the server - Complex operation with multiple API calls
 * This is a high-level function that coordinates multiple API calls
 */
export const saveExamResult = async (data: { examResult: ExamResult; examMetric: ExamMetric }) => {
  // Step 1: Save the exam result
  const savedExamResult = await updateExamResult(data.examResult);

  // Step 2: Update the exam metric with the exam result ID
  const examMetric = {
    ...data.examMetric,
    examResultId: savedExamResult.id as number,
  };

  // Step 3: Save the exam metric
  const savedExamMetric = await saveExamMetrics(examMetric);

  // Step 4: Update session status only when all exam results are completed
  if (data.examResult.examSessionId) {
    // Retrieve session information
    const session = await getExamSession(data.examResult.examSessionId);
    // Check if all exam results are completed
    const allCompleted =
      (session as any).examResults &&
      (session as any).examResults.length > 0 &&
      (session as any).examResults.every((r: ExamResult) => r.status === 'completed');
    if (allCompleted) {
      await updateExamSessionStatus(data.examResult.examSessionId, 'completed', new Date());
    }
  }

  return {
    examResult: savedExamResult,
    examMetric: savedExamMetric,
  };
};
