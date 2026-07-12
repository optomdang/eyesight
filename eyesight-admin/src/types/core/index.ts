/**
 * CORE TYPES - SINGLE EXPORT POINT
 * This is the unified entry point for all core type definitions
 *
 * Import from here instead of individual files:
 * import { VisualSettings, Exercise } from 'src/types/core'
 * import { VisualSettings } from 'src/types/exercise'
 */

// Visual Settings & Conditions
export type {
  ColorScheme,
  Contrast,
  Speed,
  ObjectSize,
  VisualSettings,
  PassConditions,
  AutoAdjustmentRules,
  ExerciseLevelConfig,
  DichopticMode,
  FellowContent,
  AnaglyphChannelMapping,
  DichopticBalanceParams,
  DichopticConfig,
  DichopticPresentation,
} from './visual-settings';

export {
  getColorSchemeConfig,
  getDefaultVisualSettings,
  getDefaultLevelConfig,
  getDefaultColorScheme,
  getDefaultPassConditions,
  DEFAULT_VISUAL_SETTINGS,
  DEFAULT_PASS_CONDITIONS,
  DEFAULT_AUTO_ADJUSTMENT_RULES,
  DICHOPTIC_PRESENTATION_OFF,
} from './visual-settings';

// Game2048 Specific Types
export type { GameManager, GameGrid, GameMetadata, GameState } from './game2048';

// Game Types
export type {
  Game2048State,
  Game2048Options,
  Game2048Result,
  Game2048SessionResult,
  GameType,
  GameConfig,
  GameResult,
  ExerciseGameResult,
} from './game';

// Exercise Types
export type {
  Exercise,
  ExerciseConfig,
  ExerciseAssignment,
  ExerciseResult,
  NotificationSettings,
  ExerciseProgressReport,
  PatientProgressReport,
  CreateExerciseDto,
  UpdateExerciseDto,
  CreateExerciseConfigDto,
  AssignExerciseDto,
  UpdateAssignmentDto,
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
  // Shared types (moved from portal)
  ExerciseColorSchemePreset,
  ExerciseStatus,
  DifficultyLevel,
  ProgressSummary,
  LevelConfig,
  PatientPreferences,
} from './exercise';

// Treatment Package Types
export type {
  TreatmentPackage,
  CreateTreatmentPackageData,
  UpdateTreatmentPackageData,
} from './treatmentPackage';

// API Types
export type {
  ApiResponse,
  PaginatedResponse,
  RequestConfig,
  ErrorResponse,
  QueryParams,
} from './api';

// User Types
export type {
  UserType,
  UserStatus,
  User,
  UserWithRole,
  Role,
  Permission,
  LoginCredentials,
  AuthTokens,
  CurrentUser,
} from './user';

// Patient Types
export type {
  Patient,
  PatientInfo,
  CreatePatientDto,
  UpdatePatientDto,
  PatientMetrics,
  PatientWithMetrics,
  PatientWithCompliance,
  PatientExercise,
  ExamTypeCompliance,
  ExamEyeResult,
  ExamTypeResults,
} from './patient';

// Portal Types (extends core types for patient portal UI)
export type {
  ExerciseSession,
  PortalExerciseAssignment,
  PortalExerciseConfig,
  AssignmentWithExercise,
  AssignmentStats,
  AssignmentProgress,
  PortalExamSession,
  ExamHistoryResult,
  PortalExerciseResult,
  ExerciseHistoryResult,
  TodaySession,
  PortalPatientExamInfo,
  ScoreTrendData,
  AchievementBadge,
} from './portal';

// Exam Types
export type {
  ExamResult,
  ExamAssignment,
  ExamSession,
  ExamMetric,
  ExamAssignmentQueryParams,
  CreateExamAssignmentRequest,
  UpdateExamAssignmentRequest,
  ExamDashboardResponse,
  ExamReminderRequest,
  ExamRawDataItem,
  ExamRawData,
  ExamResultData,
  ExamPerformance,
  ExamType,
  TestStatus,
  ExamTest,
  TestChar,
  ExamItem,
  ExamItems,
  TestItem,
  TestItems,
  ExamStep,
  ExamStepProps,
  TestStepProps,
} from './exam';

// Doctor Types
export type { Doctor, CreateDoctorRequest, UpdateDoctorRequest } from './doctor';

// Notification Types
export type {
  Notification,
  UserNotification,
  NotificationStats,
  NotificationChannel,
  NotificationTemplate,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  ExerciseReminderRequest,
  NotificationFilter,
} from './notification';

// System Types
export type { Center, Clinic, AuditLog, AuditLogActorUser } from './system';

// VT Quest
export type {
  VtWorld,
  VtResponseSide,
  VtTrial,
  VtSessionState,
  VtStageResult,
  VtResultMetrics,
  VtSettings,
  VtEngineState,
  VtGameScreen,
  VtStaircaseState,
  VtStaircaseParams,
  VtWorldMetrics,
  VtStimulusGaborConfig,
} from './vtQuest';
export { DEFAULT_VT_SETTINGS } from './vtQuest';

// Warranty E-Sign Types
export type {
  WarrantyAgreementStatus,
  WarrantyPhaseType,
  WarrantyPhaseStatus,
  WarrantySignatureRecord,
  WarrantyExamTypeClinical,
  WarrantyComplianceClinical,
  WarrantyClinicalData,
  WarrantyPhase,
  WarrantyAgreement,
  CreateWarrantyPhasePayload,
  UpdateWarrantyClinicalDataPayload,
  SignWarrantyPhasePayload,
} from './warranty';

// Common/Utility Types
export type {
  Severity,
  SelectOptions,
  FormDialogProps,
  TableState,
  FilterTable,
  CustomDataTableProps,
  DataTableContextState,
  DataTableProviderProps,
  RegisterType,
  LoginType,
  SignInType,
  MenuItem,
  MenuSection,
  FeatureModule,
  SnackbarState,
  SnackbarContextState,
} from './common';
