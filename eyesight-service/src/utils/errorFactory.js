const httpStatus = require('http-status');
const ApiError = require('./ApiError');
const { ERROR_CODES, getErrorMessage } = require('./errorCodes');

/**
 * Factory functions to create standardized ApiError instances with error codes
 * This ensures consistent error handling across the application
 */

/**
 * Create authentication/authorization errors
 */
const authErrors = {
  invalidCredentials: (lang = 'vi') =>
    new ApiError(
      httpStatus.UNAUTHORIZED,
      getErrorMessage(ERROR_CODES.AUTH_INVALID_CREDENTIALS, lang),
      true,
      '',
      ERROR_CODES.AUTH_INVALID_CREDENTIALS.code
    ),

  unauthorized: (lang = 'vi') =>
    new ApiError(
      httpStatus.UNAUTHORIZED,
      getErrorMessage(ERROR_CODES.AUTH_UNAUTHORIZED, lang),
      true,
      '',
      ERROR_CODES.AUTH_UNAUTHORIZED.code
    ),

  forbidden: (lang = 'vi') =>
    new ApiError(
      httpStatus.FORBIDDEN,
      getErrorMessage(ERROR_CODES.AUTH_FORBIDDEN, lang),
      true,
      '',
      ERROR_CODES.AUTH_FORBIDDEN.code
    ),

  tokenExpired: (lang = 'vi') =>
    new ApiError(
      httpStatus.UNAUTHORIZED,
      getErrorMessage(ERROR_CODES.AUTH_TOKEN_EXPIRED, lang),
      true,
      '',
      ERROR_CODES.AUTH_TOKEN_EXPIRED.code
    ),
};

/**
 * Create patient-related errors
 */
const patientErrors = {
  notFound: (lang = 'vi', metadata = {}) =>
    new ApiError(
      httpStatus.NOT_FOUND,
      getErrorMessage(ERROR_CODES.PATIENT_NOT_FOUND, lang),
      true,
      '',
      ERROR_CODES.PATIENT_NOT_FOUND.code,
      metadata
    ),

  duplicateCode: (lang = 'vi', metadata = {}) =>
    new ApiError(
      httpStatus.BAD_REQUEST,
      getErrorMessage(ERROR_CODES.PATIENT_DUPLICATE_CODE, lang),
      true,
      '',
      ERROR_CODES.PATIENT_DUPLICATE_CODE.code,
      metadata
    ),

  userAssigned: (lang = 'vi', metadata = {}) =>
    new ApiError(
      httpStatus.BAD_REQUEST,
      getErrorMessage(ERROR_CODES.PATIENT_USER_ASSIGNED, lang),
      true,
      '',
      ERROR_CODES.PATIENT_USER_ASSIGNED.code,
      metadata
    ),
};

/**
 * Create doctor-related errors
 */
const doctorErrors = {
  notFound: (lang = 'vi') =>
    new ApiError(
      httpStatus.NOT_FOUND,
      getErrorMessage(ERROR_CODES.DOCTOR_NOT_FOUND, lang),
      true,
      '',
      ERROR_CODES.DOCTOR_NOT_FOUND.code
    ),

  duplicateCode: (lang = 'vi') =>
    new ApiError(
      httpStatus.BAD_REQUEST,
      getErrorMessage(ERROR_CODES.DOCTOR_DUPLICATE_CODE, lang),
      true,
      '',
      ERROR_CODES.DOCTOR_DUPLICATE_CODE.code
    ),

  userAssigned: (lang = 'vi') =>
    new ApiError(
      httpStatus.BAD_REQUEST,
      getErrorMessage(ERROR_CODES.DOCTOR_USER_ASSIGNED, lang),
      true,
      '',
      ERROR_CODES.DOCTOR_USER_ASSIGNED.code
    ),
};

/**
 * Create user-related errors
 */
const userErrors = {
  notFound: (lang = 'vi') =>
    new ApiError(
      httpStatus.NOT_FOUND,
      getErrorMessage(ERROR_CODES.USER_NOT_FOUND, lang),
      true,
      '',
      ERROR_CODES.USER_NOT_FOUND.code
    ),

  emailTaken: (lang = 'vi') =>
    new ApiError(
      httpStatus.BAD_REQUEST,
      getErrorMessage(ERROR_CODES.USER_EMAIL_TAKEN, lang),
      true,
      '',
      ERROR_CODES.USER_EMAIL_TAKEN.code
    ),

  invalidPassword: (lang = 'vi') =>
    new ApiError(
      httpStatus.UNAUTHORIZED,
      getErrorMessage(ERROR_CODES.USER_INVALID_PASSWORD, lang),
      true,
      '',
      ERROR_CODES.USER_INVALID_PASSWORD.code
    ),
};

