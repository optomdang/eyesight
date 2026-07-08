/**
 * PORTAL TYPES - Consolidated Type Definitions
 * Source of Truth for Portal Feature Types
 */

// RE-EXPORTS FROM CORE

import type {
  Exercise,
  ExerciseConfig,
  ExerciseAssignment,
  // Shared types now from core
  ColorScheme,
  ExerciseStatus,
  DifficultyLevel,
  ProgressSummary,
  LevelConfig,
  PatientPreferences,
} from 'src/types/core/exercise';

import type { VisualSettings } from 'src/types/core/visual-settings';
import type { Game2048State } from 'src/types/core';

export type {
  Exercise,
  ExerciseConfig,
  ExerciseAssignment,
  // Re-export shared types
  ColorScheme,
  ExerciseStatus,
  DifficultyLevel,
  ProgressSummary,
  LevelConfig,
  PatientPreferences,
} from 'src/types/core/exercise';

export type { VisualSettings } from 'src/types/core/visual-settings';
export type { Game2048State } from 'src/types/core';

export interface PortalExerciseResult {
  id: number;
  exerciseId: number;
  assignmentId: number;
  sessionId?: string;
  level: number;
  score: number;
  accuracy: number;
  duration: number;
  movesCount?: number;
  status: 'incomplete' | 'completed';
  createdAt: string;
  metadata?: Record<string, any>;
}

// REQUEST/RESPONSE DTOs

export interface SubmitExerciseResultRequest {
  exerciseAssignmentId: number;
  exerciseSessionId: number;
  level: number;
  score: number;
  accuracy: number;
  duration: number;
  status?: 'incomplete' | 'completed';
  movesCount?: number;
  metadata?: Record<string, any>;
}

export interface SubmitExerciseResultResponse {
  id: number;
  sessionId: number;
  level: number;
  score: number;
  accuracy: number;
  status: 'incomplete' | 'completed';
  levelAdjusted?: boolean;
  newLevel?: number;
  createdAt: string;
}

// LEVEL MANAGEMENT

export interface LevelProgressRequest {
  exerciseId: string;
  level: number;
  score: number;
  accuracy: number;
  completionTime: number;
  passed: boolean;
}

export interface LevelProgressResponse {
  levelPassed: boolean;
  newLevelUnlocked: boolean;
  nextLevel?: number;
}

// HOOK RETURN TYPES

export interface UseExerciseReturn {
  exercises: any[];
  loading: boolean;
  error: string | null;
  reload: (params?: ExerciseLoadParams) => Promise<void>;
}

export interface UseExerciseResultsReturn {
  results: PortalExerciseResult[];
  loading: boolean;
  error: string | null;
  loadResults: (params?: ExerciseResultsParams) => Promise<void>;
  submitResult: (data: SubmitExerciseResultRequest) => Promise<any>;
}

export interface UseLevelConfigReturn {
  config: LevelConfig | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export interface UseLevelProgressReturn {
  submitProgress: (data: LevelProgressRequest) => Promise<LevelProgressResponse>;
  submitting: boolean;
  error: string | null;
  lastResponse: LevelProgressResponse | null;
}

export interface UseLevelProgressionReturn {
  progression: ExerciseLevelProgression | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export interface Use2048ExerciseReturn {
  // State
  assignment: ExerciseAssignment | null;
  session: PortalExerciseSession | null;
  gameState: Game2048State | null;
  visualSettings: VisualSettings;
  loading: boolean;
  error: string | null;
  submittingResult: boolean;

  // Actions
  calculateLevel: () => Promise<number>;
  initializeGame: (gameInstance: any) => void;
  updateGameState: (newState: Partial<Game2048State>) => void;
  handleGameComplete: (finalScore: number, gameWon: boolean) => Promise<void>;
  updateVisualSettings: (updates: Partial<VisualSettings>) => void;
  saveProgress: (sessionData?: any) => void;
  loadProgress: () => any;

  // Computed
  currentLevel?: number;
  canAdjustLevel?: boolean;
  isAutoAdjustEnabled?: boolean;
}

// PARAMETER TYPES

export interface ExerciseLoadParams {
  status?: ExerciseStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ExerciseResultsParams {
  exerciseId?: string;
  sessionId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// SESSION & PROGRESSION

export interface PortalExerciseSession {
  id: number;
  code: string;
  exerciseAssignmentId: number;
  patientId: number;
  status: 'incomplete' | 'completed';
  startedAt: string;
  duration?: number;
  executionsCompleted: number;
  totalScore: number;
  averageScore: number;
  bestScore: number;
  createdAt: string;
}

export interface ExerciseLevelProgression {
  exerciseId: number;
  currentLevel: number;
  maxLevel: number;
  unlockedLevels: number[];
  history: Array<{
    level: number;
    unlockedAt: string;
  }>;
}

export interface RecommendedLevel {
  recommended: number;
  reason: string;
  confidence: number;
}

export interface PerformanceMetrics {
  averageScore: number;
  averageAccuracy: number;
  completionRate: number;
  recentPassed: boolean;
}
