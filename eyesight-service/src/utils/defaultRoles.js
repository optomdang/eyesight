const allRights = require('../config/rights');

/**
 * Get all rights codes for administrator role
 * @returns {string[]} Array of all rights codes
 */
const getAllRightsCodes = () => {
  return Object.keys(allRights);
};

/**
 * Get default roles configuration for a center
 * @param {number} centerId - The center ID
 * @param {number} updatedBy - User ID who created the center
 * @returns {Object[]} Array of default role configurations
 */
const getDefaultRolesConfig = (centerId, updatedBy) => {
  return [
    {
      name: 'Administrator',
      code: 'admin',
      centerId,
      rights: getAllRightsCodes(), // Full rights for admin
      description: 'Quản trị viên hệ thống với đầy đủ quyền hạn',
      updatedBy,
    },
    {
      name: 'Doctor',
      code: 'doctor',
      centerId,
      rights: [
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
        'getNotificationTemplates',
        // Reports & Dashboard
        'readReport',
        'readDashboard',
      ],
      description: 'Bác sĩ có thể quản lý bệnh nhân và các hoạt động khám chữa bệnh',
      updatedBy,
    },
    {
      name: 'Patient',
      code: 'patient',
      centerId,
      rights: [
        'getExamAssignments',
        'getExamResults',
        'getExamSessions',
        'getExercises',
        'getExerciseResults',
        'getTests',
        'getNotifications',
        'manageOwnExercises', // Patient can manage their own exercise assignments
      ],
      description: 'Bệnh nhân có thể xem thông tin khám chữa bệnh của mình',
      updatedBy,
    },
  ];
};

/**
 * Get user type mapping for role codes
 * @returns {Object} Mapping of role codes to user types
 */
const getUserTypeMapping = () => {
  return {
    admin: 'admin',
    doctor: 'doctor',
    patient: 'patient',
  };
};

module.exports = {
  getAllRightsCodes,
  getDefaultRolesConfig,
  getUserTypeMapping,
};
