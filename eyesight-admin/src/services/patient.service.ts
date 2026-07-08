/**
 * Patient Service
 * API calls for patient-related operations
 * Consolidated from portal-specific services to use /me/* endpoints consistently
 */

import { getData, getDataTable, postData, putData, patchData, deleteData } from 'src/utils/request';
import { buildUrl } from 'src/utils/query-builder';
import type { ExerciseAssignment, PatientInfo, PaginatedResponse } from 'src/types/core';

// ============================================================================
// DOCTOR'S PATIENT LIST (Staff operations)
// ============================================================================

/**
 * Get patients assigned to current doctor
 * GET /v1/me/patients
 */
export const getMyPatients = (params?: {
  limit?: number;
  page?: number;
  search?: string;
}): Promise<PaginatedResponse<any>> => {
  const url = buildUrl('me/patients', params);
  return getDataTable<any>(url);
};

// ============================================================================
// PORTAL PATIENT SELF-SERVICE (Patient operations for their own data)
// ============================================================================

/**
 * Get current patient info with exam results
 * GET /v1/me/info
 */
export const getMyPatientInfo = (): Promise<PatientInfo> => {
  return getData<PatientInfo>(`me/info`);
};

/**
 * Update current user profile
 * PATCH /v1/me
 */
export const updateMyProfile = (data: any): Promise<any> => {
  return patchData('me', data);
};

/**
 * Get patient exam dashboard data
 * GET /v1/me/exam-dashboard
 */
export const getMyExamDashboard = (): Promise<any> => {
  return getData<any>(`me/exam-dashboard`);
};

/**
 * Get my current active exam sessions (scheduledDate <= today, status != completed)
 * Returns object keyed by examType
 * GET /v1/me/exam-sessions/current
 */
export const getMyCurrentSessions = (): Promise<Record<string, any>> => {
  return getData('me/exam-sessions/current');
};

/**
 * Get my exam sessions (MATCHING Exercise pattern)
 * GET /v1/me/exam-sessions
 */
