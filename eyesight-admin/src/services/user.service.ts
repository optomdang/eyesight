/**
 * User Service - User profile and self-service APIs
 * Handles /me endpoints for current user
 */

import { getData, getDataTable, patchData, postData } from 'src/utils/request';
import { buildUrl } from 'src/utils/query-builder';
import { PaginatedResponse } from 'src/types/core';
import type {
  UserProfile,
  PatientExercise,
  ExerciseResult,
  ExamResult,
  UserNotification,
  ProgressSummary,
  QueryParams,
} from './types';

// ==================== USER PROFILE ====================

export const getProfile = (): Promise<UserProfile> => {
  return getData<UserProfile>('/me');
};

export const updateProfile = (data: Partial<UserProfile>): Promise<UserProfile> => {
  return patchData<UserProfile>('/me', data);
};

// ==================== MY EXERCISES ====================

export const getMyExercises = (
  params?: QueryParams
): Promise<PaginatedResponse<PatientExercise>> => {
  const url = buildUrl('/me/assignments', params);
  return getDataTable<PatientExercise>(url);
};

export const getMyExercise = (exerciseId: number): Promise<PatientExercise> => {
  return getData<PatientExercise>(`/me/assignments/${exerciseId}`);
};

export const submitExerciseResult = (
  exerciseId: number,
  data: Partial<ExerciseResult>
): Promise<ExerciseResult> => {
  return postData<ExerciseResult>(`/me/assignments/${exerciseId}/results`, data);
};

export const getMyExerciseResults = (
  exerciseId: number,
  params?: QueryParams
): Promise<PaginatedResponse<ExerciseResult>> => {
  const url = buildUrl(`/me/assignments/${exerciseId}/results`, params);
  return getDataTable<ExerciseResult>(url);
};

export const getAllMyExerciseResults = (
  params?: QueryParams
): Promise<PaginatedResponse<ExerciseResult>> => {
  const url = buildUrl('/me/exercise-results', params);
  return getDataTable<ExerciseResult>(url);
};

// ==================== MY EXAM RESULTS ====================

export const getMyExamResults = (params?: QueryParams): Promise<PaginatedResponse<ExamResult>> => {
  const url = buildUrl('/me/exam-results', params);
  return getDataTable<ExamResult>(url);
};

// ==================== MY PROGRESS ====================

export const getMyProgress = (params?: QueryParams): Promise<ProgressSummary> => {
  const url = buildUrl('/me/progress', params);
  return getData<ProgressSummary>(url);
};

// ==================== MY NOTIFICATIONS ====================

export const getMyNotifications = (
  params?: QueryParams
): Promise<PaginatedResponse<UserNotification>> => {
  const url = buildUrl('/me/notifications', params);
  return getDataTable<UserNotification>(url);
};

export const markNotificationRead = (notificationId: number): Promise<void> => {
  return patchData(`/me/notifications/${notificationId}/read`, {});
};

// ==================== ADMIN USER MANAGEMENT ====================

export const getUsers = (params?: QueryParams): Promise<PaginatedResponse<any>> => {
  const url = buildUrl('/users', params);
  return getDataTable<any>(url);
};

export const getUser = (userId: number): Promise<any> => {
  return getData<any>(`/users/${userId}`);
};

export const createUser = (data: any): Promise<any> => {
  return postData<any>('/users', data);
};

export const updateUser = (userId: number, data: any): Promise<any> => {
  return patchData<any>(`/users/${userId}`, data);
};

// ==================== ADMIN REFERENCE DATA ====================

export const getRoles = (params?: QueryParams): Promise<PaginatedResponse<any>> => {
  const url = buildUrl('/roles', params);
  return getDataTable<any>(url);
};

export const getClinics = (params?: QueryParams): Promise<PaginatedResponse<any>> => {
  const url = buildUrl('/clinics', params);
  return getDataTable<any>(url);
};

export const getDoctors = (params?: QueryParams): Promise<PaginatedResponse<any>> => {
  const url = buildUrl('/doctors', params);
  return getDataTable<any>(url);
};

export const storeNotificationToken = (token: string): Promise<void> => {
  return patchData('/me/notification-token', { token });
};
