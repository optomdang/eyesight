/**
 * Centralized Error Handler
 * Provides consistent error handling and user-friendly messages across the application
 */

// Error categories
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  SERVER = 'server',
  AUTH = 'auth',
  UNKNOWN = 'unknown',
}

// Error configuration interface
export interface ErrorConfig {
  category: ErrorCategory;
  message: string; // User-facing Vietnamese message
  recoverable: boolean; // Can the user recover from this error?
  retryable: boolean; // Should we show a retry option?
}

// Vietnamese error messages
const ERROR_MESSAGES: Record<ErrorCategory, string> = {
  [ErrorCategory.NETWORK]: 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.',
  [ErrorCategory.VALIDATION]: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  [ErrorCategory.SERVER]: 'Có lỗi xảy ra từ server. Vui lòng thử lại sau.',
  [ErrorCategory.AUTH]: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
  [ErrorCategory.UNKNOWN]: 'Có lỗi xảy ra. Vui lòng thử lại.',
};

/**
 * Categorize error based on error object
 * @param error - Error object or unknown value
 * @returns Error configuration
 */
export function categorizeError(error: unknown): ErrorConfig {
  // Handle axios errors
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
    const status = axiosError.response?.status ?? 0;

    if (status === 401 || status === 403) {
      return {
        category: ErrorCategory.AUTH,
        message: ERROR_MESSAGES[ErrorCategory.AUTH],
        recoverable: true,
        retryable: false,
      };
    }

    if (status >= 400 && status < 500) {
      // Use server message for validation errors if available
      const serverMessage = axiosError.response?.data?.message;
      return {
        category: ErrorCategory.VALIDATION,
        message: translateErrorMessage(serverMessage || ERROR_MESSAGES[ErrorCategory.VALIDATION]),
        recoverable: true,
        retryable: false,
      };
    }

    if (status >= 500) {
      return {
        category: ErrorCategory.SERVER,
        message: ERROR_MESSAGES[ErrorCategory.SERVER],
        recoverable: true,
        retryable: true,
      };
    }
  }

  // Handle network errors
  if (error && typeof error === 'object' && 'code' in error) {
    const networkError = error as { code?: string };
    if (networkError.code === 'NETWORK_ERROR' || networkError.code === 'ECONNABORTED') {
      return {
        category: ErrorCategory.NETWORK,
        message: ERROR_MESSAGES[ErrorCategory.NETWORK],
        recoverable: true,
        retryable: true,
      };
    }
  }

  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      category: ErrorCategory.NETWORK,
      message: ERROR_MESSAGES[ErrorCategory.NETWORK],
      recoverable: true,
      retryable: true,
    };
  }

  // Default to unknown error
  return {
    category: ErrorCategory.UNKNOWN,
    message: ERROR_MESSAGES[ErrorCategory.UNKNOWN],
    recoverable: false,
    retryable: true,
  };
}

/**
 * Handle API error with snackbar display
 * @param error - Error object
 * @param showSnackbar - Snackbar function from context
 * @param onRetry - Optional retry callback
 */
export function handleApiError(
  error: unknown,
  showSnackbar: (message: string, severity: string) => void,
  _onRetry?: () => void
): void {
  const errorConfig = categorizeError(error);

  // Log detailed error in development mode
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error Details:', {
      error,
      category: errorConfig.category,
      message: errorConfig.message,
      recoverable: errorConfig.recoverable,
      retryable: errorConfig.retryable,
    });
  }

  // Show user-friendly message
  showSnackbar(errorConfig.message, 'error');

  // Handle retry for retryable errors
  // Could show a retry button in the snackbar action (requires extending the snackbar context).
}

/**
 * Create error handler with retry functionality
 * @param showSnackbar - Snackbar function
 * @returns Error handler function with retry support
 */
export function createErrorHandler(showSnackbar: (message: string, severity: string) => void) {
  return (error: unknown, onRetry?: () => void) => {
    handleApiError(error, showSnackbar, onRetry);
  };
}