export const getMyExamSessions = (params?: {
  examType?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<any> => {
  const url = buildUrl('me/exam-sessions', params);
  return getData(url);
};

/**
 * Get single exam session by ID
 * GET /v1/me/exam-sessions/:sessionId
 */
export const getMyExamSession = (sessionId: number): Promise<any> => {
  return getData<any>(`me/exam-sessions/${sessionId}`);
};

/**
 * Start exam from session (creates ExamResult automatically)
 * POST /v1/me/exam-sessions/:sessionId/start
 */
export const startExamFromSession = (sessionId: number): Promise<any> => {
  return postData(`me/exam-sessions/${sessionId}/start`, {});
};

/**
 * Get patient by user ID
 * GET /v1/patients/user/:userId
 */
export const getPatientByUserId = (userId: string): Promise<any> => {
  return getData<any>(`patients/user/${userId}`);
};

/**
 * Get my exam results with pagination
 * GET /v1/me/exam-results
 */
export const getMyExamResults = (params?: {
  page?: number;
  limit?: number;
  examType?: string;
  status?: string;
  examSessionId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  const url = buildUrl('me/exam-results', params);
  return getData(url);
};

/**
 * Create exam result
 * POST /v1/me/exam-results
 */
export const createMyExamResult = (data: any) => {
  return postData('me/exam-results', data);
};

/**
 * Update exam result
 * PUT /v1/me/exam-results/:examResultId
 */
export const updateMyExamResult = (examResultId: number, data: any) => {
  return putData(`me/exam-results/${examResultId}`, data);
};

// ============================================================================
// EXERCISE-RELATED FUNCTIONS (Consolidated from portal service)
// ============================================================================

/**
 * Get patient's assignment stats for dashboard
 * GET /v1/me/assignments/stats
 */
export const getMyAssignmentStats = (): Promise<any> => {
  return getData<any>('me/assignments/stats');
};

/**
 * Get patient's exercise assignments with pagination and filters
 * GET /v1/me/assignments
 */
export const getMyAssignments = (params?: {
  status?: 'active' | 'paused' | 'completed' | 'cancelled';
  isActive?: boolean;
  exerciseId?: number;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<ExerciseAssignment>> => {
  const url = buildUrl('me/assignments', params);
  return getDataTable<ExerciseAssignment>(url);
};

/**
 * Get details of a specific exercise assignment
 * GET /v1/me/assignments/:assignmentId
 */
export const getMyAssignmentDetails = (assignmentId: number): Promise<ExerciseAssignment> => {
  return getData<ExerciseAssignment>(`me/assignments/${assignmentId}`);
};

/**
 * Get patient's exercise results with pagination and filters
 * GET /v1/me/exercise-results
 */
export const getMyExerciseResults = (params?: {
  exerciseId?: string;
  sessionId?: string;
  assignmentId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}): Promise<PaginatedResponse<any>> => {
  const url = buildUrl('me/exercise-results', params);
  return getDataTable<any>(url);
};

/**
 * Submit exercise result
 * POST /v1/me/assignments/:assignmentId/sessions/:sessionId/results
 */
export const submitExerciseResult = (
  assignmentId: number,
  sessionId: number,
  data: any
): Promise<any> => {
  return postData(`me/assignments/${assignmentId}/sessions/${sessionId}/results`, data);
};

// ============================================================================
// NEW EXERCISE FLOW: Start, Pause, Complete
// ============================================================================

/**
 * Start or resume an exercise
 * Returns action: 'new' | 'resume' | 'continue' with result object
 * POST /v1/me/assignments/:assignmentId/sessions/:sessionId/start
 */
export const startExercise = (
  assignmentId: number,
  sessionId: number
): Promise<{
  action: 'new' | 'resume' | 'continue' | 'blocked';
  result: any;
  reason?: string;
}> => {
  return postData(`me/assignments/${assignmentId}/sessions/${sessionId}/start`, {});
};

/**
 * Track an inactivity event (after ExerciseConfig.inactivityThreshold seconds idle;
 * VT Quest also uses the same threshold for trial no-response auto-ease) —
 * server increments inactivityCount on the result
 * POST /v1/me/assignments/:assignmentId/sessions/:sessionId/results/:resultId/inactivity
 */
export const trackInactivity = (
  assignmentId: number,
  sessionId: number,
  resultId: number
): Promise<void> => {
  return postData(
    `me/assignments/${assignmentId}/sessions/${sessionId}/results/${resultId}/inactivity`,
    {}
  );
};

/**
 * Pause an exercise - save current game state
 * PATCH /v1/me/assignments/:assignmentId/sessions/:sessionId/results/:resultId
 */
export const pauseExercise = (
  assignmentId: number,
  sessionId: number,
  resultId: number,
  data: {
    exerciseState?: any;
    score?: number;
    duration?: number;
    movesCount?: number;
    accuracy?: number;
  }
): Promise<any> => {
  return patchData(
    `me/assignments/${assignmentId}/sessions/${sessionId}/results/${resultId}`,
    data
  );
};

/**
 * Complete an exercise - evaluate pass/fail
 * POST /v1/me/assignments/:assignmentId/sessions/:sessionId/results/:resultId/complete
 */
export const completeExercise = (
  assignmentId: number,
  sessionId: number,
  resultId: number,
  data: {
    score: number;
    duration: number;
    movesCount?: number;
    accuracy?: number;
    /** VT Quest clinical metrics — persisted permanently server-side */
    resultMetrics?: Record<string, unknown>;
  }
): Promise<any> => {
  return postData(
    `me/assignments/${assignmentId}/sessions/${sessionId}/results/${resultId}/complete`,
    data
  );
};

/**
 * Get patient's progress summary
 * GET /v1/me/progress
 */
export const getMyProgress = (params?: {
  exerciseType?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<any> => {
  const url = buildUrl('me/progress', params);
  return getData<any>(url);
};

/**
 * Get my exercise sessions for an assignment
 * GET /v1/me/assignments/:assignmentId/sessions
 */
export const getMyAssignmentSessions = (
  assignmentId: number,
  params?: {
    status?: string;
    page?: number;
    limit?: number;
  }
): Promise<PaginatedResponse<any>> => {
  const url = buildUrl(`me/assignments/${assignmentId}/sessions`, params);
  return getDataTable<any>(url);
};

// ============================================================================
// ADMIN PATIENT OPERATIONS (Staff managing patients)
// ============================================================================

/**
 * Get all patients (admin view with pagination)
 * GET /v1/patients
 */
export const getPatients = (params?: {
  limit?: number;
  page?: number;
  search?: string;
  name?: string;
}): Promise<PaginatedResponse<any>> => {
  const url = buildUrl('/patients', params);
  return getDataTable<any>(url);
};

/**
 * Get patient by ID (admin view)
 * GET /v1/patients/:patientId
 */
export const getPatient = (patientId: number): Promise<any> => {
  return getData<any>(`/patients/${patientId}`);
};

/**
 * Pause patient treatment
 * PATCH /v1/patients/:patientId/pause
 */
export const pausePatientTreatment = (patientId: number): Promise<any> => {
  return patchData<any>(`/patients/${patientId}/pause`, {});
};

/**
 * Resume patient treatment
 * PATCH /v1/patients/:patientId/resume
 */
export const resumePatientTreatment = (
  patientId: number,
  data?: { activeFrom?: string; activeTo?: string }
): Promise<any> => {
  return patchData<any>(`/patients/${patientId}/resume`, data || {});
};

/**
 * Get patient's assignments
 * GET /v1/exercise-assignments/patients/:patientId/assignments
 */
export const getPatientAdminAssignments = (
  patientId: number,
  params?: { status?: string; page?: number; limit?: number }
): Promise<PaginatedResponse<any>> => {
  const url = buildUrl(`/exercise-assignments/patients/${patientId}/assignments`, params);
  return getDataTable<any>(url);
};

/**
 * Get single assignment for a patient
 * GET /v1/exercise-assignments/patients/:patientId/assignments/:assignmentId
 */
export const getPatientAssignment = (patientId: number, assignmentId: number): Promise<any> => {
  return getData<any>(`/exercise-assignments/patients/${patientId}/assignments/${assignmentId}`);
};

/**
 * Update patient assignment (admin)
 * PATCH /v1/exercise-assignments/patients/:patientId/assignments/:assignmentId
 */
export const updatePatientAssignment = (
  patientId: number,
  assignmentId: number,
  data: any
): Promise<any> => {
  return patchData<any>(
    `/exercise-assignments/patients/${patientId}/assignments/${assignmentId}`,
    data
  );
};

/**
 * Delete patient assignment (admin)
 * DELETE /v1/exercise-assignments/patients/:patientId/assignments/:assignmentId
 */
export const deletePatientAssignment = (patientId: number, assignmentId: number): Promise<void> => {
  return deleteData<void>(
    `/exercise-assignments/patients/${patientId}/assignments/${assignmentId}`
  );
};

/**
 * Update patient medical record
 * PATCH /v1/patients/:patientId/medical-record
 */
export const updatePatientMedicalRecord = (patientId: number, data: any): Promise<any> => {
  return patchData<any>(`/patients/${patientId}/medical-record`, data);
};

/**
 * Get patient's exam results
 * GET /v1/exam-results?patientId=:patientId
 */
export const getPatientExamResults = (
  patientId: number,
  params?: { page?: number; limit?: number; examType?: string }
): Promise<PaginatedResponse<any>> => {
  const url = buildUrl('exam-results', { ...params, patientId });
  return getDataTable<any>(url);
};

/**
 * Get patient's progress report
 * GET /v1/patients/:patientId/progress
 */
export const getPatientProgress = (patientId: number): Promise<any> => {
  return getData<any>(`/patients/${patientId}/progress`);
};

/**
 * Get patient's completed exercise sessions (admin view — for progress chart)
 * GET /v1/patients/:patientId/exercise-sessions
 */
export const getPatientExerciseSessions = (
  patientId: number,
  params?: { limit?: number; page?: number }
): Promise<any> => {
  const url = buildUrl(`patients/${patientId}/exercise-sessions`, params);
  return getDataTable<any>(url);
};

/**
 * Get current patient's completed exercise sessions (portal view — for progress chart)
 * GET /v1/me/exercise-sessions/history
 */
export const getMyExerciseSessionsHistory = (
  params?: { limit?: number; page?: number }
): Promise<any> => {
  const url = buildUrl('me/exercise-sessions/history', params);
  return getDataTable<any>(url);
};

/**
 * Leaderboard (BXH) for portal home — reuses the SAME admin leaderboard data
 * (getLeaderboard), scoped to the current patient's center. Returns the same
 * top-performers shape so the portal can reuse the admin TopPerformersLeaderboard.
 * GET /v1/me/leaderboard
 */
export const getMyLeaderboard = async (): Promise<any[]> => {
  const res = await getData<{ topPerformers: any[] }>('me/leaderboard');
  return res?.topPerformers ?? [];
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to get color values from scheme
 * Consolidated from portal service
 */
export const getColorsFromScheme = (scheme: 'standard' | 'redgreen' | 'bluewhite') => {
  switch (scheme) {
    case 'redgreen':
      return { textColor: '#ff0000', backgroundColor: '#00ff00' };
    case 'bluewhite':
      return { textColor: '#0000ff', backgroundColor: '#ffffff' };
    default:
      return { textColor: '#000000', backgroundColor: '#ffffff' };
  }
};
