/**
 * NOTIFICATION TYPES
 * Single source of truth for notifications, reminders, and templates
 */

import type { User } from './user';

/**
 * Base notification
 */
export interface Notification {
  id: number;
  code?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'exam' | 'exercise' | 'system' | 'reminder';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  senderId?: string;
  receiverId?: number;
  receiver?: User;
  targetUserId?: number;
  targetPatientId?: number;
  targetRole?: string;
  recipientName?: string;
  recipientContact?: string;
  isRead: boolean;
  channel?: NotificationChannel;
  status?: 'sent' | 'delivered' | 'pending' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  sent?: boolean;
  centerId?: number;
  createdAt: string;
  updatedAt?: string;
  avatar?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Notification returned from user endpoints
 */
export type UserNotification = Notification;

/**
 * Notification statistics
 */
export interface NotificationStats {
  total: number;
  unread: number;
  todayCount: number;
  weekCount: number;
}

/**
 * Notification channel types
 */
export type NotificationChannel = 'email' | 'zalo' | 'sms' | 'web';

/**
 * Notification template for sending notifications
 */
export interface NotificationTemplate {
  id: number;
  code: string;
  name: string;
  type?: 'email' | 'zalo' | 'sms';
  category: 'exam' | 'exercise' | 'system' | 'reminder';
  event?: string;
  subject?: string;
  content?: string;
  variables?: string[];
  isDefault?: boolean;
  isActive?: boolean;
  centerId?: number;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Request to create notification
 */
export interface CreateNotificationRequest {
  code?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'exam' | 'exercise' | 'system' | 'reminder';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  senderId?: string;
  receiverId?: number;
  targetUserId?: number;
  targetPatientId?: number;
  targetRole?: string;
  scheduledAt?: string;
  centerId?: number;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Request to update notification
 */
export interface UpdateNotificationRequest {
  code?: string;
  title?: string;
  message?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  category?: 'exam' | 'exercise' | 'system' | 'reminder';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  isRead?: boolean;
  scheduledAt?: string;
  sent?: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Request to remind about exercise
 */
export interface ExerciseReminderRequest {
  patientId: number;
  exerciseId?: number;
  exerciseConfigId?: number;
  reminderType?: 'daily' | 'weekly' | 'custom';
  reminderTime?: string;
}

/**
 * Notification filter
 */
export interface NotificationFilter {
  type?: 'info' | 'warning' | 'error' | 'success';
  category?: 'exam' | 'exercise' | 'system' | 'reminder';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  sent?: boolean;
  isRead?: boolean;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}
