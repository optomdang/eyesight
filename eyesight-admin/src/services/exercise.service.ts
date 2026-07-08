/**
 * Exercise Service - CONSOLIDATED (root + admin)
 * Single source of truth for all exercise operations
 *
 * Consolidated from:
 * - src/services/exercise.service.ts (root - generic API)
 * - src/features/admin/services/exercise.service.ts (admin - extended)
 */

import { getData, getDataTable, patchData, postData, putData, deleteData } from 'src/utils/request';
import { buildUrl } from 'src/utils/query-builder';
import { PaginatedResponse } from 'src/types/core';
import type {
  Exercise,
  ExerciseConfig,
  ExerciseAssignment,
  CreateExerciseData,
  UpdateExerciseData,
  CreateExerciseConfigData,
  UpdateExerciseConfigData,
  AssignExerciseToPatientData,
  UpdateExerciseAssignmentData,
  LevelAdjustmentData,
  PatientProgressReport,
  QueryParams,
  VisualSettings,
  PassConditions,
} from './types';

// ==================== EXERCISE CRUD ====================

/**
 * Get all exercises with pagination
 */
export const getExercises = (params?: QueryParams): Promise<PaginatedResponse<Exercise>> => {
  const url = buildUrl('/exercises', params);
  return getDataTable<Exercise>(url);
};

/**
 * Get single exercise by ID
 */
export const getExercise = (exerciseId: number): Promise<Exercise> => {
  return getData<Exercise>(`/exercises/${exerciseId}`);
};

/**
 * Create new exercise
 */
export const createExercise = (data: CreateExerciseData): Promise<Exercise> => {
  return postData<Exercise>('/exercises', data);
};

/**
 * Update exercise
 */
export const updateExercise = (exerciseId: number, data: UpdateExerciseData): Promise<Exercise> => {
  return patchData<Exercise>(`/exercises/${exerciseId}`, data);
};

/**
 * Delete exercise
 */
export const deleteExercise = (exerciseId: number): Promise<void> => {
  return deleteData(`/exercises/${exerciseId}`);
};

/**
 * Duplicate exercise with new name
 */
export const duplicateExercise = (exerciseId: number, newName: string): Promise<Exercise> => {
  return postData<Exercise>(`/exercises/${exerciseId}/duplicate`, { name: newName });
};

/**
 * Update exercise status
 */
export const updateExerciseStatus = (exerciseId: number, isActive: boolean): Promise<Exercise> => {
  return patchData<Exercise>(`/exercises/${exerciseId}`, { isActive });
};

/**
 * Preview exercise with specific level
 */
export const previewExercise = (
  exerciseId: number,
  level: number
): Promise<{ settings: VisualSettings }> => {
  return getData<{ settings: VisualSettings }>(`/exercises/${exerciseId}/preview?level=${level}`);
};

// ==================== EXERCISE CONFIG ====================

/**
 * Get all exercise configs
 */
export const getExerciseConfigs = (
  params?: QueryParams
): Promise<PaginatedResponse<ExerciseConfig>> => {
  const url = buildUrl('/exercise-configs', params);
  return getDataTable<ExerciseConfig>(url);
};

/**
 * Get exercise configs by exercise ID
 */
export const getExerciseConfigsByExercise = (exerciseId: number): Promise<ExerciseConfig[]> => {
  return getData<ExerciseConfig[]>(`/exercises/${exerciseId}/configs`);
};

/**
 * Get single exercise config
 */
export const getExerciseConfig = (exerciseId: number): Promise<ExerciseConfig> => {
  return getData<ExerciseConfig>(`/exercises/${exerciseId}/config`);
};

/**
 * Create exercise config
 */
export const createExerciseConfig = (
  exerciseId: number,
  data: CreateExerciseConfigData
): Promise<ExerciseConfig> => {
  return postData<ExerciseConfig>(`/exercises/${exerciseId}/config`, data);
};

/**
 * Update exercise config
 */
export const updateExerciseConfig = (
  exerciseId: number,
  data: UpdateExerciseConfigData
): Promise<ExerciseConfig> => {
  return putData<ExerciseConfig>(`/exercises/${exerciseId}/config`, data);
};

/**
 * Update exercise config by config ID directly
 */
export const updateExerciseConfigById = (
  configId: number,
  data: UpdateExerciseConfigData
): Promise<ExerciseConfig> => {
  return patchData<ExerciseConfig>(`/exercise-configs/${configId}`, data);
};

/**
 * Get single exercise config by config ID
 */
export const getExerciseConfigById = (configId: number): Promise<ExerciseConfig> => {
  return getData<ExerciseConfig>(`/exercise-configs/${configId}`);
};

/**
 * Delete exercise config by config ID
 */