/**
 * Create exam-related errors
 */
const examErrors = {
  sessionNotFound: (lang = 'vi') =>
    new ApiError(
      httpStatus.NOT_FOUND,
      getErrorMessage(ERROR_CODES.EXAM_SESSION_NOT_FOUND, lang),
      true,
      '',
      ERROR_CODES.EXAM_SESSION_NOT_FOUND.code
    ),

  resultNotFound: (lang = 'vi') =>
    new ApiError(
      httpStatus.NOT_FOUND,
      getErrorMessage(ERROR_CODES.EXAM_RESULT_NOT_FOUND, lang),
      true,
      '',
      ERROR_CODES.EXAM_RESULT_NOT_FOUND.code
    ),

  sessionDuplicate: (lang = 'vi') =>
    new ApiError(
      httpStatus.BAD_REQUEST,
      getErrorMessage(ERROR_CODES.EXAM_SESSION_DUPLICATE, lang),
      true,
      '',
      ERROR_CODES.EXAM_SESSION_DUPLICATE.code
    ),
};

/**
 * Create exercise-related errors
 */
const exerciseErrors = {
  notFound: (lang = 'vi') =>
    new ApiError(
      httpStatus.NOT_FOUND,
      getErrorMessage(ERROR_CODES.EXERCISE_NOT_FOUND, lang),
      true,
      '',
      ERROR_CODES.EXERCISE_NOT_FOUND.code
    ),

  assignmentNotFound: (lang = 'vi') =>
    new ApiError(
      httpStatus.NOT_FOUND,
      getErrorMessage(ERROR_CODES.EXERCISE_ASSIGNMENT_NOT_FOUND, lang),
      true,
      '',
      ERROR_CODES.EXERCISE_ASSIGNMENT_NOT_FOUND.code
    ),

  resultNotFound: (lang = 'vi') =>
    new ApiError(
      httpStatus.NOT_FOUND,
      getErrorMessage(ERROR_CODES.EXERCISE_RESULT_NOT_FOUND, lang),
      true,
      '',
      ERROR_CODES.EXERCISE_RESULT_NOT_FOUND.code
    ),

  sessionNotFound: (lang = 'vi') =>
    new ApiError(
      httpStatus.NOT_FOUND,
      getErrorMessage(ERROR_CODES.EXERCISE_SESSION_NOT_FOUND, lang),
      true,
      '',
      ERROR_CODES.EXERCISE_SESSION_NOT_FOUND.code
    ),

  duplicateCode: (lang = 'vi') =>
    new ApiError(
      httpStatus.BAD_REQUEST,
      getErrorMessage(ERROR_CODES.EXERCISE_DUPLICATE_CODE, lang),
      true,
      '',
      ERROR_CODES.EXERCISE_DUPLICATE_CODE.code
    ),
};

/**
 * Create center/clinic errors
 */
const centerErrors = {
  notFound: (lang = 'vi') =>
    new ApiError(
      httpStatus.NOT_FOUND,
      getErrorMessage(ERROR_CODES.CENTER_NOT_FOUND, lang),
      true,
      '',
      ERROR_CODES.CENTER_NOT_FOUND.code
    ),

  clinicNotFound: (lang = 'vi') =>
    new ApiError(
      httpStatus.NOT_FOUND,
      getErrorMessage(ERROR_CODES.CLINIC_NOT_FOUND, lang),
      true,
      '',
      ERROR_CODES.CLINIC_NOT_FOUND.code
    ),

  duplicateCode: (lang = 'vi') =>
    new ApiError(
      httpStatus.BAD_REQUEST,
      getErrorMessage(ERROR_CODES.CENTER_DUPLICATE_CODE, lang),
      true,
      '',
      ERROR_CODES.CENTER_DUPLICATE_CODE.code
    ),
};

module.exports = {
  authErrors,
  patientErrors,
  doctorErrors,
  userErrors,
  examErrors,
  exerciseErrors,
  centerErrors,
};
