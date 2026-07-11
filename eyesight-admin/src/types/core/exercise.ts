/**
 * EXERCISE TYPES - Mapped from Backend Models
 * Source: eye-sight-service/src/models/exercise/
 *
 * These types are synchronized with backend Sequelize models
 * All fields match backend database schema exactly
 * Used for API request/response type safety
 */

import { UserType } from './user';
import type {
  VisualSettings,
  PassConditions,
  AutoAdjustmentRules,
  ColorScheme,
} from './visual-settings';

/** Which eye(s) a patient trains — per assignment or config template. */
export type TrainingEye = 'left' | 'right' | 'both';

// ============ NOTIFICATION SETTINGS ============

/**
 * NotificationSettings - Configuration for compliance reminders
 * Stored in ExerciseConfig.notificationSettings (JSONB)
 *
 * Controls how and when reminders are sent for overdue assignments
 *
 * BACKEND ACCEPTS (for ExerciseConfig):
 * - enabled, templateId, methods, maxReminders, reminderInterval
 *
 * DEPRECATED (exam-specific fields, not used for exercise):
 * - reminderFrequency, reminderTime, reminderDaysInterval
 */
export interface NotificationSettings {
  /**
   * Enable/disable notifications for this config
   */
  enabled: boolean;
  /**
   * Notification template ID (required if enabled)
   */
  templateId?: number | null;
  /**
   * Delivery methods: 'email', 'zalo', 'sms'
   */
  methods: ('email' | 'zalo' | 'sms')[];
  /**
   * Maximum number of reminders per overdue assignment (1-10, default: 3)
   * Used for ExerciseConfig
   */
  maxReminders?: number;
  /**
   * Hours between reminders (1-168, default: 24)
   * Used for ExerciseConfig
   * 24 = once per day, 12 = twice per day, 48 = every 2 days, etc.
   */
  reminderInterval?: number;
  /**
   * @deprecated Exam-specific field (reminderFrequency)
   */
  reminderFrequency?: string;
  /**
   * @deprecated Exam-specific field (reminderTime)
   */
  reminderTime?: string;
  /**
   * @deprecated Exam-specific field (reminderDaysInterval)
   */
  reminderDaysInterval?: number;
}

// ============ EXERCISE ============

/**
 * Exercise - Base exercise definition (library/template)
 * Backend Model: src/models/exercise/exercise.model.js
 *
 * This represents the core exercise definition. All exercises must have:
 * - Unique code per center (code + centerId composite unique)
 * - Exercise type classification (2048, memory, tracking, etc)
 * - Center isolation (centerId for multi-tenant)
 */
