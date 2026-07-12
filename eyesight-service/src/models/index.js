const { sequelize } = require('../config/db');
const User = require('./authentication/user.model');
const Clinic = require('./clinic/clinic.model');
const Role = require('./authentication/role.model');
const Center = require('./system/center.model');
const Patient = require('./clinic/patient.model');
const Doctor = require('./clinic/doctor.model');
const ExamSession = require('./exam/examSession.model');
const ExamResult = require('./exam/examResult.model');
const ExamAssignment = require('./clinic/examAssignment.model');
const ExamMetric = require('./exam/examMetric.model');
const Token = require('./authentication/token.model');
const Exercise = require('./exercise/exercise.model');
const ExerciseResult = require('./exercise/exerciseResult.model');
const ExerciseConfig = require('./exercise/exerciseConfig.model');
const ExerciseAssignment = require('./exercise/exerciseAssignment.model');
const ExerciseSession = require('./exercise/exerciseSession.model');
const TreatmentPackage = require('./exercise/treatmentPackage.model');
const PatientTreatmentPackage = require('./exercise/patientTreatmentPackage.model');
const WarrantyAgreement = require('./clinic/warrantyAgreement.model');
const WarrantyAgreementPhase = require('./clinic/warrantyAgreementPhase.model');
const Notification = require('./common/notification.model');
const NotificationTemplate = require('./system/notificationTemplate.model');
const AuditLog = require('./system/auditLog.model');
const ScheduleHistory = require('./system/scheduleHistory.model');
const Configuration = require('./system/configuration.model');

// Định nghĩa quan hệ (không ràng buộc FK)
User.belongsTo(User, { foreignKey: 'updatedBy', as: 'updatedByUser', constraints: false });
User.belongsTo(Clinic, { foreignKey: 'defaultClinicId', as: 'defaultClinic', constraints: false });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role', constraints: false });
User.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
User.hasOne(Doctor, { foreignKey: 'userId', as: 'doctor', constraints: false });
User.hasOne(Patient, { foreignKey: 'userId', as: 'patient', constraints: false });

// ScheduleHistory relations
ScheduleHistory.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });

// AuditLog relations
AuditLog.belongsTo(User, { foreignKey: 'actorUserId', as: 'actorUser', constraints: false });
AuditLog.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
User.hasMany(AuditLog, { foreignKey: 'actorUserId', as: 'auditLogs', constraints: false });

Role.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
Role.belongsTo(User, { foreignKey: 'updatedBy', as: 'updatedByUser', constraints: false });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users', constraints: false });

Center.hasMany(Role, { foreignKey: 'centerId', as: 'roles', constraints: false });
Center.hasMany(Clinic, { foreignKey: 'centerId', as: 'clinics', constraints: false });
Center.hasMany(User, { foreignKey: 'centerId', as: 'users', constraints: false });
Center.belongsTo(User, { foreignKey: 'updatedBy', as: 'updatedByUser', constraints: false });

Clinic.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
Clinic.belongsTo(User, { foreignKey: 'updatedBy', as: 'updatedByUser', constraints: false });
Clinic.hasMany(User, { foreignKey: 'defaultClinicId', as: 'defaultUsers', constraints: false });

// Patient associations
Patient.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
Patient.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor', constraints: false });
Patient.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
Patient.belongsTo(Clinic, { foreignKey: 'clinicId', as: 'clinic', constraints: false });
Patient.hasMany(ExamSession, { foreignKey: 'patientId', constraints: false });
Patient.hasMany(ExamResult, { foreignKey: 'patientId', constraints: false });
Patient.hasMany(ExamAssignment, { foreignKey: 'patientId', constraints: false });
Patient.hasMany(ExerciseAssignment, { foreignKey: 'patientId', as: 'exerciseAssignments', constraints: false });
Patient.hasMany(PatientTreatmentPackage, { foreignKey: 'patientId', as: 'treatmentPackageAssignments', constraints: false });
Patient.hasMany(WarrantyAgreement, { foreignKey: 'patientId', as: 'warrantyAgreements', constraints: false });

TreatmentPackage.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
TreatmentPackage.hasMany(PatientTreatmentPackage, { foreignKey: 'treatmentPackageId', as: 'patientAssignments', constraints: false });

PatientTreatmentPackage.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient', constraints: false });
PatientTreatmentPackage.belongsTo(TreatmentPackage, { foreignKey: 'treatmentPackageId', as: 'treatmentPackage', constraints: false });
PatientTreatmentPackage.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });

// Doctor associations
Doctor.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
Doctor.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
Doctor.belongsTo(Clinic, { foreignKey: 'clinicId', as: 'clinic', constraints: false });
Doctor.hasMany(Patient, { foreignKey: 'doctorId', as: 'patients', constraints: false });
Doctor.hasMany(WarrantyAgreement, { foreignKey: 'doctorId', as: 'warrantyAgreements', constraints: false });

// Warranty agreement associations
WarrantyAgreement.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient', constraints: false });
WarrantyAgreement.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor', constraints: false });
WarrantyAgreement.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
WarrantyAgreement.hasMany(WarrantyAgreementPhase, { foreignKey: 'agreementId', as: 'phases', constraints: false });

WarrantyAgreementPhase.belongsTo(WarrantyAgreement, { foreignKey: 'agreementId', as: 'agreement', constraints: false });

