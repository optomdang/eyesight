/**
 * PORTAL-SPECIFIC TYPE EXTENSIONS
 * Extends core types for patient portal features
 *
 * These types extend the core types with portal-specific structure
 * that handles UI-specific data like currentSession and levels
 */

import type { ExerciseAssignment, ExerciseConfig, VisualSettings } from './index';

// ============ EXERCISE SESSION ============

/**
 * Exercise session for tracking execution progress
 *
 * Session status (simplified):
 * - incomplete: Session created but not all required executions done
 * - completed: All required executions done and valid
 *
 * Note: Status is derived from executionsCompleted vs requiredExecutions
 */
export interface ExerciseSession {
  id: number;
  code?: string;
  assignmentId?: number;
  exerciseAssignmentId?: number;
  startDate?: string;
  startedAt?: string;
  endDate?: string;
  completedAt?: string;

  // Execution tracking
  executionsCompleted: number;
  validExecutions: number;
  requiredExecutions?: number;

  // Performance metrics
  validityPercentage: number; // Percentage of valid executions
  totalScore: number;
  averageScore: number;
  bestScore: number;
  percentage?: number; // Overall completion percentage

  // Status from backend: 'incomplete' | 'completed'
  status?: 'incomplete' | 'completed';

  createdAt: string;
  updatedAt: string;

  // Relations
  exerciseAssignment?: PortalExerciseAssignment;
}

// ============ PORTAL EXERCISE ASSIGNMENT ============

/**
 * Portal-specific Exercise Assignment with session and config details
 * Extends the core ExerciseAssignment with nested relations for UI rendering
 */
export interface PortalExerciseAssignment
  extends Omit<ExerciseAssignment, 'exercise' | 'exerciseConfig'> {
  // Nested relations for portal display
  currentSession?: ExerciseSession;
  exerciseConfig?: PortalExerciseConfig;
  exercise?: {
    id: number;
    name: string;
    code: string;
    exerciseType: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  // Computed by backend: sessionsCompleted / expectedSessionsToDate * 100
  compliancePercentage?: number | null;
}

// ============ PORTAL EXERCISE CONFIG ============

/**
 * Portal-specific Exercise Config with level configurations
 * Used in portal components to render different visual settings per level
 */
export interface PortalExerciseConfig extends Partial<ExerciseConfig> {
  exerciseId: number;

  // Portal-specific levels mapping
  levels?: Record<string, VisualSettings>;

  // Execution configuration
  executionCount?: number;

  // Exercise tool info
  exerciseTool?: string;
  eye?: 'right' | 'left' | 'both';

  // Relations
  exercise?: {
    id: number;
    name: string;
    code: string;
    exerciseType: string;
  };
}

// ============ ASSIGNMENT WITH EXERCISE ============

/**
 * Assignment with full exercise details
 */
export interface AssignmentWithExercise extends PortalExerciseAssignment {
  exercise: {
    id: number;
    name: string;
    code: string;
    exerciseType: string;
    description?: string;
    instructions?: string;
  };
  exerciseConfig: PortalExerciseConfig;
}

// ============ ASSIGNMENT STATISTICS ============

export interface TodaySession {
  assignmentId: number;
  exerciseName: string;
  frequency: string;
  todayCompleted: number;
  todayRequired: number;
  isCompleted: boolean;
  complianceStatus?: string;
  currentSessionId?: number | null;
}

/**
 * Statistics about patient's assignments
 * Matches response from /me/assignments/stats
 */
export interface AssignmentStats {
  assignments: TodaySession[];
  summary: {
    totalAssignments: number;
    activeAssignments: number;
    totalSessions: number;
    averageScore: number;
    totalTime: number;
    complianceOverview: {
      compliant: number;
      overdue: number;
      critical: number;
    };
  };
}

/**
 * Assignment progress tracking
 */
export interface AssignmentProgress {
  assignmentId: number;
  totalSessions: number;
  completedSessions: number;
  currentSession?: ExerciseSession;
  nextDueDate?: string;
  isOverdue: boolean;
  progressPercentage: number;
}

// ============ PORTAL EXAM TYPES ============

/**
 * Exam session for portal
 */
export interface PortalExamSession {
  id: number;
  code: string;
  patientId: number;
  examType: 'far' | 'near' | 'contrast' | 'stereopsis';
  status: 'incomplete' | 'completed';
  scheduledDate: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

/**
 * Exam result for history table
 */
export interface ExamHistoryResult {
  id: number;
  code: string;
  examType: string;
  status: string;
  charType?: string | null;
  accuracy?: number | null;
  leftEyeLevel?: number | null;
  rightEyeLevel?: number | null;
  bothEyeLevel?: number | null;
  rawData?: Record<string, unknown>;
  completedAt: string | null;
  createdAt: string;
}

// ============ PORTAL EXERCISE RESULT ============

/**
 * Exercise result from backend
 */
export interface PortalExerciseResult {
  id: number;
  score: number;
  accuracy: number;
  duration: number;
  status: 'valid' | 'invalid' | 'pending';
  createdAt: string;
  startedAt: string;
  completedAt: string | null;
  level: number;
  exerciseId: number;
  assignmentId: number;
  sessionId: number;
}

/**
 * Exercise result for history table
 */
export interface ExerciseHistoryResult {
  id: number;
  exerciseId: number;
  exercise: {
    id: number;
    name: string;
    code: string;
    exerciseType: string;
  };
  level: number;
  score: number;
  accuracy: number;
  duration: number;
  status: 'incomplete' | 'completed';
  createdAt: string;
}

// ============ PORTAL HOME TYPES ============

/**
 * Today's session item
 */
export interface TodaySession {
  id?: number;
  assignmentId: number;
  exerciseName: string;
  frequency: string;
  todayCompleted: number;
  todayRequired: number;
  isCompleted: boolean;
}

/**
 * Patient exam results for portal dashboard
 * @deprecated Use PatientInfo from patient.ts instead
 */
export interface PortalPatientExamInfo {
  examResults?: {
    far?: {
      currentResult?: {
        leftEye?: number;
        rightEye?: number;
      };
      lastExamDate?: string;
    };
    near?: {
      currentResult?: {
        leftEye?: number;
        rightEye?: number;
      };
      lastExamDate?: string;
    };
    contrast?: {
      currentResult?: {
        leftEye?: number;
        rightEye?: number;
      };
      lastExamDate?: string;
    };
  };
}

/**
 * Score trend data for charts
 */
export interface ScoreTrendData {
  date: string;
  score: number;
  sessionCount: number;
}

/**
 * Achievement badge display
 */
export interface AchievementBadge {
  id: string;
  name: string;
  icon: string;
  unlocked: boolean;
  description: string;
}
