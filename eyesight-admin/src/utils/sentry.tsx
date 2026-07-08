/**
 * Sentry setup and helper utilities for frontend error tracking.
 */

import * as Sentry from '@sentry/react';

interface SentryConfig {
  dsn?: string;
  environment?: string;
  tracesSampleRate?: number;
  sendDefaultPii?: boolean;
}

/**
 * Initialize Sentry for React application
 * @param config - Sentry configuration options
 */
export const initSentry = (config?: SentryConfig) => {
  const dsn = config?.dsn || import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: config?.environment || import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',

    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii:
      config?.sendDefaultPii ??
      (import.meta.env.VITE_SENTRY_SEND_DEFAULT_PII === 'true' ? true : false),

    // Performance Monitoring
    tracesSampleRate:
      config?.tracesSampleRate || Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) || 0.1,

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            // Remove passwords, tokens, etc.
            const { password, token, accessToken, refreshToken, ...safeData } = breadcrumb.data;
            return { ...breadcrumb, data: safeData };
          }
          return breadcrumb;
        });
      }

      // Add custom context
      const error = hint.originalException as any;
      if (error?.response) {
        event.contexts = {
          ...event.contexts,
          apiError: {
            status: error.response.status,
            statusText: error.response.statusText,
            errorCode: error.response.data?.errorCode,
            message: error.response.data?.message,
          },
        };
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      // Browser extension errors
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // Random plugins/extensions
      "Can't find variable: ZiteReader",
      'jigsaw is not defined',
      'ComboSearch is not defined',
      // Facebook
      'fb_xd_fragment',
      // Other
      'ResizeObserver loop limit exceeded',
    ],
  });
};

/**
 * Set user context in Sentry
 * Call this after successful login
 */
export const setUser = (
  user: {
    id: number;
    email: string;
    userType: string;
    centerId?: number;
  } | null
) => {
  if (user) {
    Sentry.setUser({
      id: String(user.id),
      email: user.email,
      userType: user.userType,
      centerId: user.centerId,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Capture exception manually
 * Use this in try-catch blocks for critical operations
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture message for informational logging
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) => {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Add breadcrumb for debugging context
 * Useful for tracking user actions before an error
 */
export const addBreadcrumb = (breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}) => {
  Sentry.addBreadcrumb(breadcrumb);
};

/**
 * Set tag for filtering in Sentry dashboard
 */
export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

/**
 * Set context for additional debugging info
 */
export const setContext = (name: string, context: Record<string, any>) => {
  Sentry.setContext(name, context);
};

/**
 * Wrap a component with Sentry error boundary
 * This will catch React component errors
 */
export const withSentryErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ReactElement;
    showDialog?: boolean;
  }
) => {
  return Sentry.withErrorBoundary(Component, {
    fallback: options?.fallback || <ErrorFallback />,
    showDialog: options?.showDialog || false,
  });
};

/**
 * Default error fallback component
 */
const ErrorFallback: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '20px',
      }}
    >
      <h2>Đã xảy ra lỗi</h2>
      <p>Chúng tôi đã ghi nhận sự cố và sẽ khắc phục sớm nhất có thể.</p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Tải lại trang
      </button>
    </div>
  );
};

// Export Sentry instance for advanced usage
export { Sentry };