// ExamSession associations - MATCHING Exercise pattern
ExamSession.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient', constraints: false });
ExamSession.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor', constraints: false });
ExamSession.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
ExamSession.hasMany(ExamMetric, { foreignKey: 'examSessionId', as: 'examMetrics', constraints: false });
ExamSession.hasMany(ExamResult, { foreignKey: 'examSessionId', as: 'examResults', constraints: false });

// ExamResult associations - MATCHING Exercise pattern
ExamResult.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient', constraints: false });
ExamResult.belongsTo(ExamSession, { foreignKey: 'examSessionId', as: 'examSession', constraints: false });
ExamResult.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
ExamResult.hasOne(ExamMetric, { foreignKey: 'examResultId', as: 'examMetric', constraints: false });

// ExamMetric associations
ExamMetric.belongsTo(ExamResult, { foreignKey: 'examResultId', as: 'examResult', constraints: false });
ExamMetric.belongsTo(ExamSession, { foreignKey: 'examSessionId', as: 'examSession', constraints: false });
ExamMetric.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient', constraints: false });
ExamMetric.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });

// ExamAssignment associations
ExamAssignment.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient', constraints: false });
ExamAssignment.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });

// Exercise relationships
Exercise.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
Exercise.belongsTo(User, { foreignKey: 'updatedBy', as: 'updatedByUser', constraints: false });
Exercise.hasMany(ExerciseResult, { foreignKey: 'exerciseId', as: 'results', constraints: false });
// Exercise has many ExerciseAssignments through ExerciseConfig
// ExerciseAssignment -> ExerciseConfig -> Exercise

// ExerciseResult relationships
ExerciseResult.belongsTo(Patient, { foreignKey: 'patientId', as: 'patientInfo', constraints: false });
ExerciseResult.belongsTo(Exercise, { foreignKey: 'exerciseId', as: 'exercise', constraints: false });
ExerciseResult.belongsTo(ExerciseAssignment, { foreignKey: 'exerciseAssignmentId', as: 'assignment', constraints: false });
ExerciseResult.belongsTo(ExerciseSession, { foreignKey: 'exerciseSessionId', as: 'exerciseSession', constraints: false });
ExerciseResult.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
ExerciseResult.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewedByUser', constraints: false });

// ExerciseConfig relationships
ExerciseConfig.belongsTo(Exercise, { foreignKey: 'exerciseId', as: 'exercise', constraints: false });
ExerciseConfig.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
ExerciseConfig.belongsTo(User, { foreignKey: 'createdBy', as: 'createdByUser', constraints: false });
ExerciseConfig.belongsTo(User, { foreignKey: 'updatedBy', as: 'updatedByUser', constraints: false });
ExerciseConfig.hasMany(ExerciseAssignment, {
  foreignKey: 'exerciseConfigId',
  as: 'patientAssignments',
  constraints: false,
});

// ExerciseAssignment relationships (N:N junction table)
ExerciseAssignment.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient', constraints: false });
ExerciseAssignment.belongsTo(ExerciseConfig, {
  foreignKey: 'exerciseConfigId',
  as: 'exerciseConfig',
  constraints: false,
});
ExerciseAssignment.belongsTo(User, { foreignKey: 'assignedBy', as: 'assignedByUser', constraints: false });
ExerciseAssignment.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });

// ExerciseSession relationships
ExerciseSession.belongsTo(ExerciseAssignment, {
  foreignKey: 'exerciseAssignmentId',
  as: 'exerciseAssignment',
  constraints: false,
});
ExerciseSession.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient', constraints: false });
ExerciseSession.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
ExerciseSession.belongsTo(User, { foreignKey: 'createdBy', as: 'createdByUser', constraints: false });
ExerciseSession.belongsTo(User, { foreignKey: 'updatedBy', as: 'updatedByUser', constraints: false });

// ExerciseAssignment has many ExerciseSessions
ExerciseAssignment.hasMany(ExerciseSession, {
  foreignKey: 'exerciseAssignmentId',
  as: 'exerciseSessions',
  constraints: false,
});

// ExerciseAssignment has one current session (latest session)
ExerciseAssignment.hasOne(ExerciseSession, {
  foreignKey: 'exerciseAssignmentId',
  as: 'currentSession',
  constraints: false,
  order: [['startedAt', 'DESC']],
});

// ExerciseSession has many ExerciseResults
ExerciseSession.hasMany(ExerciseResult, { foreignKey: 'exerciseSessionId', as: 'results', constraints: false });

// NotificationTemplate relationships
NotificationTemplate.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
NotificationTemplate.belongsTo(User, { foreignKey: 'createdBy', as: 'creator', constraints: false });
NotificationTemplate.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater', constraints: false });

// Notification relationships
Notification.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver', constraints: false });
Notification.belongsTo(Center, { foreignKey: 'centerId', as: 'center', constraints: false });
Notification.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater', constraints: false });

// Xuất các model để sử dụng
module.exports = {
  sequelize,
  Token,
  User,
  Role,
  Center,
  Clinic,
  ExamSession,
  ExamResult,
  ExamAssignment,
  ExamMetric,
  Patient,
  Doctor,
  Exercise,
  ExerciseResult,
  ExerciseConfig,
  ExerciseAssignment,
  ExerciseSession,
  TreatmentPackage,
  PatientTreatmentPackage,
  WarrantyAgreement,
  WarrantyAgreementPhase,
  Notification,
  NotificationTemplate,
  AuditLog,
  ScheduleHistory,
  Configuration,
};
