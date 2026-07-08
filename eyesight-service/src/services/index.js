module.exports.authService = require('./authentication/auth.service');
module.exports.emailService = require('./email.service');
module.exports.zaloService = require('./zalo.service');
module.exports.fcmService = require('./common/fcm.service');
module.exports.fcmNotificationService = require('./common/fcmNotification.service');
module.exports.tokenService = require('./authentication/token.service');
module.exports.userService = require('./authentication/user.service');
module.exports.roleService = require('./authentication/role.service');
module.exports.centerService = require('./system/center.service');
module.exports.clinicService = require('./system/clinic.service');
module.exports.notificationService = require('./system/notification.service');
module.exports.notificationTemplateService = require('./system/notificationTemplate.service');
module.exports.patientService = require('./clinic/patient.service');
module.exports.doctorService = require('./clinic/doctor.service');
module.exports.examAssignmentService = require('./clinic/examAssignment.service');
module.exports.examResultService = require('./exam/examResult.service');
module.exports.examSessionService = require('./exam/examSession.service');
module.exports.examNotificationService = require('./exam/examNotification.service');
module.exports.examSchedulerService = require('./exam/examScheduler.service');
module.exports.examMetricService = require('./exam/examMetric.service');
// complianceService removed - using ExamMetrics calculation instead
module.exports.exerciseService = require('./exercise/exercise.service');
module.exports.exerciseAssignmentService = require('./exercise/exerciseAssignment.service');
module.exports.exerciseSessionService = require('./exercise/exerciseSession.service');
module.exports.exerciseResultService = require('./exercise/exerciseResult.service');
module.exports.exerciseConfigService = require('./exercise/exerciseConfig.service');
module.exports.treatmentPackageService = require('./exercise/treatmentPackage.service');
module.exports.exerciseNotificationService = require('./exercise/exerciseNotification.service');
module.exports.exerciseComplianceService = require('./exercise/exerciseCompliance.service');
module.exports.exerciseSessionCompletionService = require('./exercise/exerciseSessionCompletion.service');
module.exports.exerciseSchedulerService = require('./exercise/exerciseScheduler.service');

// Dashboard services
module.exports.dashboardComplianceService = require('./dashboard/dashboardCompliance.service');
module.exports.dashboardExamService = require('./dashboard/dashboardExam.service');
module.exports.dashboardExerciseService = require('./dashboard/dashboardExercise.service');
module.exports.dashboardUserService = require('./dashboard/dashboardUser.service');

// Exercise services
module.exports.exerciseFrequencyService = require('./exercise/exerciseFrequency.service');

// System services
module.exports.jobService = require('./system/job.service');
module.exports.scheduleHistoryService = require('./system/scheduleHistory.service');
module.exports.auditLogService = require('./system/auditLog.service');
