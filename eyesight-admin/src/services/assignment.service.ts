import { AssignmentData, AssignmentUpdateData, AssignmentStats, QueryParams } from './types';
import { postData, getData, patchData, deleteData, getDataTable } from 'src/utils/request';
import { buildUrl } from 'src/utils/query-builder';
import { PaginatedResponse, Assignment } from 'src/types/core';

// ==================== ASSIGNMENT CRUD OPERATIONS ====================

/**
 * Assign a configuration to multiple patients
 */
export const assignConfigToPatients = (
  exerciseConfigId: number,
  assignmentData: AssignmentData
): Promise<PaginatedResponse<Assignment>> => {
  return postData<PaginatedResponse<Assignment>>(
    `/exercise-assignments/exercise-configs/${exerciseConfigId}/assignments`,
    assignmentData
  );
};

/**
 * Get all assignments for a specific patient
 * GET /v1/exercise-assignments/patients/:patientId/assignments
 */
export const getPatientAssignments = (
  patientId: number,
  params?: QueryParams
): Promise<PaginatedResponse<Assignment>> => {
  const url = buildUrl(`/exercise-assignments/patients/${patientId}/assignments`, params);
  return getDataTable<Assignment>(url);
};

/**
 * Get all assignments for a specific configuration
 */
export const getConfigAssignments = (
  configId: number,
  params?: QueryParams
): Promise<PaginatedResponse<Assignment>> => {
  const url = buildUrl(`/exercise-configs/${configId}/assignments`, params);
  return getDataTable<Assignment>(url);
};

/**
 * Update a specific assignment
 * PATCH /v1/exercise-assignments/patients/:patientId/assignments/:assignmentId
 */
export const updateAssignment = (
  patientId: number,
  assignmentId: number,
  updateData: AssignmentUpdateData
): Promise<Assignment> => {
  return patchData<Assignment>(
    `/exercise-assignments/patients/${patientId}/assignments/${assignmentId}`,
    updateData
  );
};

/**
 * Pause a specific assignment and update compliance state
 * POST /v1/compliance/assignments/:assignmentId/pause
 */
export const pauseAssignment = (assignmentId: number, reason?: string): Promise<Assignment> => {
  return postData<Assignment>(`/exercise-compliance/assignments/${assignmentId}/pause`, {
    ...(reason ? { reason } : {}),
  });
};

/**
 * Resume a paused assignment and recalculate due date
 * POST /v1/compliance/assignments/:assignmentId/resume
 */
export const resumeAssignment = (assignmentId: number): Promise<Assignment> => {
  return postData<Assignment>(`/exercise-compliance/assignments/${assignmentId}/resume`, {});
};

/**
 * Remove an assignment (soft delete)
 * DELETE /v1/exercise-assignments/patients/:patientId/assignments/:assignmentId
 */
export const removeAssignment = (patientId: number, assignmentId: number): Promise<void> => {
  return deleteData<void>(
    `/exercise-assignments/patients/${patientId}/assignments/${assignmentId}`
  );
};

// ==================== SESSION TRACKING ====================

/**
 * Record a completed session for an assignment
 * POST /v1/exercise-assignments/patients/:patientId/assignments/:assignmentId/sessions
 */
export const recordSession = (
  patientId: number,
  assignmentId: number,
  sessionData: {
    score?: number;
    duration?: number;
    completedAt?: string;
    notes?: string;
  }
): Promise<Assignment> => {
  return postData<Assignment>(
    `/exercise-assignments/patients/${patientId}/assignments/${assignmentId}/sessions`,
    sessionData
  );
};

/**
 * Get session history for an assignment
 * GET /v1/exercise-assignments/patients/:patientId/assignments/:assignmentId/sessions (không tồn tại)
 * Thay vào đó sử dụng: GET /v1/me/assignments/:assignmentId/sessions
 */
export const getAssignmentSessions = (
  assignmentId: number,
  params?: QueryParams
): Promise<PaginatedResponse<any>> => {
  const url = buildUrl(`me/assignments/${assignmentId}/sessions`, params);
  return getDataTable<any>(url);
};

// ==================== ASSIGNMENT STATISTICS ====================

/**
 * Get assignment statistics for a patient
 * GET /v1/exercise-assignments/assignments/stats?patientId=:patientId
 */
export const getPatientAssignmentStats = (patientId: number): Promise<AssignmentStats> => {
  return getData<AssignmentStats>(`/exercise-assignments/assignments/stats?patientId=${patientId}`);
};

/**
 * Get assignment statistics for a configuration
 * GET /v1/exercise-assignments/assignments/stats?configId=:configId
 */
export const getConfigAssignmentStats = (configId: number): Promise<AssignmentStats> => {
  return getData<AssignmentStats>(`/exercise-assignments/assignments/stats?configId=${configId}`);
};

/**
 * Get overall assignment statistics
 * GET /v1/exercise-assignments/assignments/stats
 */
export const getOverallAssignmentStats = (params?: QueryParams): Promise<AssignmentStats> => {
  const url = buildUrl('/exercise-assignments/assignments/stats', params);
  return getData<AssignmentStats>(url);
};

// ==================== BULK OPERATIONS ====================
// NOTE: Bulk operations not implemented in backend yet

/**
 * Bulk assign multiple configurations to multiple patients
 * TODO: Implement in backend
 */
