/**
 * Notification Service - All notification-related APIs
 * Merged from notification.service.ts and userNotificationService.ts
 * Clean functional approach, no classes
 */

import { getData, getDataTable, patchData, postData, deleteData } from 'src/utils/request';
import { buildUrl } from 'src/utils/query-builder';
import { PaginatedResponse } from 'src/types/core';
import type {
  Notification,
  UserNotification,
  NotificationStats,
  NotificationTemplate,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  ExamReminderRequest,
  ExerciseReminderRequest,
  QueryParams,
} from './types';

// ==================== ADMIN NOTIFICATION MANAGEMENT ====================

export const getNotifications = (
  params?: QueryParams
): Promise<PaginatedResponse<Notification>> => {
  const url = buildUrl('/notifications', params);
  return getDataTable<Notification>(url);
};

export const getNotification = (notificationId: number): Promise<Notification> => {
  return getData<Notification>(`/notifications/${notificationId}`);
};

export const createNotification = (data: CreateNotificationRequest): Promise<Notification> => {
  return postData<Notification>('/notifications', data);
};

export const updateNotification = (
  notificationId: number,
  data: UpdateNotificationRequest
): Promise<Notification> => {
  return patchData<Notification>(`/notifications/${notificationId}`, data);
};

export const deleteNotification = (notificationId: number): Promise<void> => {
  return deleteData<void>(`/notifications/${notificationId}`);
};

export const deleteNotifications = (ids: number[]): Promise<void> => {
  return deleteData<void>('/notifications', ids);
};

export const sendNotification = (notificationId: number): Promise<void> => {
  return postData<void>(`/notifications/${notificationId}/send`, {});
};

// ==================== NOTIFICATION TEMPLATES ====================

export const getNotificationTemplates = (params?: {
  category?: string;
  isActive?: boolean;
  limit?: number;
  page?: number;
}): Promise<PaginatedResponse<NotificationTemplate>> => {
  const url = buildUrl('/notification-templates', params);
  return getDataTable<NotificationTemplate>(url);
};

// ==================== USER NOTIFICATION APIS ====================

export const getUserNotifications = (params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: string;
  category?: string;
  priority?: string;
  channel?: string;
}): Promise<PaginatedResponse<UserNotification>> => {
  const queryParams = {
    ...params,
    sortBy: 'createdAt:desc',
  };
  const url = buildUrl('/me/notifications', queryParams);
  return getDataTable<UserNotification>(url);
};

export const getUserNotificationStats = (): Promise<NotificationStats> => {
  return getData<NotificationStats>('/me/notifications/stats');
};

export const getUserUnreadCount = (params?: { channel?: string }): Promise<{ count: number }> => {
  const search = params?.channel ? `?channel=${encodeURIComponent(params.channel)}` : '';
  return getData<{ count: number }>(`/me/notifications/unread-count${search}`);
};

export const markUserNotificationRead = (notificationId: number): Promise<void> => {
  return patchData<void>(`/me/notifications/${notificationId}/read`, {});
};

export const markAllUserNotificationsRead = (): Promise<void> => {
  return patchData<void>('/me/notifications/mark-all-read', {});
};

export const deleteUserNotification = (notificationId: number): Promise<void> => {
  return deleteData<void>(`/me/notifications/${notificationId}`);
};

// ==================== NOTIFICATION TEMPLATES & AUTOMATION ====================

export const sendExamReminder = (data: ExamReminderRequest): Promise<Notification> => {
  return postData<Notification>('/notifications/exam-reminder', data);
};

export const sendExerciseReminder = (data: ExerciseReminderRequest): Promise<Notification> => {
  return postData<Notification>('/notifications/exercise-reminder', data);
};

export const sendSystemAnnouncement = (data: {
  title: string;
  message: string;
  targetRole?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}): Promise<Notification> => {
  return postData<Notification>('/notifications/system-announcement', data);
};

/**
 * Send manual notification to one or multiple patients
 * POST /v1/notifications/send-manual
 *
 * Single patient: provide patientId
 * Multiple patients: provide patientIds array
 */
export const sendManualNotification = (data: {
  patientId?: number;
  patientIds?: number[];
  channel: 'email' | 'zalo' | 'sms' | 'web';
  subject?: string;
  content: string;
  templateId?: number;
}): Promise<
  | {
      // Single patient response
      success: boolean;
      sent: boolean;
      notification: Notification;
      error?: string;
    }
  | {
      // Multiple patients response
      total: number;
      success: number;
      failed: number;
      details: Array<{
        patientId: number;
        success: boolean;
        error: string | null;
        notificationId: number | null;
      }>;
    }
> => {
  return postData('/notifications/send-manual', data);
};

// ==================== NOTIFICATION SETTINGS ====================

export const getNotificationSettings = (): Promise<{
  enableEmail: boolean;
  enablePush: boolean;
  enableInApp: boolean;
  categories: Record<string, boolean>;
}> => {
  return getData('/users/current/notification-settings');
};

export const updateNotificationSettings = (settings: {
  enableEmail?: boolean;
  enablePush?: boolean;
  enableInApp?: boolean;
  categories?: Record<string, boolean>;
}): Promise<void> => {
  return patchData<void>('/users/current/notification-settings', settings);
};

// ==================== UTILITY FUNCTIONS ====================

export const markAsRead = (notificationId: number): Promise<void> => {
  return markUserNotificationRead(notificationId);
};

export const markAllAsRead = (): Promise<void> => {
  return markAllUserNotificationsRead();
};

export const deleteUserNotificationById = (notificationId: number): Promise<void> => {
  return deleteUserNotification(notificationId);
};

export const getTypeColor = (type: string): string => {
  switch (type) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'info':
    default:
      return 'info';
  }
};

export const getPriorityColor = (
  priority: string
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (priority) {
    case 'urgent':
      return 'error';
    case 'high':
      return 'warning';
    case 'normal':
      return 'primary';
    case 'low':
    default:
      return 'default';
  }
};

export const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN');
};
