/**
 * Sentry Configuration for Error Tracking
 *
 * Setup instructions:
 * 1. Install Sentry SDK: npm install @sentry/node @sentry/profiling-node
 * 2. Add SENTRY_DSN to .env file
 * 3. Import this file in app.js before other imports
 *
 * Environment variables:
 * - SENTRY_DSN: Your Sentry project DSN
 * - SENTRY_ENVIRONMENT: Environment name (development, staging, production)
 * - SENTRY_TRACES_SAMPLE_RATE: Performance monitoring sample rate (0.0 to 1.0)
 */

const Sentry = require('@sentry/node');
// Disable profiling on Alpine Linux (musl) - native module not compatible
// const { nodeProfilingIntegration } = require('@sentry/profiling-node');
const config = require('./config');
const packageJson = require('../../package.json');

/**
 * Initialize Sentry if DSN is configured
 */
const initSentry = () => {
  if (!config.sentry?.dsn) {
    console.log('Sentry DSN not configured, skipping error tracking setup');
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.env,
    release: `eye-sight-service@${packageJson.version}`,

    // Profiling disabled on Alpine Linux (musl compatibility issue)
    // integrations: [nodeProfilingIntegration()],

    // Send structured logs to Sentry
    enableLogs: true,

    // Performance Monitoring
    tracesSampleRate: config.sentry.tracesSampleRate || 0.1, // Capture 10% of transactions

    // Profiling disabled - native module not compatible with Alpine Linux
    // profileSessionSampleRate: config.sentry.profilesSampleRate || 0.1,
    // profileLifecycle: 'trace',

    // Send default PII (IP address, user info) to Sentry
    sendDefaultPii: true,

    // Filter out certain errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Don't send operational errors to Sentry (e.g., validation errors, not found)
      if (error && error.isOperational) {
        // Only send operational errors with status >= 500
        if (error.statusCode && error.statusCode < 500) {
          return null;
        }
      }

      // Add custom context
      if (error) {
        event.contexts = {
          ...event.contexts,
          errorDetails: {
            errorCode: error.errorCode,
            statusCode: error.statusCode,
            metadata: error.metadata,
          },
        };
      }

      return event;
    },

    // Add custom tags for better filtering in Sentry
    initialScope: {
      tags: {
        service: 'eye-sight-service',
        node_version: process.version,
      },
    },
  });

  console.log(`Sentry initialized for environment: ${config.env}`);
};

/**
 * Setup Express error handler middleware (Sentry v8+)
 * Must be registered AFTER all controllers but BEFORE other error handlers
 * @param {Express.Application} app - Express app instance
 */
const setupExpressErrorHandler = (app) => {
  if (!config.sentry?.dsn) {
    return;
  }

  // Use official Sentry Express error handler
  // This automatically captures errors and enriches them with request context
  Sentry.setupExpressErrorHandler(app);
};

/**
 * Enhanced error handler with custom context
 * Use this for manual error capturing with additional context
 */
const errorHandlerWithContext = () => {
  return (err, req, res, next) => {
    if (config.sentry?.dsn) {
      // Capture exception with custom context
      Sentry.captureException(err, {
        contexts: {
          request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            query: req.query,
          },
          user: {
            id: req.user?.id,
            email: req.user?.email,
            userType: req.user?.userType,
            centerId: req.user?.centerId,
          },
          error: {
            errorCode: err.errorCode,
            statusCode: err.statusCode,
            metadata: err.metadata,
          },
        },
      });
    }

    // Pass to next error handler
    next(err);
  };
};

/**
 * Manually capture exception (for use in catch blocks)
 * @param {Error} error - Error to capture
 * @param {Object} context - Additional context
 */
const captureException = (error, context = {}) => {
  if (!config.sentry?.dsn) {
    return;
  }

  Sentry.captureException(error, {
    extra: context,
    tags: {
      errorCode: error.errorCode,
      statusCode: error.statusCode,
    },
  });
};

/**
 * Manually capture message
 * @param {string} message - Message to capture
 * @param {string} level - Severity level (fatal, error, warning, info, debug)
 * @param {Object} context - Additional context
 */
const captureMessage = (message, level = 'info', context = {}) => {
  if (!config.sentry?.dsn) {
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Set user context for error tracking
 * @param {Object} user - User object
 */
const setUser = (user) => {
  if (!config.sentry?.dsn) {
    return;
  }

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      userType: user.userType,
      centerId: user.centerId,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Add breadcrumb for debugging
 * @param {Object} breadcrumb - Breadcrumb data
 */
const addBreadcrumb = (breadcrumb) => {
  if (!config.sentry?.dsn) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
};

module.exports = {
  initSentry,
  setupExpressErrorHandler,
  errorHandlerWithContext,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  // Export Sentry instance for advanced usage (logger, metrics, etc.)
  Sentry,
};
