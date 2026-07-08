/**
 * Standardized Error Codes for Eye-Sight Application
 *
 * Format: ERR_<DOMAIN>_<SPECIFIC_ERROR>
 *
 * Usage:
 * throw new ApiError(httpStatus.BAD_REQUEST, ERROR_CODES.PATIENT_DUPLICATE.message, {
 *   code: ERROR_CODES.PATIENT_DUPLICATE.code
 * });
 */

const ERROR_CODES = {
  // ============================================================
  // AUTHENTICATION & AUTHORIZATION (1000-1999)
  // ============================================================
  AUTH_INVALID_CREDENTIALS: {
    code: 'ERR_AUTH_1001',
    message: {
      en: 'Invalid email or password',
      vi: 'Email hoặc mật khẩu không đúng',
    },
  },
  AUTH_UNAUTHORIZED: {
    code: 'ERR_AUTH_1002',
    message: {
      en: 'Please authenticate',
      vi: 'Vui lòng đăng nhập',
    },
  },
  AUTH_FORBIDDEN: {
    code: 'ERR_AUTH_1003',
    message: {
      en: 'Forbidden - Insufficient permissions',
      vi: 'Không có quyền truy cập',
    },
  },
  AUTH_TOKEN_EXPIRED: {
    code: 'ERR_AUTH_1004',
    message: {
      en: 'Token has expired',
      vi: 'Phiên đăng nhập đã hết hạn',
    },
  },
  AUTH_REFRESH_TOKEN_INVALID: {
    code: 'ERR_AUTH_1005',
    message: {
      en: 'Invalid refresh token',
      vi: 'Refresh token không hợp lệ',
    },
  },

  // ============================================================
  // PATIENT MANAGEMENT (2000-2999)
  // ============================================================
  PATIENT_NOT_FOUND: {
    code: 'ERR_PATIENT_2001',
    message: {
      en: 'Patient not found',
      vi: 'Không tìm thấy bệnh nhân',
    },
  },
  PATIENT_DUPLICATE_CODE: {
    code: 'ERR_PATIENT_2002',
    message: {
      en: 'Patient code already exists',
      vi: 'Mã bệnh nhân đã tồn tại',
    },
  },
  PATIENT_USER_ASSIGNED: {
    code: 'ERR_PATIENT_2003',
    message: {
      en: 'User is already assigned to another patient',
      vi: 'Tài khoản đã được gán cho bệnh nhân khác',
    },
  },
  PATIENT_INVALID_STATUS: {
    code: 'ERR_PATIENT_2004',
    message: {
      en: 'Invalid patient status',
      vi: 'Trạng thái bệnh nhân không hợp lệ',
    },
  },

  // ============================================================
  // DOCTOR MANAGEMENT (3000-3999)
  // ============================================================
  DOCTOR_NOT_FOUND: {
    code: 'ERR_DOCTOR_3001',
    message: {
      en: 'Doctor not found',
      vi: 'Không tìm thấy bác sĩ',
    },
  },
  DOCTOR_DUPLICATE_CODE: {
    code: 'ERR_DOCTOR_3002',
    message: {
      en: 'Doctor code already exists',
      vi: 'Mã bác sĩ đã tồn tại',
    },
  },
  DOCTOR_USER_ASSIGNED: {
    code: 'ERR_DOCTOR_3003',
    message: {
      en: 'User is already assigned to another doctor',
      vi: 'Tài khoản đã được gán cho bác sĩ khác',
    },
  },

  // ============================================================
  // USER MANAGEMENT (4000-4999)
  // ============================================================
  USER_NOT_FOUND: {
    code: 'ERR_USER_4001',
    message: {
      en: 'User not found',
      vi: 'Không tìm thấy người dùng',
    },
  },
  USER_EMAIL_TAKEN: {
    code: 'ERR_USER_4002',
    message: {
      en: 'Email already taken',
      vi: 'Email đã được sử dụng',
    },
  },
  USER_INVALID_PASSWORD: {
    code: 'ERR_USER_4003',
    message: {
      en: 'Invalid current password',
      vi: 'Mật khẩu hiện tại không đúng',
    },
  },

  // ============================================================
  // EXAM MANAGEMENT (5000-5999)
  // ============================================================
  EXAM_SESSION_NOT_FOUND: {
    code: 'ERR_EXAM_5001',
    message: {
      en: 'Exam session not found',
      vi: 'Không tìm thấy phiên khám',
    },
  },
  EXAM_RESULT_NOT_FOUND: {
    code: 'ERR_EXAM_5002',
    message: {
      en: 'Exam result not found',
      vi: 'Không tìm thấy kết quả khám',
    },
  },
  EXAM_SESSION_DUPLICATE: {
    code: 'ERR_EXAM_5003',
    message: {
      en: 'Exam session already exists for this date',
      vi: 'Phiên khám đã tồn tại cho ngày này',
    },
  },
  EXAM_INVALID_STATUS: {
    code: 'ERR_EXAM_5004',
    message: {
      en: 'Invalid exam status',
      vi: 'Trạng thái khám không hợp lệ',
    },
  },

  // ============================================================
  // EXERCISE MANAGEMENT (6000-6999)
  // ============================================================
  EXERCISE_NOT_FOUND: {
    code: 'ERR_EXERCISE_6001',
    message: {
      en: 'Exercise not found',
      vi: 'Không tìm thấy bài tập',
    },
  },
  EXERCISE_ASSIGNMENT_NOT_FOUND: {
    code: 'ERR_EXERCISE_6002',
    message: {
      en: 'Exercise assignment not found',
      vi: 'Không tìm thấy bài tập được giao',
    },
  },
  EXERCISE_RESULT_NOT_FOUND: {
    code: 'ERR_EXERCISE_6003',
    message: {
      en: 'Exercise result not found',
      vi: 'Không tìm thấy kết quả bài tập',
    },
  },
  EXERCISE_SESSION_NOT_FOUND: {
    code: 'ERR_EXERCISE_6004',
    message: {
      en: 'Exercise session not found',
      vi: 'Không tìm thấy phiên bài tập',
    },
  },
  EXERCISE_DUPLICATE_CODE: {
    code: 'ERR_EXERCISE_6005',
    message: {
      en: 'Exercise code already exists',
      vi: 'Mã bài tập đã tồn tại',
    },
  },

  // ============================================================
  // CENTER & CLINIC MANAGEMENT (7000-7999)
  // ============================================================
  CENTER_NOT_FOUND: {
    code: 'ERR_CENTER_7001',
    message: {
      en: 'Center not found',
      vi: 'Không tìm thấy trung tâm',
    },
  },
  CLINIC_NOT_FOUND: {
    code: 'ERR_CLINIC_7002',
    message: {
      en: 'Clinic not found',
      vi: 'Không tìm thấy phòng khám',
    },
  },
  CENTER_DUPLICATE_CODE: {
    code: 'ERR_CENTER_7003',
    message: {
      en: 'Center code already exists',
      vi: 'Mã trung tâm đã tồn tại',
    },
  },

  // ============================================================
  // NOTIFICATION (8000-8999)
  // ============================================================
  NOTIFICATION_TEMPLATE_NOT_FOUND: {
    code: 'ERR_NOTIFICATION_8001',
    message: {
      en: 'Notification template not found',
      vi: 'Không tìm thấy mẫu thông báo',
    },
  },
  NOTIFICATION_SEND_FAILED: {
    code: 'ERR_NOTIFICATION_8002',
    message: {
      en: 'Failed to send notification',
      vi: 'Gửi thông báo thất bại',
    },
  },

  // ============================================================
  // VALIDATION ERRORS (9000-9999)
  // ============================================================
  VALIDATION_ERROR: {
    code: 'ERR_VALIDATION_9001',
    message: {
      en: 'Validation error',
      vi: 'Lỗi xác thực dữ liệu',
    },
  },
  INVALID_DATE_RANGE: {
    code: 'ERR_VALIDATION_9002',
    message: {
      en: 'Invalid date range',
      vi: 'Khoảng thời gian không hợp lệ',
    },
  },
  MISSING_REQUIRED_FIELD: {
    code: 'ERR_VALIDATION_9003',
    message: {
      en: 'Missing required field',
      vi: 'Thiếu trường bắt buộc',
    },
  },
};

/**
 * Helper function to get error message based on language preference
 * @param {Object} errorCode - Error code object from ERROR_CODES
 * @param {string} lang - Language code ('en' or 'vi')
 * @returns {string} - Localized error message
 */
const getErrorMessage = (errorCode, lang = 'vi') => {
  return errorCode.message[lang] || errorCode.message.vi;
};

module.exports = {
  ERROR_CODES,
  getErrorMessage,
};
