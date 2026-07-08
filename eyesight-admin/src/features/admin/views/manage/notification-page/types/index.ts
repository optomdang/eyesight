import type {
  Notification as BaseNotification,
  NotificationChannel,
  Patient as BasePatient,
  ExamSession,
  ExerciseConfig as BaseExerciseConfig,
} from 'src/types/core';

// Re-export types from global types
export type { ExamSession, NotificationChannel };

// Extended patient type with additional fields for the notification page
export interface Patient extends BasePatient {
  fullName?: string; // Computed field
}

// Extended exercise config type with additional fields for the notification page
export interface ExerciseConfig extends BaseExerciseConfig {
  exercise?: {
    name: string;
    description?: string;
  };
}

// Extended notification type with additional fields for the notification page
export interface Notification extends BaseNotification {
  channel?: NotificationChannel;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  recipientType: string;
  patientId?: number;
  examSessionId?: number;
  exerciseConfigId?: number;
  receiver?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
  };
  errorMessage?: string;
}

// Form interfaces specific to notification page
export interface ScheduleForm {
  type: 'exam' | 'exercise';
  patientId: string;
  examSessionId: string;
  exerciseConfigId: string;
  reminderTime: string;
  channels: NotificationChannel[];
  customMessage?: string;
}

export interface TestForm {
  type: 'exam' | 'exercise';
  patientId: string;
  exerciseConfigId: string;
  notificationType: string;
  channels: NotificationChannel[];
  customMessage?: string;
}

// Filter form types
export interface FilterFormData {
  receiverId?: string;
  category?: 'exam' | 'exercise' | 'system' | 'reminder' | '';
  sent?: 'true' | 'false' | '';
}

// Available channels for notification system (limited to Email and Zalo)
export const AVAILABLE_CHANNELS: NotificationChannel[] = ['email', 'zalo'];

// Channel display labels
export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'Email',
  zalo: 'Zalo',
};

// Default form values
export const DEFAULT_SCHEDULE_FORM: ScheduleForm = {
  type: 'exam',
  patientId: '',
  examSessionId: '',
  exerciseConfigId: '',
  reminderTime: '',
  channels: [],
  customMessage: '',
};

export const DEFAULT_TEST_FORM: TestForm = {
  type: 'exam',
  patientId: '',
  exerciseConfigId: '',
  notificationType: 'reminder',
  channels: [],
  customMessage: '',
};

export const DEFAULT_FILTER_FORM: FilterFormData = {
  receiverId: '',
  category: '',
  sent: '',
};