export const deleteExerciseConfigById = (configId: number): Promise<void> => {
  return deleteData(`/exercise-configs/${configId}`);
};

/**
 * Create exercise config directly (without exercise ID prefix)
 */
export const createExerciseConfigDirect = (
  data: CreateExerciseConfigData
): Promise<ExerciseConfig> => {
  return postData<ExerciseConfig>('/exercise-configs', data);
};

/**
 * Delete exercise config
 */
export const deleteExerciseConfig = (exerciseId: number): Promise<void> => {
  return deleteData(`/exercises/${exerciseId}/config`);
};

// ==================== EXERCISE ASSIGNMENT ====================

/**
 * Assign exercise to patient(s)
 */
export const assignExerciseToPatient = (
  data: AssignExerciseToPatientData
): Promise<ExerciseAssignment[]> => {
  return postData<ExerciseAssignment[]>('/patient-exercises/assign', data);
};

/**
 * Get patient exercises by patient ID
 * GET /v1/exercise-assignments/patients/:patientId/assignments
 */
export const getPatientExercises = (
  patientId: number,
  params?: QueryParams
): Promise<PaginatedResponse<ExerciseAssignment>> => {
  const url = buildUrl(`/exercise-assignments/patients/${patientId}/assignments`, params);
  return getDataTable<ExerciseAssignment>(url);
};

/**
 * Get patient exercise by ID
 */
export const getPatientExercise = (assignmentId: number): Promise<ExerciseAssignment> => {
  return getData<ExerciseAssignment>(`/patient-exercises/${assignmentId}`);
};

/**
 * Update patient exercise assignment
 */
export const updatePatientExercise = (
  assignmentId: number,
  data: UpdateExerciseAssignmentData
): Promise<ExerciseAssignment> => {
  return putData<ExerciseAssignment>(`/patient-exercises/${assignmentId}`, data);
};

/**
 * Delete patient exercise assignment
 */
export const deletePatientExercise = (assignmentId: number): Promise<void> => {
  return deleteData(`/patient-exercises/${assignmentId}`);
};

/**
 * Update patient exercise level
 */
export const updatePatientExerciseLevel = (
  assignmentId: number,
  visionLevel: number
): Promise<ExerciseAssignment> => {
  return patchData<ExerciseAssignment>(`/patient-exercises/${assignmentId}`, { visionLevel });
};

/**
 * Toggle auto adjust for patient exercise
 */
export const toggleAutoAdjust = (
  assignmentId: number,
  autoAdjustLevel: boolean
): Promise<ExerciseAssignment> => {
  return patchData<ExerciseAssignment>(`/patient-exercises/${assignmentId}`, { autoAdjustLevel });
};

/**
 * Adjust level (up/down)
 */
export const adjustLevel = (
  assignmentId: number,
  direction: 'up' | 'down'
): Promise<ExerciseAssignment> => {
  return postData<ExerciseAssignment>(`/patient-exercises/${assignmentId}/adjust-level`, {
    direction,
  });
};

/**
 * Set specific level with visual settings
 */
export const setLevel = (
  assignmentId: number,
  data: LevelAdjustmentData
): Promise<ExerciseAssignment> => {
  return patchData<ExerciseAssignment>(`/patient-exercises/${assignmentId}`, data);
};

/**
 * Configure pass conditions for assignment
 */
export const configurePassConditions = (
  assignmentId: number,
  passConditions: PassConditions
): Promise<ExerciseAssignment> => {
  return patchData<ExerciseAssignment>(`/patient-exercises/${assignmentId}`, { passConditions });
};

// ==================== PROGRESS TRACKING ====================

/**
 * Get patient exercise progress report
 */
export const getExerciseProgressReport = (assignmentId: number): Promise<any> => {
  return getData<any>(`/patient-exercises/${assignmentId}/progress`);
};

/**
 * Get patient overall progress
 */
export const getPatientProgress = (
  patientId: number,
  params?: QueryParams
): Promise<PatientProgressReport> => {
  const url = buildUrl(`/patients/${patientId}/progress`, params);
  return getData<PatientProgressReport>(url);
};

export default {
  // Exercise
  getExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
  duplicateExercise,
  updateExerciseStatus,
  previewExercise,

  // Config
  getExerciseConfigs,
  getExerciseConfigsByExercise,
  getExerciseConfig,
  createExerciseConfig,
  updateExerciseConfig,
  deleteExerciseConfig,

  // Assignment
  assignExerciseToPatient,
  getPatientExercises,
  getPatientExercise,
  updatePatientExercise,
  deletePatientExercise,
  updatePatientExerciseLevel,
  toggleAutoAdjust,
  adjustLevel,
  setLevel,
  configurePassConditions,

  // Progress
  getExerciseProgressReport,
  getPatientProgress,
};