export interface Exercise {
  id: number;
  name: string;
  code: string;
  description?: string;
  /**
   * Type of exercise: '2048', 'memory', 'tracking', 'visual', etc
   */
  exerciseType: string;
  /**
   * Status: 'active' or 'inactive'
   */
  status: 'active' | 'inactive';
  centerId: number;
  createdBy?: number;
  updatedBy?: number;
  deletedAt?: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ EXERCISE CONFIG ============

/**
 * ExerciseConfig - Configuration with visual settings and conditions
 * Backend Model: src/models/exercise/exerciseConfig.model.js
 *
 * Defines HOW an exercise should be executed:
 * - Visual settings (fontSize, contrast, colorScheme)
 * - Execution frequency (daily/weekly/monthly)
 * - Clinical settings (distance, eye, visionType)
 * - Can be inherited from templates via configReferentId
 */
export interface ExerciseConfig {
  id: number;
  exerciseId: number;
  /**
   * Type: 'admin' (system), 'doctor' (doctor-created), 'patient' (patient-specific)
   */
  configType: UserType;
  name: string;
  /**
   * Eye: 'right' (MP), 'left' (MT), 'both' (cả hai)
   */
  eye?: 'right' | 'left' | 'both' | null;
  /**
   * Distance in meters (e.g., 3.00 for far, 0.40 for near)
   */
  distance?: number | null;
  /**
   * Duration per session in minutes
   */
  duration?: number | null;
  /**
   * Frequency: 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
   */
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null;
  /**
   * Number of executions per session (default: 1)
   */
  executionCount?: number;
  // Visual Settings
  /**
   * Font size in pixels (8-110, default: 16)
   */
  fontSize?: number;
  /**
   * Contrast level (0-100, default: 100)
   * NOTE: Backend stores as 0-100, frontend normalizes to 0-1
   */
  contrast?: number;
  /**
   * Color scheme: { textColor: string, backgroundColor: string }
   * Example: { textColor: '#000000', backgroundColor: '#FFFFFF' }
   */
  colorScheme?: ColorScheme | null;
  /**
   * Vision exercise type for level calculation: 'far', 'near', 'contrast'
   */
  visionType?: 'far' | 'near' | 'contrast' | null;
  /**
   * Default vision level when levelOverride is true (for preview and assignment defaults)
   */
  levelOverride?: boolean;
  visionLevel?: number | null;
  /**
   * Parent template ID for inheritance
   */
  configReferentId?: number | null;
  /**
   * Notification settings for compliance reminders
   * Controls when/how many reminders are sent for overdue assignments
   */
  notificationSettings?: NotificationSettings | null;
  /**
   * Seconds of no game moves before an inactivity event is recorded.
   * VT Quest also uses this as trial response timeout (auto-ease when no answer).
   * Defaults to 30 s if not set. Client reads this from config at runtime.
   */
  inactivityThreshold?: number | null;
  /** VT Quest game configuration (modalities, staircase, stimulus, gamification) */
  vtSettings?: Record<string, unknown> | null;
  /**
   * Dichoptic balance config (requires anaglyph colorScheme preset redBlue/redGreen).
   * Resolved at runtime via resolveDichopticPresentation().
   */
  dichoptic?: import('./visual-settings').DichopticConfig | null;
  /**
   * How the starting difficulty is determined each session.
   * - 'current_exam': use the patient's latest exam result for the configured visionType + eye.
   * - 'latest_achieved': on the first execution use the exam result; on subsequent executions
   *   use the highest level the patient has previously reached in this assignment.
   * Defaults to 'current_exam' when absent or null.
   */
  difficultyBaselineSource?: 'current_exam' | 'latest_achieved' | null;
  centerId: number;
  createdBy?: number;
  updatedBy?: number;
  deletedAt?: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  /**
   * Joined from Exercise table (included when fetched via getAssignmentById)
   */
  exercise?: Pick<Exercise, 'id' | 'name' | 'code' | 'exerciseType'>;
  createdByUser?: { id: number; name: string };
}

// ============ EXERCISE ASSIGNMENT ============

/**
 * ExerciseAssignment - Maps exercise config to patient with clinical settings
 * Backend Model: src/models/exercise/exerciseAssignment.model.js
 *
 * This is the KEY linking table:
 * - Links patient to exercise configuration
 * - Stores patient-specific vision level (visionLevel field)
 * - Tracks compliance and session progress
 * - Supports frequency-based scheduling
 *
 * CRITICAL FIX: Use visionLevel NOT currentLevel (currentLevel is legacy)
 */
export interface ExerciseAssignment {
  id: number;
  /**
   * Patient who is assigned this config
   */
  patientId: number;
  /**
   * Exercise configuration assigned to patient
   */
  exerciseConfigId: number;
  /**
   * Doctor/Admin who made the assignment
   */
  assignedBy: number;
  /**
   * When the assignment was made
   */
  assignedAt: string;
  /**
   * Status: 'active', 'completed', 'paused', 'cancelled'
   */
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  /**
   * Special instructions or notes for this assignment
   */
  notes?: string | null;
  /**
   * Number of sessions completed by patient
   */
  sessionsCompleted: number;
  /**
   * When patient last completed a session
   */
  lastSessionAt?: string | null;
  /**
   * Next scheduled session date based on frequency
   */
  nextDueDate?: string | null;
  /**
   * Compliance status: 'on_track', 'overdue', 'paused', 'completed'
   */
  complianceStatus: 'on_track' | 'overdue' | 'paused' | 'completed';
  /**
   * When last reminder notification was sent
   */
  lastNotificationAt?: string | null;
  /**
   * Number of reminder notifications sent
   */
  notificationCount: number;
  /**
   * LEGACY - Use visionLevel instead!
   */
  currentLevel: number;
  /**
   * Patient-specific visual settings and preferences
   */
  personalSettings?: Record<string, any>;
  /**
   * Whether to automatically adjust difficulty level
   */
  autoAdjustLevel: boolean;
  /**
   * CORRECT FIELD: Patient-specific vision level override
   * Values:
   * - Far vision: 1-20 mapping to 20/400→20/5
   * - Near vision: 1-6 mapping to N3→N24
   * - Contrast: 1-16 mapping to 2.5%→100%
   */
  visionLevel?: number | null;
  /**
   * Whether patient has custom vision level override
   */
  levelOverride?: boolean;
  /**
   * Per-patient training eye override. When set, overrides exerciseConfig.eye for vision sizing.
   */
  trainingEye?: TrainingEye | null;
  /**
   * Highest vision level the patient has previously achieved in this assignment.
   * Null means the patient has never completed an execution of this assignment.
   * Used by the 'latest_achieved' difficulty mode.
   */
  lastAchievedVisionLevel?: number | null;
  centerId: number;
  createdAt: string;
  updatedAt: string;
  // Optional relations (populated by backend)
  exercise?: Exercise;
  exerciseConfig?: ExerciseConfig;
}

// ============ EXERCISE SESSION ============

/**
 * ExerciseSession - Tracks an exercise training session
 * Backend Model: src/models/exercise/exerciseSession.model.js
 *
 * A session represents a scheduled training period where patient executes
 * one or more exercise attempts (individual game plays).
 *
 * Session lifecycle:
 * 1. Job creates session with status 'incomplete'
 * 2. When patient completes all required executions, status changes to 'completed'
 */
export interface ExerciseSession {
  id: number;
  code: string;
  exerciseAssignmentId: number;
  patientId: number;
  /**
   * Status lifecycle:
   * - 'incomplete': Session not yet completed (in progress, paused, or not started)
   * - 'completed': All required executions done
   */
  status: 'incomplete' | 'completed';
  startedAt: string;
  /** Earliest ExerciseResult.startedAt — when the patient actually began playing. */
  firstPlayedAt?: string | null;
  /** Latest ExerciseResult.completedAt — when the last execution ended. */
  lastPlayedAt?: string | null;
  endedAt?: string | null;
  completedAt?: string | null;
  /**
   * Session duration in seconds
   */
  duration?: number | null;
  /**
   * Number of executions completed in this session
   */
  executionsCompleted: number;
  /**
   * Number of valid executions (passed validation)
   */
  validExecutions: number;
  /**
   * Total score accumulated in this session
   */
  totalScore: number;
  /**
   * Average score per execution in this session
   */
  averageScore: number;
  /**
   * Best score achieved in this session
   */
  bestScore: number;
  /**
   * Percentage of valid executions (validExecutions/executionsCompleted * 100)
   */
  validityPercentage: number;
  deviceInfo?: Record<string, any>;
  centerId: number;
  createdBy?: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
}

// ============ EXERCISE RESULT ============

/**
 * ExerciseResult - Individual exercise execution result
 * Backend Model: src/models/exercise/exerciseResult.model.js
 *
 * Represents a single game execution (e.g., one round of 2048).
 * Multiple ExerciseResults belong to one ExerciseSession.
 */
export interface ExerciseResult {
  id: number;
  patientId: number;
  /**
   * Link to ExerciseSession for frequency tracking
   */
  exerciseSessionId?: number | null;
  /**
   * Link to ExerciseAssignment for modern architecture
   */
  exerciseAssignmentId?: number | null;
  exerciseId: number;
  /**
   * Type of exercise (e.g., '2048', 'memory', 'visual')
   */
  exerciseType?: string | null;
  /**
   * Visual difficulty level at which the exercise was performed
   * Values:
   * - Far vision: 1-20 mapping to 20/400→20/5
   * - Near vision: 1-6 mapping to N3→N24
   * - Contrast: 1-16 mapping to 2.5%→100%
   */
  level?: number | null;
  /**
   * Score achieved in the exercise
   */
  score?: number | null;
  /**
   * Duration of the exercise in seconds
   */
  duration?: number | null;
  /**
   * Number of moves or interactions made in the exercise
   */
  movesCount?: number | null;
  /**
   * Accuracy of interactions (percentage, 0-100)
   */
  accuracy?: number | null;
  /**
   * Focus score for this attempt: max(0, 100 - pauseCount - inactivityCount)
   */
  focusScore?: number | null;
  /**
   * Exercise result status (SOT = backend):
   * - 'incomplete': Exercise started but not finished (paused, abandoned, in progress)
   * - 'completed': Exercise attempt ended (timed out or patient ended it).
   *   Pass/fail ("Đạt/không đạt") was removed BU 2026-06.
   */
  status: 'incomplete' | 'completed';
  /**
   * Saved state of the exercise for resuming
   */
  exerciseState?: Record<string, any>;
  /**
   * Snapshot of exercise config at start time for audit trail
   */
  exerciseConfig?: Record<string, any>;
  /**
   * Visual settings used for this particular exercise session
   * Format: { textColor: string, backgroundColor: string, fontSize: number }
   */
  visualSettings?: Record<string, any>;
  /**
   * VT Quest clinical results — persisted permanently after complete.
   * Format: VtResultMetrics
   */
  resultMetrics?: Record<string, any>;
  centerId: number;
  /**
   * When the exercise was started
   */
  startedAt?: Date | null;
  /**
   * When the exercise was completed (passed or failed)
   */
  completedAt?: Date | null;
  reviewedBy?: number | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  updatedBy?: number | null;
  deletedAt?: Date | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============ PROGRESS REPORTING ============

/**
 * Exercise progress summary for patient
 */
export interface ExerciseProgressReport {
  assignmentId: number;
  exerciseName: string;

