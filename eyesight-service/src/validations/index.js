// Authentication validations
module.exports.authValidation = require('./authentication/auth.validation');
module.exports.userValidation = require('./authentication/user.validation');
module.exports.roleValidation = require('./authentication/role.validation');

// Clinic validations
module.exports.patientValidation = require('./clinic/patient.validation');
module.exports.doctorValidation = require('./clinic/doctor.validation');
module.exports.examAssignmentValidation = require('./clinic/examAssignment.validation');

// Exam validations
module.exports.examSessionValidation = require('./exam/examSession.validation');
module.exports.examResultValidation = require('./exam/examResult.validation');
module.exports.examMetricValidation = require('./exam/examMetric.validation');
// complianceValidation removed - using ExamMetrics calculation instead

// Exercise validations
module.exports.exerciseValidation = require('./exercise/exercise.validation');
module.exports.exerciseConfigValidation = require('./exercise/exerciseConfig.validation');
module.exports.levelAdjustmentValidation = require('./exercise/levelAdjustment.validation');
module.exports.exerciseAssignmentValidation = require('./exercise/exerciseAssignment.validation');
module.exports.exerciseComplianceValidation = require('./exercise/exerciseCompliance.validation');
module.exports.exerciseResultValidation = require('./exercise/exerciseResult.validation');

// System validations
module.exports.centerValidation = require('./system/center.validation');
module.exports.clinicValidation = require('./system/clinic.validation');
module.exports.notificationValidation = require('./system/notification.validation');
module.exports.notificationTemplateValidation = require('./system/notificationTemplate.validation');
module.exports.jobValidation = require('./system/job.validation');

// Custom validations
module.exports.customValidation = require('./custom.validation');

// module.exports.patientApiValidation = require('./exercise/patientApi.validation');
