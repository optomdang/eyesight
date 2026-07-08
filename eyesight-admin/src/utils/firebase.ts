// firebase.ts - Firebase configuration for Eye-Sight Frontend
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { patchData } from './request';

// Firebase Web Config - Eye-Sight App
export const firebaseConfig = {
  apiKey: 'AIzaSyAwOsfS1X4IMFP-wU9VdHMCU0dR4A7H1Rg',
  authDomain: 'vnb-clinic-management.firebaseapp.com',
  projectId: 'vnb-clinic-management',
  storageBucket: 'vnb-clinic-management.firebasestorage.app',
  messagingSenderId: '973836519597',
  appId: '1:973836519597:web:d6235cf35a651dd4531e24',
  measurementId: 'G-RTZ7TQ92DX',
};

// VAPID Key for web push (from firebase-admin-sdk.json)
export const vapidKey =
  'BC1WtoXnxSJDsXVKXgK-zRen1hVemIeXRFEgQy_5Bdswjt55wsADR5K_X2DIx_ZWwWm4TxBKgt-WqI1vLOi6bkI';

// Initialize Firebase app
export const app = initializeApp(firebaseConfig);

let messagingInstance: Messaging | null = null;

/**
 * Check if browser supports Firebase Messaging
 */
const isMessagingSupported = (): boolean => {
  // Check for HTTPS (required for Service Worker and Notification API)
  const isSecureContext =
    window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost';

  // Check for Service Worker support
  const hasServiceWorker = 'serviceWorker' in navigator;

  // Check for Notification API
  const hasNotifications = 'Notification' in window;

  // Check for Push API
  const hasPushManager = 'PushManager' in window;

  return isSecureContext && hasServiceWorker && hasNotifications && hasPushManager;
};

/**
 * Initialize Firebase Cloud Messaging
 * Registers service worker and returns messaging instance
 */
export const initializeMessaging = async (): Promise<Messaging | null> => {
  try {
    // Check browser support first
    if (!isMessagingSupported()) {
      return null;
    }

    // Register service worker for background messages
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    }

    // Initialize messaging
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging:', error);
    return null;
  }
};

/**
 * Get Firebase Cloud Messaging instance
 */
export const getMessagingInstance = (): Messaging | null => {
  try {
    // Check support before initializing
    if (!isMessagingSupported()) {
      return null;
    }

    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }
    return messagingInstance;
  } catch (error) {
    console.error('Failed to get messaging instance:', error);
    return null;
  }
};

/**
 * Request notification permission and get FCM token
 * @returns FCM token or null if permission denied/error
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    // Check browser support
    if (!isMessagingSupported()) {
      return null;
    }

    // Check if Notification API exists
    if (!('Notification' in window)) {
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      return null;
    }

    // Get messaging instance
    const messaging = getMessagingInstance();
    if (!messaging) {
      return null;
    }

    // Get FCM token
    const currentToken = await getToken(messaging, { vapidKey });

    if (currentToken) {
      return currentToken;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Send FCM token to backend
 * @param token - FCM registration token
 */
export const sendTokenToBackend = async (token: string): Promise<void> => {
  try {
    await patchData('/me/fcm-token', { token });
  } catch (error) {
    throw error;
  }
};

/**
 * Register FCM token - combines permission request and backend registration
 * @returns true if successful, false otherwise
 */
export const registerFCMToken = async (): Promise<boolean> => {
  try {
    const token = await requestNotificationPermission();

    if (!token) {
      return false;
    }

    await sendTokenToBackend(token);
    return true;
  } catch (error) {
    console.error('Failed to register FCM token:', error);
    return false;
  }
};

/**
 * Setup foreground message listener
 * @param callback - Function to handle incoming messages
 */
export const onForegroundMessage = (callback: (payload: any) => void): (() => void) => {
  const messaging = getMessagingInstance();

  if (!messaging) {
    return () => {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return onMessage(messaging, (payload: any) => {
    callback(payload);
  });
};

/**
 * Delete FCM token from backend
 */
export const deleteFCMToken = async (): Promise<void> => {
  try {
    await patchData('/me/fcm-token', { token: null });
  } catch (error) {
    throw error;
  }
};
