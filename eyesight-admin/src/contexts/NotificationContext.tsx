import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useAuth from 'src/contexts/authGuard/useAuth';
import {
  getUserNotifications,
  markAsRead,
  getUserUnreadCount,
} from 'src/services/notification.service';
import type { UserNotification } from 'src/types/core';
import { registerFCMToken, deleteFCMToken, onForegroundMessage } from 'src/utils/firebase';
import useSnackbar from './UseSnackbar';

type NotificationContextValue = {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  markNotificationRead: (notificationId: number) => Promise<void>;
  loadNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  registerPush: () => Promise<void>;
  unregisterPush: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuth();

  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  const pushRegisteredRef = useRef(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      // By default, count only 'web' (in-app) notifications used for header badge
      const res = await getUserUnreadCount({ channel: 'web' });
      setUnreadCount(res.count || 0);
    } catch (e) {
      console.error('Failed to fetch unread count', e);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUserNotifications({ isRead: false, limit: 5, channel: 'web' });
      setNotifications(response.rows);
      setUnreadCount(response.count);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;
    // Only fetch the cheap unread count on auth init (web channel only); full list will be loaded on demand when user opens the menu
    void fetchUnreadCount();

    // If user already granted push permissions, try to register the token silently
    if (
      typeof Notification !== 'undefined' &&
      typeof window !== 'undefined' &&
      window.isSecureContext
    ) {
      // Attempt push registration on login: request permission and register token
      // Do it once per session to align with clinic-management flow (login -> create token -> store on server)
      if (!pushRegisteredRef.current) {
        pushRegisteredRef.current = true;
        void registerPush();
      }
    } else {
      console.warn('Push notifications not supported in this environment (requires HTTPS)');
    }
  }, [isInitialized, isAuthenticated, fetchUnreadCount]);

  useEffect(() => {
    if (!isInitialized || isAuthenticated) return;
    setNotifications([]);
    setUnreadCount(0);
    setLoading(false);
  }, [isInitialized, isAuthenticated]);

  const markNotificationRead = useCallback(async (notificationId: number) => {
    await markAsRead(notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Setup FCM foreground message listener
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = onForegroundMessage((payload: any) => {
      // Show snackbar immediately
      showSnackbar(payload.notification?.title || 'Thông báo', 'info');

      // Fetch latest data from server to get the real notification record
      // Backend has already created the notification in DB
      void fetchUnreadCount();
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isAuthenticated, showSnackbar, fetchUnreadCount]);

  // Use snackbar to show messages to the user
  // Import hook safely at top and call it inside component
  // (This will work because we're inside a React component)

  const registerPush = useCallback(async () => {
    try {
      const success = await registerFCMToken();
      if (success) {
        showSnackbar('Đã bật thông báo', 'success');
        return { success: true };
      }
      showSnackbar('Không thể đăng ký thông báo (quyền bị từ chối)', 'warning');
      return { success: false };
    } catch (e) {
      showSnackbar('Đăng ký thông báo thất bại', 'error');
      return { success: false, error: (e as Error)?.message };
    }
  }, [showSnackbar]);

  const unregisterPush = useCallback(async () => {
    try {
      await deleteFCMToken();
      showSnackbar('Đã tắt thông báo', 'info');
    } catch (e) {
      console.warn('Failed to unregister push', e);
    }
  }, [showSnackbar]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      markNotificationRead,
      loadNotifications,
      fetchUnreadCount,
      registerPush,
      unregisterPush,
    }),
    [
      notifications,
      unreadCount,
      loading,
      markNotificationRead,
      loadNotifications,
      fetchUnreadCount,
      registerPush,
      unregisterPush,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