  // Current status
  currentLevel: number;
  status: string;
  lastCompletedDate?: string;

  // Statistics
  totalSessions: number;
  completedSessions: number;
  passedSessions: number;
  averageScore: number;
  averageAccuracy: number;

  // Trend
  trend: 'improving' | 'stable' | 'declining';
  recentResults: ExerciseResult[];
}

// ============ DTOs FOR OPERATIONS ============

/**
 * DTO for creating exercise
 */
export interface CreateExerciseDto {
  name: string;
  code: string;
  exerciseType: string;
  description?: string;
  instructions?: string;
}

/**
 * DTO for updating exercise
 */
export interface UpdateExerciseDto {
  name?: string;
  description?: string;
  instructions?: string;
  isActive?: boolean;
}

/**
 * DTO for creating exercise config
 */
export interface CreateExerciseConfigDto {
  exerciseId: number;
  visualSettings: VisualSettings;
  passConditions: PassConditions;
  autoAdjustmentRules?: AutoAdjustmentRules;
  visionType?: string;
  minLevel?: number;
  maxLevel?: number;
  defaultLevel?: number;
}

/**
 * DTO for assigning exercise to patient
 */
export interface AssignExerciseDto {
  patientId: number;
  exerciseId: number;
  exerciseConfigId?: number;
  visionLevel?: number;
  frequency?: string;
  sessionsPerWeek?: number;
}

/**
 * DTO for updating exercise assignment
 */
export interface UpdateAssignmentDto {
  visionLevel?: number;
  autoAdjustLevel?: boolean;
  status?: string;
  frequency?: string;
}

// ============ ASSIGNMENT REQUEST/RESPONSE TYPES ============

/**
 * Data for assigning config to patients
 */
export interface AssignmentData {
  patientIds: number[];
  notes?: string;
  templateId: number | null;
  // Patient-specific vision configuration overrides
  visionLevel?: number; // Override for patient-specific vision level
  levelOverride?: boolean; // Whether to use custom level for this patient
  trainingEye?: TrainingEye | null; // Per-patient training eye (right/left/both)
}

/**
 * Data for updating assignment
 */
export interface AssignmentUpdateData {
  status?: 'active' | 'paused' | 'completed' | 'cancelled';
  notes?: string;
  sessionsCompleted?: number;
}

/**
 * Assignment statistics
 */
export interface AssignmentStats {
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  averageCompletion: number;
}

/**
 * Assignment entity in database
 */
export interface Assignment {
  id: number;
  patientId: number;
  configId: number;
  exerciseConfig: ExerciseConfig;
  /**
   * Exercise base info (populated when backend joins the Exercise table).
   * Present on portal API responses (/me/assignments/:id).
   */
  exercise?: Pick<Exercise, 'id' | 'name' | 'code' | 'exerciseType'>;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  notes?: string;
  sessionsCompleted: number;
  createdAt: string;
  updatedAt: string;
  levelOverride: boolean;
  visionLevel: number;
  /** Per-patient training eye override. When set, overrides exerciseConfig.eye for vision sizing. */
  trainingEye?: TrainingEye | null;
  /**
   * Highest vision level the patient has previously achieved in this assignment.
   * Null = never played. Used by the 'latest_achieved' difficulty mode.
   */
  lastAchievedVisionLevel?: number | null;
}

// ============ DTOs - Form/Request Data ============

/**
 * Create exercise DTO
 */
export interface CreateExerciseData {
  name: string;
  code: string;
  exerciseType: string;
  description?: string;
  status?: 'active' | 'inactive';
  instructions?: string;
}

/**
 * Update exercise DTO
 */
export interface UpdateExerciseData {
  name?: string;
  code?: string;
  description?: string;
  exerciseType?: string;
  status?: 'active' | 'inactive';
  isActive?: boolean;
}

/**
 * Create exercise config DTO
 */
export interface CreateExerciseConfigData {
  exerciseId: number;
  exerciseType: string;
  defaultLevel: number;
  maxLevel: number;
  visualSettings?: VisualSettings;
  passConditions?: PassConditions;
}

/**
 * Update exercise config DTO
 */
export interface UpdateExerciseConfigData {
  defaultLevel?: number;
  visualSettings?: VisualSettings;
  passConditions?: PassConditions;
}

/**
 * Assign exercise to patient DTO
 */
export interface AssignExerciseToPatientData {
  exerciseConfigId: number;
  patientIds: number[];
  visionLevel?: number;
  autoAdjustLevel?: boolean;
  priority?: 'low' | 'normal' | 'high';
  notes?: string;
}

/**
 * Update exercise assignment DTO
 */
export interface UpdateExerciseAssignmentData {
  status?: 'assigned' | 'active' | 'paused' | 'completed';
  visionLevel?: number;
  autoAdjustLevel?: boolean;
  priority?: 'low' | 'normal' | 'high';
  notes?: string;
  trainingEye?: TrainingEye | null;
}

/**
 * Level adjustment DTO
 */
export interface LevelAdjustmentData {
  adjustmentSource: 'last_session' | 'doctor_setting';
  newLevel: number;
}

/**
 * Patient progress report type
 */
export interface PatientProgressReport {
  patient: {
    id: number;
    name: string;
    age: number;
    startedAt: string;
  };
  summary: {
    totalExercises: number;
    completedExercises: number;
    totalSessions: number;
    totalPassedSessions: number;
    averageCompletionRate: number;
    overallProgress: string;
  };
  progressByExercise: Array<{
    exerciseId: number;
    exerciseName: string;
    completedCount: number;
    passedCount: number;
    currentLevel: number;
    initialLevel: number;
    progressRate: string;
  }>;
}

// ============================================================================
// SHARED TYPES (Moved from portal types for reusability)
// ============================================================================

/**
 * Color scheme options for exercises (simple string union)
 * Note: This is different from ColorScheme in visual-settings.ts which is a full interface
 */
export type ExerciseColorSchemePreset = 'standard' | 'redgreen' | 'bluewhite';

/**
 * Exercise assignment status types
 * - active: Assignment is currently active
 * - paused: Assignment is temporarily paused
 * - completed: Assignment has been completed
 * - cancelled: Assignment was cancelled
 */
export type ExerciseStatus = 'active' | 'paused' | 'completed' | 'cancelled';

/**
 * Difficulty level types
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

/**
 * Progress summary for patient exercises
 * Consolidated from portal types
 */
export interface ProgressSummary {
  totalExercises: number;
  completedExercises: number;
  averageScore: number;
  averageAccuracy: number;
  totalTimeSpent: number;
  progressPercentage: number;
  recentResults: ExerciseResult[];
}

/**
 * Level configuration for exercises
 */
export interface LevelConfig {
  level: number;
  difficulty: DifficultyLevel;
  minAccuracy: number;
  minScore: number;
  unlocked: boolean;
}

/**
 * Patient preferences for exercises
 */
export interface PatientPreferences {
  patientId: number;
  visualSettings?: {
    fontSize?: number;
    colorScheme?: ExerciseColorSchemePreset;
    contrast?: number;
  };
  lastUsed?: string;
}
