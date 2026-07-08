const allRights = {
  // User management
  manageRights: {
    code: 'manageRights',
    description: 'Quản lý quyền',
  },
  getRights: {
    code: 'getRights',
    description: 'Lấy danh sách quyền',
  },
  manageUsers: {
    code: 'manageUsers',
    description: 'Quản lý người dùng',
  },
  getUsers: {
    code: 'getUsers',
    description: 'Lấy danh sách người dùng',
  },
  manageRoles: {
    code: 'manageRoles',
    description: 'Quản lý vai trò',
  },
  getRoles: {
    code: 'getRoles',
    description: 'Lấy danh sách vai trò',
  },
  // Clinic and Center management
  manageClinics: {
    code: 'manageClinics',
    description: 'Quản lý phòng khám',
  },
  getClinics: {
    code: 'getClinics',
    description: 'Lấy danh sách phòng khám',
  },
  manageCenters: {
    code: 'manageCenters',
    description: 'Quản lý trung tâm',
  },
  getCenters: {
    code: 'getCenters',
    description: 'Lấy danh sách trung tâm',
  },
  manageDoctors: {
    code: 'manageDoctors',
    description: 'Quản lý bác sĩ',
  },
  getDoctors: {
    code: 'getDoctors',
    description: 'Lấy danh sách bác sĩ',
  },
  // Patient and related management
  managePatients: {
    code: 'managePatients',
    description: 'Quản lý bệnh nhân',
  },
  getPatients: {
    code: 'getPatients',
    description: 'Lấy danh sách bệnh nhân',
  },
  manageExamAssignments: {
    code: 'manageExamAssignments',
    description: 'Quản lý cấu hình khám của bệnh nhân',
  },
  getExamAssignments: {
    code: 'getExamAssignments',
    description: 'Lấy danh sách cấu hình khám của bệnh nhân',
  },
  manageExamResults: {
    code: 'manageExamResults',
    description: 'Quản lý kết quả khám',
  },
  getExamResults: {
    code: 'getExamResults',
    description: 'Lấy danh sách kết quả khám',
  },
  manageExercises: {
    code: 'manageExercises',
    description: 'Quản lý bài tập',
  },
  getExercises: {
    code: 'getExercises',
    description: 'Lấy danh sách bài tập',
  },
  // Template management rights
  manageTemplates: {
    code: 'manageTemplates',
    description: 'Quản lý templates bài tập',
  },
  getTemplates: {
    code: 'getTemplates',
    description: 'Lấy danh sách templates',
  },
  manageOwnTemplates: {
    code: 'manageOwnTemplates',
    description: 'Quản lý templates của bản thân (doctor)',
  },
  // Patient self-service rights (access own data only)
  manageOwnExercises: {
    code: 'manageOwnExercises',
    description: 'Quản lý bài tập của bản thân',
  },
  // Admin/Doctor rights (access all patient data)
  managePatientExercises: {
    code: 'managePatientExercises',
    description: 'Quản lý bài tập của bệnh nhân (admin/doctor)',
  },
  getPatientExercises: {
    code: 'getPatientExercises',
    description: 'Lấy danh sách bài tập của bệnh nhân',
  },
  manageExerciseResults: {
    code: 'manageExerciseResults',
    description: 'Quản lý kết quả bài tập',
  },
  getExerciseResults: {
    code: 'getExerciseResults',
    description: 'Lấy danh sách kết quả bài tập',
  },
  // Notification management
  manageNotifications: {
    code: 'manageNotifications',
    description: 'Quản lý thông báo',
  },
  getNotifications: {
    code: 'getNotifications',
    description: 'Lấy danh sách thông báo',
  },
  // Configuration management
  manageConfigurations: {
    code: 'manageConfigurations',
    description: 'Quản lý cấu hình',
  },
  getConfigurations: {
    code: 'getConfigurations',
    description: 'Lấy danh sách cấu hình',
  },
  // Test session management
  manageExamSessions: {
    code: 'manageExamSessions',
    description: 'Quản lý phiên thi',
  },
  getExamSessions: {
    code: 'getExamSessions',
    description: 'Lấy danh sách phiên thi',
  },
  // Test management (simplified)
  manageTests: {
    code: 'manageTests',
    description: 'Quản lý bài kiểm tra',
  },
  getTests: {
    code: 'getTests',
    description: 'Xem bài kiểm tra',
  },
  // Removed duplicate and unnecessary rights:
  // - manageTestResults → use manageExamResults
  // - getTestResults → use getExamResults
  // - manageTestSessions → use manageExamSessions
  // - getTestSessions → use getExamSessions
  // - getExamMetrics → use getExamResults
  // - manageExamMetrics → use manageExamResults
  // - getExamAssignmentHistory → use getExamResults
  // Notification template management
  manageNotificationTemplates: {
    code: 'manageNotificationTemplates',
    description: 'Quản lý mẫu thông báo',
  },
  getNotificationTemplates: {
    code: 'getNotificationTemplates',
    description: 'Lấy danh sách mẫu thông báo',
  },
  // Reports and analytics
  readReport: {
    code: 'readReport',
    description: 'Xem báo cáo và thống kê',
  },
  readDashboard: {
    code: 'readDashboard',
    description: 'Xem dashboard và thống kê tổng quan',
  },
  getAuditLogs: {
    code: 'getAuditLogs',
    description: 'Xem audit logs hệ thống',
  },
};

module.exports = allRights;
