/**
 * Patient Exam Service - Simple CRUD operations
 * Clean functional API for patient exams
 */

/**
 * Patient Exam Service - All patient exam APIs
 * Uses types from types.ts - NO duplicate type definitions!
 */

import { getData, getDataTable, postData, patchData, deleteData } from 'src/utils/request';
import { buildUrl } from 'src/utils/query-builder';
import { PaginatedResponse } from 'src/types/core';
import type {
  ExamAssignment,
  ExamAssignmentQueryParams,
  CreateExamAssignmentRequest,
  UpdateExamAssignmentRequest,
} from './types';

// ==================== CRUD OPERATIONS ====================

export const getExamAssignments = (
  params?: ExamAssignmentQueryParams
): Promise<PaginatedResponse<ExamAssignment>> => {
  // If patientId is provided, use RESTful endpoint
  if (params?.patientId) {
    const { patientId, ...otherParams } = params;
    const url = buildUrl(`/patients/${patientId}/exam-configs`, otherParams);
    return getDataTable<ExamAssignment>(url);
  }

  // Fallback to deprecated endpoint for backward compatibility
  const url = buildUrl('/exam-assignment-configs', params);
  return getDataTable<ExamAssignment>(url);
};

export const getExamAssignment = (patientId: number, examId: number): Promise<ExamAssignment> => {
  return getData<ExamAssignment>(`/patients/${patientId}/exam-configs/${examId}`);
};

export const createExamAssignment = (
  patientId: number,
  data: CreateExamAssignmentRequest
): Promise<ExamAssignment> => {
  return postData<ExamAssignment>(`/patients/${patientId}/exam-configs`, data);
};

export const updateExamAssignment = (
  patientId: number,
  examId: number,
  data: UpdateExamAssignmentRequest
): Promise<ExamAssignment> => {
  return patchData<ExamAssignment>(`/patients/${patientId}/exam-configs/${examId}`, data);
};

export const deleteExamAssignment = (patientId: number, examId: number): Promise<void> => {
  return deleteData(`/patients/${patientId}/exam-configs/${examId}`);
};

// ==================== CONVENIENCE FUNCTIONS ====================

export const getExamAssignmentsByPatient = (
  patientId: number
): Promise<PaginatedResponse<ExamAssignment>> => {
  return getDataTable<ExamAssignment>(`/patients/${patientId}/exam-configs`);
};

export const getExamAssignmentByType = async (
  patientId: number,
  examType: 'far' | 'near' | 'contrast' | 'stereopsis'
): Promise<ExamAssignment | null> => {
  try {
    const response = await getExamAssignmentsByPatient(patientId);
    return response.rows.find((exam: ExamAssignment) => exam.examType === examType) || null;
  } catch (error) {
    console.error('Error fetching patient exam by type:', error);
    return null;
  }
};

export const toggleExamAssignment = (
  patientId: number,
  examId: number
): Promise<ExamAssignment> => {
  return patchData<ExamAssignment>(`/patients/${patientId}/exam-configs/${examId}/toggle`, {});
};

// Note: Frontend handles bulk operations by calling individual APIs in parallel
// No fake bulk endpoints needed - keep it simple and honest
