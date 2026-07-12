module.exports.authController = require('./authentication/auth.controller');
module.exports.userController = require('./authentication/user.controller');
module.exports.roleController = require('./authentication/role.controller');
module.exports.exerciseConfigController = require('./exercise/exerciseConfig.controller');
module.exports.portalController = require('./exercise/portal.controller');
module.exports.exerciseAssignmentController = require('./exercise/exerciseAssignment.controller');
module.exports.exerciseComplianceController = require('./exercise/exerciseCompliance.controller');
module.exports.levelAdjustmentController = require('./exercise/levelAdjustment.controller');

// Clinic controllers
module.exports.examAssignmentController = require('./clinic/examAssignment.controller');
module.exports.patientController = require('./clinic/patient.controller');
module.exports.warrantyAgreementController = require('./clinic/warrantyAgreement.controller');
module.exports.doctorController = require('./clinic/doctor.controller');

// Exam controllers
module.exports.examMetricController = require('./exam/examMetric.controller');
// complianceController removed - using ExamMetrics calculation instead
module.exports.examNotificationController = require('./exam/examNotification.controller');
module.exports.examResultController = require('./exam/examResult.controller');
module.exports.examSessionController = require('./exam/examSession.controller');
module.exports.exerciseResultController = require('./exam/exerciseResult.controller');

// Dashboard controllers
module.exports.dashboardController = require('./dashboard/dashboard.controller');

// System controllers
module.exports.centerController = require('./system/center.controller');
module.exports.clinicController = require('./system/clinic.controller');
module.exports.jobController = require('./system/job.controller');
module.exports.notificationController = require('./system/notification.controller');
module.exports.notificationTemplateController = require('./system/notificationTemplate.controller');
module.exports.scheduleController = require('./system/schedule.controller');

// Zalo controllers
module.exports.zaloWebhookController = require('./zalo/zaloWebhook.controller');
