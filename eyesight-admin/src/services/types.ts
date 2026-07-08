// Consolidation: All types migrated to src/types/core
// Re-export types from core domain
// This file consolidates type exports for backward compatibility

export type { QueryParams } from '../types/core';
export type { Patient, PatientWithCompliance, PatientExercise } from '../types/core';
export type {
  Exercise,
  ExerciseConfig,
  ExerciseResult,
  ExerciseAssignment,
  ExerciseProgressReport,
  AssignmentData,
  AssignmentUpdateData,
  Assignment,
  CreateExerciseData,
  UpdateExerciseData,
  CreateExerciseConfigData,
  UpdateExerciseConfigData,
  AssignExerciseToPatientData,
  UpdateExerciseAssignmentData,
  LevelAdjustmentData,
} from '../types/core';
export type {
  ExamResult,
  ExamSession,
  ExamMetric,
  ExamAssignment,
  ExamAssignmentQueryParams,
  CreateExamAssignmentRequest,
  UpdateExamAssignmentRequest,
} from '../types/core';
export type {
  Notification,
  UserNotification,
  NotificationStats,
  NotificationTemplate,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  ExerciseReminderRequest,
  ExamReminderRequest,
} from '../types/core';
export type { AssignmentStats } from '../types/core/portal';
export type { FrequencyType, ExamType, ExamStatus } from '../utils/examUtils';
export type { VisualSettings, PassConditions } from '../types/core/visual-settings';

// Create UserProfile and ProgressSummary types (used by user.service)
export interface UserProfile {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role: string;
  centerId?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProgressSummary {
  totalExercises: number;
  completedExercises: number;
  averageScore: number;
  totalPlayTime: number;
  streakDays: number;
  lastActivity?: string;
  weeklyProgress?: Array<{
    date: string;
    exercisesCompleted: number;
    avgScore: number;
  }>;
}
