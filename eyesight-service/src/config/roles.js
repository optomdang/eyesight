const allRights = require('./rights');

// Get all rights codes for admin role
const getAllRightsCodes = () => {
  return Object.keys(allRights);
};

const allRoles = {
  admin: getAllRightsCodes(), // Full access for admin
  doctor: [
    // User management
    'getUsers',
    // Patient management
    'getPatients',
    'managePatients',
    // Exam management
    'getExamAssignments',
    'manageExamAssignments',
    'getExamResults',
    'manageExamResults',
    'getExamSessions',
    'manageExamSessions',
    // Exercise management
    'getExercises',
    'manageExercises',
    'getExerciseResults',
    'manageExerciseResults',
    'getPatientExercises',
    'managePatientExercises',
    'getTests',
    'manageTests',
    // Reference data (read-only)
    'getUsers',
    'getRoles',
    'getDoctors',
    'getClinics',
    'getCenters',
    // Notifications
    'getNotifications',
    'manageNotifications',
    'getNotificationTemplates',
    // Reports & Dashboard
    'readReport',
    'readDashboard',
  ],
  patient: [
    'getExamAssignments',
    'getExamResults',
    'getExamSessions',
    'getExercises',
    'getExerciseResults',
    'getTests',
    // Removed duplicate rights - using exam rights instead
    // Removed getExamAssignmentHistory - use getExamResults instead
    'getNotifications',
    'manageOwnExercises',
  ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
