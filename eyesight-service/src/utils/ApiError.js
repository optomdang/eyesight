class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '', errorCode = null, metadata = {}) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode; // Added: Standardized error code
    this.metadata = metadata; // Added: Additional context for debugging
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
