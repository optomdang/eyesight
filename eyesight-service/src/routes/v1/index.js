const express = require('express');
const config = require('../../config/config');

// Authentication routes
const authRoute = require('./authentication/auth.route');
const userRoute = require('./authentication/user.route');
const roleRoute = require('./authentication/role.route');
const meRoute = require('./me/me.route');

// System routes
const centerRoute = require('./system/center.route');
const clinicRoute = require('./system/clinic.route');
const notificationRoute = require('./system/notification.route');
const notificationTemplateRoute = require('./system/notificationTemplate.route');
const scheduleRoute = require('./system/schedule.route');
const jobRoute = require('./system/job.route');
const auditLogRoute = require('./system/auditLog.route');

// Clinic routes
const doctorRoute = require('./clinic/doctor.route');
const patientRoute = require('./clinic/patient.route');
const examAssignmentRoute = require('./clinic/examAssignment.route');
const warrantyAgreementRoute = require('./clinic/warrantyAgreement.route');

// Exam routes
const examSessionRoute = require('./exam/examSession.route');
const examResultRoute = require('./exam/examResult.route');
const examMetricRoute = require('./exam/examMetric.route');
const examNotificationRoute = require('./exam/examNotification.route');

// Exercise routes
const exerciseRoute = require('./exercise/exercise.route');
const exerciseConfigRoute = require('./exercise/exerciseConfig.route');
const exerciseResultRoute = require('./exercise/exerciseResult.route');
const exerciseAssignmentRoute = require('./exercise/exerciseAssignment.route');
const exerciseComplianceRoute = require('./exercise/exerciseCompliance.route');
const treatmentPackageRoute = require('./exercise/treatmentPackage.route');

// Integration routes
const zaloRoute = require('./zalo/zalo.route');

// Tools (admin preview)
const ttsPreviewRoute = require('./tools/ttsPreview.route');

// Standalone routes
const dashboardRoute = require('./dashboard.route');
const docsRoute = require('./docs.route');

const router = express.Router();

/**
 * Route configuration arrays organized by domain
 * Each route follows the pattern: { path, route }
 * Paths use kebab-case for multi-word resources
 */

// Authentication domain routes
const authenticationRoutes = [
  { path: '/auth', route: authRoute },
  { path: '/users', route: userRoute },
  { path: '/roles', route: roleRoute },
  { path: '/me', route: meRoute },
];

// System domain routes
const systemRoutes = [
  { path: '/centers', route: centerRoute },
  { path: '/clinics', route: clinicRoute },
  { path: '/notifications', route: notificationRoute },
  { path: '/notification-templates', route: notificationTemplateRoute },
  { path: '/schedules', route: scheduleRoute },
  { path: '/jobs', route: jobRoute },
  { path: '/audit-logs', route: auditLogRoute },
];

// Clinic domain routes
const clinicRoutes = [
  { path: '/doctors', route: doctorRoute },
  { path: '/patients', route: patientRoute },
  { path: '/exam-assignments', route: examAssignmentRoute },
  { path: '/warranty-agreements', route: warrantyAgreementRoute },
];

// Exam domain routes
const examRoutes = [
  { path: '/exam-sessions', route: examSessionRoute },
  { path: '/exam-results', route: examResultRoute },
  { path: '/exam-metrics', route: examMetricRoute },
  { path: '/exam-notifications', route: examNotificationRoute },
];

// Exercise domain routes
const exerciseRoutes = [
  { path: '/exercises', route: exerciseRoute },
  { path: '/exercise-configs', route: exerciseConfigRoute },
  { path: '/exercise-results', route: exerciseResultRoute },
  { path: '/exercise-assignments', route: exerciseAssignmentRoute },
  { path: '/exercise-compliance', route: exerciseComplianceRoute },
  { path: '/treatment-packages', route: treatmentPackageRoute },
];

// Integration routes
const integrationRoutes = [
  { path: '/zalo', route: zaloRoute },
  { path: '/tts-preview', route: ttsPreviewRoute },
];

// Standalone routes
const standaloneRoutes = [{ path: '/dashboard', route: dashboardRoute }];

// Development-only routes
const devRoutes = [{ path: '/docs', route: docsRoute }];

/**
 * Register routes by domain
 * Maintains consistent ordering and organization
 */

// Register authentication routes
authenticationRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

// Register system routes
systemRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

// Register clinic routes
clinicRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

// Register exam routes
examRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

// Register exercise routes
exerciseRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

// Register integration routes
integrationRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

// Register standalone routes
standaloneRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

// Register development routes (only in development mode)
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });

  // Sentry test endpoint (development only)
  router.get('/debug-sentry', (req, res, next) => {
    const { Sentry } = require('../../config/sentry');

    // Send structured log to Sentry
    if (Sentry.logger) {
      Sentry.logger.info('User triggered test error endpoint', {
        action: 'test_error_endpoint',
        timestamp: new Date().toISOString(),
      });
    }

    // Send test metric to Sentry (if available)
    if (Sentry.metrics && Sentry.metrics.increment) {
      Sentry.metrics.increment('test_error_counter', 1, {
        tags: { endpoint: 'debug-sentry' },
      });
    }

    // Throw test error
    try {
      throw new Error('Sentry test error - This is intentional for testing!');
    } catch (error) {
      next(error); // Pass to Sentry error handler
    }
  });
}

module.exports = router;
