/**
 * Main Types Index
 * Re-exports from core for backward compatibility
 *
 * IMPORTANT: All new code should import directly from 'src/types/core'
 * This file exists only for backward compatibility
 */

// ============================================================
// RE-EXPORT EVERYTHING FROM CORE
// ============================================================
export * from './core';

// ============================================================
// ADMIN DASHBOARD TYPES (Unique - not in core)
// ============================================================
export type {
  // Correlation Chart
  CorrelationDataPoint,
  CorrelationStatistics,
  CorrelationChartData,
  PatientCorrelationFilter,
  // Exam Dashboard
  ExamTrendData,
  // Exercise Dashboard
  ExerciseKPIData,
  ExerciseTypeStat,
  TopPerformer,
  // Patient Dashboard
  PatientKPIData,
  InactivePatient,
  ActivityTrendItem,
  ImprovementData,
  // Dashboard State
  DashboardFilterState,
  DashboardLoading,
  DashboardError,
  // Stats Responses (Tab 2 & 3 — BU-spec contract)
  ExamVisionTypeRow,
  ExamStatsKpi,
  ExamStatsResponse,
  ExerciseStatsResponse,
} from './admin/dashboard';

// ============================================================
// ADMIN PATIENT DETAIL TYPES (Unique - not in core)
// ============================================================
export type { PatientExerciseResult, BulkAssignPatient } from './admin/patient-detail';

// ============================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================

// Old naming conventions - use PascalCase versions instead
export type {
  RegisterType as registerType,
  LoginType as loginType,
  SignInType as signInType,
} from './core';

// Aliased types for old imports
export type {
  VisualSettings as CoreVisualSettings,
  VisualSettings as OldVisualSettings,
  Game2048State as CoreGame2048State,
  Game2048State as OldGame2048State,
  Game2048Options as OldGame2048Options,
  Game2048Result as CoreGame2048Result,
  Game2048Result as OldGame2048Result,
  GameType as CoreGameType,
  GameType as OldGameType,
  GameConfig as OldGameConfig,
  GameResult as OldGameResult,
  Exercise as CoreExercise,
  ExerciseConfig as CoreExerciseConfig,
  ExerciseAssignment as CoreExerciseAssignment,
  ExerciseResult as CoreExerciseResult,
  Patient as CorePatient,
  User as CoreUser,
  Role as CoreRole,
  ApiResponse as CoreApiResponse,
  PaginatedResponse as CorePaginatedResponse,
  PaginatedResponse as ApiPaginatedResponse,
  PaginatedResponse as DataTablePaginatedResponse,
} from './core';
