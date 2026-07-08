/**
 * Admin Feature Types
 * Re-exports types specific to admin feature
 */

// Re-export from main types to avoid circular dependencies
export type {
  User,
  CreateAdminUserRequest,
  CreateDoctorUserRequest,
  UserCreatePatientRequest,
  Role,
  Patient,
  TreatmentPlan,
  ExamSession,
  ExamResultData,
  ExamRawDataItem,
  ExamRawData,
  ExamResult,
  ExamAssignment,
  ExamMetric,
  Doctor,
  CreateDoctorRequest,
  UpdateDoctorRequest,
  VisualSettings,
  PassConditions,
  AutoAdjustmentRules,
  ExerciseConfig,
  Exercise,
  ExerciseAssignment,
  PatientProgressReport,
  CreateExerciseConfigData,
  UpdateExerciseConfigData,
  CreateExerciseData,
  UpdateExerciseData,
  AssignExerciseToPatientData,
  UpdateExerciseAssignmentData,
  LevelAdjustmentData,
  SetLevelData,
  ToggleAutoAdjustData,
  ConfigurePassConditionsData,
  ExerciseNotificationSettings,
  Notification,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationResponse,
  ExamReminderRequest,
  ExamNotificationResponse,
  ExerciseReminderRequest,
  DeleteNotificationsRequest,
  NotificationChannel,
  NotificationChannelConfig,
  TestNotificationRequest,
  ScheduleNotificationRequest,
  NotificationFilter,
} from 'src/types';

// Feature-specific types can be added here
export interface AdminDashboardData {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalExamSessions: number;
  recentActivities: any[];
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    uptime: number;
    lastBackup: string;
  };
}

export interface AdminFeatureConfig {
  enableAdvancedReports: boolean;
  enableBulkOperations: boolean;
  enableUserImpersonation: boolean;
  maxBulkOperationSize: number;
}
