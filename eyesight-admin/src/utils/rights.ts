export type RightInterface = Record<string, Record<string, string>>;

export const RIGHTS: RightInterface = {
  'Quản lý tài khoản': {
    getUsers: 'Xem danh sách tài khoản',
    manageUsers: 'Quản lý tài khoản',
    getRights: 'Xem danh sách quyền',
    manageRights: 'Quản lý quyền',
    getRoles: 'Xem danh sách vai trò',
    manageRoles: 'Quản lý vai trò',
  },
  'Quản lý phòng khám': {
    getClinics: 'Xem danh sách phòng khám',
    manageClinics: 'Quản lý phòng khám',
    getCenters: 'Xem danh sách trung tâm',
    manageCenters: 'Quản lý trung tâm',
    getDoctors: 'Xem danh sách bác sĩ',
    manageDoctors: 'Quản lý bác sĩ',
  },
  'Quản lý bệnh nhân': {
    getPatients: 'Xem danh sách bệnh nhân',
    managePatients: 'Quản lý bệnh nhân',
    getExamAssignments: 'Xem cấu hình khám bệnh nhân',
    manageExamAssignments: 'Quản lý cấu hình khám bệnh nhân',
    // Removed getExamAssignmentHistory - use getExamResults instead
  },
  'Quản lý khám bệnh': {
    getExamResults: 'Xem kết quả khám',
    manageExamResults: 'Quản lý kết quả khám',
    getExamSessions: 'Xem phiên khám',
    manageExamSessions: 'Quản lý phiên khám',
    getExamAssignments: 'Xem cài đặt khám',
    manageExamAssignments: 'Quản lý cài đặt khám',
  },
  'Quản lý bài tập': {
    getExercises: 'Xem danh sách bài tập (bao gồm cấu hình)',
    manageExercises: 'Quản lý bài tập (bao gồm cấu hình)',
    getTemplates: 'Xem mẫu bài tập',
    manageTemplates: 'Quản lý mẫu bài tập',
    manageOwnTemplates: 'Quản lý mẫu bài tập của bản thân',
    getExerciseResults: 'Xem kết quả bài tập',
    manageExerciseResults: 'Quản lý kết quả bài tập',
    getPatientExercises: 'Xem bài tập bệnh nhân',
    managePatientExercises: 'Quản lý bài tập bệnh nhân',
    manageOwnExercises: 'Quản lý bài tập của bản thân',
  },
  // Removed 'Quản lý bài kiểm tra' - merged with 'Quản lý khám bệnh'
  'Quản lý thông báo': {
    getNotifications: 'Xem danh sách thông báo',
    manageNotifications: 'Quản lý thông báo',
    getNotificationTemplates: 'Xem mẫu thông báo',
    manageNotificationTemplates: 'Quản lý mẫu thông báo',
  },
  'Quản lý cấu hình': {
    getConfigurations: 'Xem danh sách cấu hình',
    manageConfigurations: 'Quản lý cấu hình',
    getAuditLogs: 'Xem nhật ký hệ thống',
  },
};
