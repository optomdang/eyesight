const httpStatus = require('http-status');
const { Sequelize } = require('sequelize'); // Import Sequelize for error checking
const config = require('../config/config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const { translateJoiValidationMessage } = require('../utils/joiErrorMessage');

/**
 * Dịch thông báo lỗi DB / Sequelize sang tiếng Việt cho người dùng.
 */
const FIELD_LABELS_VI = {
  visionType: 'Loại thị lực',
  name: 'Tên cấu hình',
  exerciseId: 'Bài tập',
  eye: 'Mắt tập',
  distance: 'Khoảng cách',
  duration: 'Thời lượng',
  frequency: 'Tần suất',
  executionCount: 'Số lần tập',
  inactivityThreshold: 'Ngưỡng bỏ tương tác',
  configType: 'Loại cấu hình',
  centerId: 'Trung tâm',
};

const translateErrorMessage = (message) => {
  if (!message || typeof message !== 'string') return message;

  const exactVi = {
    'visionType cannot be null': 'Loại thị lực là bắt buộc. Vui lòng chọn loại thị lực (xa, gần hoặc tương phản).',
    'Validation error': 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường trong form.',
  };
  if (exactVi[message]) return exactVi[message];

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
};

/**
 * Converts various errors into ApiError instances
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || error instanceof Sequelize.Error
        ? httpStatus.BAD_REQUEST // Sequelize errors typically indicate bad input
        : httpStatus.INTERNAL_SERVER_ERROR;
    const message = translateErrorMessage(error.message || httpStatus[statusCode]);
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

/**
 * Handles errors and sends response
 * @param {ApiError} err - The converted error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, _next) => {
  let { statusCode, message } = err;
  message = translateErrorMessage(message);
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(err.errorCode && { errorCode: err.errorCode }), // Include standardized error code
    ...(config.env === 'development' && { stack: err.stack }),
    ...(err.metadata && config.env === 'development' && { metadata: err.metadata }), // Include metadata in dev
  };

  if (config.env === 'development') {
    logger.error(err);
  }

  res.status(statusCode).send(response);
};

module.exports = {
  errorConverter,
  errorHandler,
};