// export const bulkAssignConfigs = (assignments: {
//   configId: number;
//   patientIds: number[];
//   assignedBy: number;
//   notes?: string;
// }[]): Promise<PaginatedResponse<Assignment>> => {
//   return postData<PaginatedResponse<Assignment>>('/assignments/bulk', { assignments });
// };

/**
 * Bulk update multiple assignments
 * TODO: Implement in backend
 */
// export const bulkUpdateAssignments = (updates: {
//   patientId: number;
//   configId: number;
//   updateData: AssignmentUpdateData;
// }[]): Promise<Assignment[]> => {
//   return patchData<Assignment[]>('/assignments/bulk', { updates });
// };

/**
 * Bulk remove multiple assignments
 * TODO: Implement in backend
 */
// export const bulkRemoveAssignments = (assignments: {
//   patientId: number;
//   configId: number;
// }[]): Promise<void> => {
//   return deleteData<void>('/assignments/bulk', { assignments });
// };

// ==================== SEARCH AND FILTERING ====================
// NOTE: Advanced search not implemented in backend yet

/**
 * Search assignments with advanced filters
 * TODO: Implement in backend
 */
// export const searchAssignments = (searchParams: {
//   patientId?: number;
//   configId?: number;
//   exerciseId?: number;
//   assignedBy?: number;
//   status?: string;
//   dateFrom?: string;
//   dateTo?: string;
//   centerId?: number;
// } & QueryParams): Promise<PaginatedResponse<Assignment>> => {
//   const url = buildUrl('/assignments/search', searchParams);
//   return getDataTable<Assignment>(url);
// };

/**
 * Get assignments due for follow-up
 * TODO: Implement in backend
 */
// export const getAssignmentsDue = (params?: QueryParams): Promise<Assignment[]> => {
//   const url = buildUrl('/assignments/due', params);
//   return getData<Assignment[]>(url);
// };

/**
 * Get assignment conflicts (duplicate active assignments)
 * TODO: Implement in backend
 */
// export const getAssignmentConflicts = (params?: QueryParams): Promise<Assignment[]> => {
//   const url = buildUrl('/assignments/conflicts', params);
//   return getData<Assignment[]>(url);
// };

// ==================== VALIDATION HELPERS ====================
// NOTE: Validation helpers not implemented in backend yet

/**
 * Check if assignment already exists
 * TODO: Implement in backend
 */
// export const checkAssignmentExists = (
//   patientId: number,
//   configId: number
// ): Promise<{ exists: boolean; assignment?: Assignment }> => {
//   return getData<{ exists: boolean; assignment?: Assignment }>(`/assignments/check/${patientId}/${configId}`);
// };

/**
 * Validate assignment data before creation
 * TODO: Implement in backend
 */
// export const validateAssignmentData = (assignmentData: AssignmentData): Promise<{
//   valid: boolean;
//   errors?: string[];
// }> => {
//   return postData<{ valid: boolean; errors?: string[] }>('/assignments/validate', assignmentData);
// };

// ==================== PATIENT PORTAL APIs (RESTful) ====================

/**
 * Get patient's assignments (for portal)
 * GET /v1/me/assignments
 */
export const getMyAssignments = (params?: {
  status?: string;
  complianceStatus?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Assignment>> => {
  const url = buildUrl('me/assignments', params);
  return getDataTable<Assignment>(url);
};

/**
 * Get specific assignment detail (for portal)
 * GET /v1/me/assignments/:assignmentId
 */
export const getMyAssignment = (assignmentId: number): Promise<Assignment> => {
  return getData<Assignment>(`me/assignments/${assignmentId}`);
};

/**
 * NOTE: startMyExerciseSession removed - sessions are created by backend job automatically
 * Patient should use existing currentSession from assignment data
 *
 * Backend job creates sessions based on frequency (daily/weekly/monthly)
 * Frontend only needs to:
 * 1. Get assignment with currentSession included
 * 2. Submit results to existing session
 */

/**
 * Submit session results (RESTful)
 * POST /v1/me/assignments/:assignmentId/sessions/:sessionId/results
 */
export const submitMySessionResult = (
  assignmentId: number,
  sessionId: number,
  results: {
    score?: number;
    accuracy?: number;
    reactionTime?: number;
    duration?: number;
    exerciseData?: any;
    notes?: string;
  }
) => {
  return postData(`me/assignments/${assignmentId}/sessions/${sessionId}/results`, results);
};

/**
 * Get assignment results history (for portal)
 * GET /v1/me/assignments/:assignmentId/results
 */
export const getMyAssignmentResults = (
  assignmentId: number,
  params?: QueryParams
): Promise<PaginatedResponse<any>> => {
  const url = buildUrl(`me/assignments/${assignmentId}/results`, params);
  return getDataTable<any>(url);
};

/**
 * Get assignment statistics (combined frequency + progress)
 * GET /v1/me/assignments/stats
 */
export const getMyAssignmentStats = (params?: { startDate?: string; endDate?: string }) => {
  const url = buildUrl('me/assignments/stats', params);
  return getData(url);
};

// Functions are already exported individually above

// Default export for backward compatibility
export default {
  assignConfigToPatients,
  getPatientAssignments,
  getConfigAssignments,
  updateAssignment,
  removeAssignment,
  recordSession,
  getAssignmentSessions,
  getPatientAssignmentStats,
  getConfigAssignmentStats,
  getOverallAssignmentStats,

  // Patient Portal APIs
  getMyAssignments,
  getMyAssignment,
  submitMySessionResult,
  getMyAssignmentResults,
  getMyAssignmentStats,
};