/**
 * Check if error is recoverable
 * @param error - Error object
 * @returns True if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  const errorConfig = categorizeError(error);
  return errorConfig.recoverable;
}

/**
 * Check if error is retryable
 * @param error - Error object
 * @returns True if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const errorConfig = categorizeError(error);
  return errorConfig.retryable;
}

const FIELD_LABELS_VI: Record<string, string> = {
  visionType: 'Loại thị lực',
  name: 'Họ và tên',
  email: 'Email',
  password: 'Mật khẩu',
  phoneNumber: 'Số điện thoại',
  gender: 'Giới tính',
  dateOfBirth: 'Ngày sinh',
  centerId: 'Trung tâm',
  defaultClinicId: 'Phòng khám mặc định',
  userType: 'Loại người dùng',
  exerciseId: 'Bài tập',
  eye: 'Mắt tập',
  distance: 'Khoảng cách',
  duration: 'Thời lượng',
  frequency: 'Tần suất',
  executionCount: 'Số lần tập',
  inactivityThreshold: 'Ngưỡng bỏ tương tác',
  configType: 'Loại cấu hình',
  'patient.code': 'Mã bệnh nhân',
  'patient.doctorId': 'Bác sĩ phụ trách',
  'patient.severityLevel': 'Mức độ nghiêm trọng',
  'patient.treatmentStatus': 'Trạng thái điều trị',
  'doctor.code': 'Mã bác sĩ',
  'doctor.specialization': 'Chuyên khoa',
};

const fieldLabel = (key: string) => FIELD_LABELS_VI[key] || key;

function translateJoiDetail(message: string): string {
  if (message === 'password must be at least 8 characters' || message === '"password" must be at least 8 characters') {
    return 'Mật khẩu phải có ít nhất 8 ký tự.';
  }
  if (
    message === 'password must contain at least 1 letter and 1 number' ||
    message === '"password" must contain at least 1 letter and 1 number'
  ) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số.';
  }

  const oneOfMatch = message.match(/^"([^"]+)" must be one of \[(.+)\]$/);
  if (oneOfMatch) {
    return `${fieldLabel(oneOfMatch[1])} không hợp lệ. Giá trị cho phép: ${oneOfMatch[2]}.`;
  }

  const requiredMatch = message.match(/^"([^"]+)" is required$/);
  if (requiredMatch) {
    return `${fieldLabel(requiredMatch[1])} là bắt buộc.`;
  }

  const mustBeMatch = message.match(/^"([^"]+)" must be (.+)$/);
  if (mustBeMatch) {
    return `${fieldLabel(mustBeMatch[1])} phải ${mustBeMatch[2]}.`;
  }

  const emailMatch = message.match(/^"([^"]+)" must be a valid email$/);
  if (emailMatch) {
    return `${fieldLabel(emailMatch[1])} không đúng định dạng email.`;
  }

  return message;
}

function translateJoiValidationMessage(message: string): string {
  if (message.includes('"') && (message.includes(' must ') || message.includes(' is required'))) {
    return message
      .split(', ')
      .map(translateJoiDetail)
      .join('; ');
  }
  return message;
}

const EXACT_ERROR_VI: Record<string, string> = {
  'visionType cannot be null':
    'Loại thị lực là bắt buộc. Vui lòng chọn loại thị lực (xa, gần hoặc tương phản).',
  'vtSettings cannot be null':
    'Cấu hình VT không hợp lệ. Hãy thử lưu lại hoặc bỏ trống cài đặt VT Quest.',
  'Validation error': 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường trong form.',
};

/**
 * Dịch thông báo lỗi server (thường là tiếng Anh từ DB/Sequelize) sang tiếng Việt.
 */
export function translateErrorMessage(message: string): string {
  if (!message) return message;

  if (EXACT_ERROR_VI[message]) return EXACT_ERROR_VI[message];

  const notNullMatch = message.match(/^(\w+) cannot be null$/);
  if (notNullMatch) {
    const label = FIELD_LABELS_VI[notNullMatch[1]] || notNullMatch[1];
    return `${label} là bắt buộc.`;
  }

  const invalidVisionType = message.match(/^Invalid visionType: (.+)\. Must be one of: (.+)$/);
  if (invalidVisionType) {
    return `Loại thị lực không hợp lệ: ${invalidVisionType[1]}. Chỉ chấp nhận: ${invalidVisionType[2]}.`;
  }

  if (message.includes('is not allowed')) {
    const fieldMatch = message.match(/"([^"]+)" is not allowed/);
    if (fieldMatch) {
      const label = FIELD_LABELS_VI[fieldMatch[1]] || fieldMatch[1];
      return `Trường "${label}" không được phép gửi lên server.`;
    }
    return 'Có trường dữ liệu không hợp lệ trong form.';
  }

  const joiTranslated = translateJoiValidationMessage(message);
  if (joiTranslated !== message) return joiTranslated;

  return message;
}

/**
 * Get user-friendly error message.
 * Priority: server response message → error.message → generic fallback
 * Works with both Axios errors and plain Error objects.
 *
 * @param error - Error object
 * @param fallback - Optional custom fallback message
 * @returns Vietnamese error message
 */
export function getErrorMessage(error: unknown, fallback = 'Có lỗi xảy ra'): string {
  if (!error) return fallback;

  // Axios error: has response.data.message from server
  if (typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const serverMsg = axiosError.response?.data?.message;
    if (serverMsg) return translateErrorMessage(serverMsg);
    if (axiosError.message) return axiosError.message;
  }

  // Plain Error object
  if (error instanceof Error && error.message) return translateErrorMessage(error.message);

  return fallback;
}
