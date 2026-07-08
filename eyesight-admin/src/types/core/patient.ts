/**
 * PATIENT TYPES
 * Single source of truth for all patient-related types
 */

import type { User } from './user';

/**
 * Treatment status enum — MUST match backend `Patient.treatmentStatus` (SOT).
 * Source: eye-sight-service/src/utils/treatmentUtils.js (TREATMENT_STATUS)
 *
 * - not_started: hồ sơ đã tạo nhưng chưa tới ngày bắt đầu (now < activeFrom)
 * - active:      đang trong liệu trình (activeFrom ≤ now ≤ activeTo, không bị tạm dừng)
 * - paused:      bác sĩ chủ động tạm dừng
 * - completed:   hết liệu trình (now > activeTo) — job đồng bộ set
 */
export type TreatmentStatus = 'not_started' | 'active' | 'paused' | 'completed';

/**
 * Patient status info for access control and inactive page display
 * Used by usePatientStatus hook and InactivePage component
 * Returned from GET /v1/me/info endpoint
 */
export interface PatientInfo {
  id: number;
  code: string;
  treatmentStatus: TreatmentStatus;
  doctorId: number;
  doctor?: {
    name: string;
    phoneNumber?: string;
  };
  /** Exam results returned by GET /v1/me/info (mirrors Patient.examResults) */
  examResults?: PatientExamResults;
}

/**
 * Patient entity - comprehensive interface
 */
export interface Patient {
  id?: number;
  name: string;
  code: string;
  userId: number;
  phoneNumber: string;
  dateOfBirth?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';

  // Clinical info
  doctorId?: number;
  currentEyesight?: number;
  effectiveness?: number;
  efficiency?: number;

  // Medical Record (Bệnh án)
  medicalHistory?: string;
  additionalNotes?: string;
  medicalImages?: MedicalImage[];
  causes?: string[];

  // Treatment fields
  severityLevel?: 'mild' | 'moderate' | 'severe' | 'critical';
  severityNotes?: string;
  treatmentStatus?: TreatmentStatus;
  activeFrom?: string;
  activeTo?: string;

  // Computed fields (from backend)
  inactiveDays?: number | null;
  activeDuration?: number;
  remainingDuration?: number | null;

  // Status
  status?: string;
  clinicId?: number;
  centerId?: number;

  // Exam Results (nested structure from backend)
  examResults?: PatientExamResults;

  // Relations (optional, populated by backend)
  clinic?: {
    id: number;
    name: string;
    code?: string;
    centerId?: number;
  };
  user?: User | PatientUserInfo;
  doctor?: PatientDoctorInfo | null;

  createdAt?: string;
  updatedAt?: string;
}

/**
 * User info embedded in Patient response
 */
export interface PatientUserInfo {
  id: number;
  name: string;
  phoneNumber?: string;
  email?: string;
  title?: string;
  centerId?: number;
  defaultClinicId?: number;
}

/**
 * Doctor info embedded in Patient response
 */
export interface PatientDoctorInfo {
  id: number;
  code?: string;
  name?: string;
  specialization?: string;
  userId?: number;
  user?: User;
}

/**
 * Exam results structure for a single vision type
 */
export interface VisionTypeResult {
  initialResult?: { leftEye?: number | null; rightEye?: number | null; bothEye?: number | null };
  currentResult?: { leftEye?: number | null; rightEye?: number | null; bothEye?: number | null };
  lastExamDate?: string | null;
}

/**
 * Full exam results structure embedded in Patient
 */
export interface PatientExamResults {
  far?: VisionTypeResult;
  near?: VisionTypeResult;
  contrast?: VisionTypeResult;
  stereopsis?: VisionTypeResult;
}

/**
 * Medical image stored in patient record
 */
export interface MedicalImage {
  id: string;
  data: string; // base64 encoded image data with data URI prefix
  filename: string;
  size: number; // in bytes
  uploadedAt: string;
}

/**
 * DTO for updating medical record
 */
export interface UpdateMedicalRecordDto {
  medicalHistory?: string;
  additionalNotes?: string;
  medicalImages?: MedicalImage[];
  causes?: string[];
}

/**
 * DTO for creating patient
 */
export interface CreatePatientDto {
  name: string;
  code: string;
  userId: number;
  phoneNumber: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  clinicId?: number;
  doctorId?: number;
  currentEyesight?: number;
  status?: string;
}

/**
 * DTO for updating patient
 */
export interface UpdatePatientDto {
  name?: string;
  phoneNumber?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  doctorId?: number;
  currentEyesight?: number;
  effectiveness?: number;
  efficiency?: number;
  status?: string;
  clinicId?: number;
}

/**
 * Patient metrics
 */
export interface PatientMetrics {
  patientId: number;
  totalExercises: number;
  completedExercises: number;
  passedExercises: number;
  averageAccuracy: number;
  averageScore: number;
  totalHours: number;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Patient with metrics
 */
export interface PatientWithMetrics extends Patient {
  metrics?: PatientMetrics;
}

/**
 * Compliance tracking for each exam type
 */
export interface ExamTypeCompliance {
  performanceRate: number;
  status: 'excellent' | 'good' | 'warning' | 'poor';
  completedExams: number;
  requiredExams: number;
  lastCalculatedAt: string | null;
}

/**
 * Exam result for each eye.
 * Levels are NUMBERS — must match backend (examresult-level-smallint migration).
 */
export interface ExamEyeResult {
  bothEye: number | null;
  leftEye: number | null;
  rightEye: number | null;
}

/**
 * Exam results data for a specific exam type
 */
export interface ExamTypeResults {
  initialResult: ExamEyeResult;
  currentResult: ExamEyeResult;
  lastExamDate: string | null;
}

/**
 * Patient with comprehensive compliance and exam result tracking
 * Enhanced version for service layer with detailed analytics
 */
export interface PatientWithCompliance extends Patient {
  // Compliance data for each exam type
  compliance?: {
    far: ExamTypeCompliance;
    near: ExamTypeCompliance;
    contrast: ExamTypeCompliance;
    stereopsis: ExamTypeCompliance;
  };
  // Exam results data for each exam type
  examResults?: {
    far: ExamTypeResults;
    near: ExamTypeResults;
    contrast: ExamTypeResults;
    stereopsis: ExamTypeResults;
  };
}

/**
 * Patient-Exercise relationship
 */
export interface PatientExercise {
  id: number;
  patientId: number;
  exerciseId: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
  lastPlayedAt?: string;
  totalSessions?: number;
  isActive: boolean;
  settings?: Record<string, unknown>;
}
