/**
 * ApiError Utility Tests
 * Tests for custom error class
 */

const httpStatus = require('http-status');
const ApiError = require('../../../src/utils/ApiError');

describe('ApiError', () => {
  describe('constructor', () => {
    test('should create error with status code and message', () => {
      const error = new ApiError(httpStatus.BAD_REQUEST, 'Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Test error message');
      expect(error.isOperational).toBe(true);
    });

    test('should set isOperational to true by default', () => {
      const error = new ApiError(httpStatus.NOT_FOUND, 'Not found');

      expect(error.isOperational).toBe(true);
    });

    test('should allow setting isOperational to false', () => {
      const error = new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Server error', false);

      expect(error.isOperational).toBe(false);
    });

    test('should capture stack trace', () => {
      const error = new ApiError(httpStatus.BAD_REQUEST, 'Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApiError');
    });
  });

  describe('common error scenarios', () => {
    test('should create 400 Bad Request error', () => {
      const error = new ApiError(httpStatus.BAD_REQUEST, 'Email đã tồn tại');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Email đã tồn tại');
    });

    test('should create 401 Unauthorized error', () => {
      const error = new ApiError(httpStatus.UNAUTHORIZED, 'Chưa đăng nhập');

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Chưa đăng nhập');
    });

    test('should create 403 Forbidden error', () => {
      const error = new ApiError(httpStatus.FORBIDDEN, 'Không có quyền truy cập');

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Không có quyền truy cập');
    });

    test('should create 404 Not Found error', () => {
      const error = new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Bệnh nhân không tồn tại');
    });

    test('should create 409 Conflict error', () => {
      const error = new ApiError(httpStatus.CONFLICT, 'Dữ liệu đã tồn tại');

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Dữ liệu đã tồn tại');
    });

    test('should create 500 Internal Server Error', () => {
      const error = new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Có lỗi xảy ra');

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Có lỗi xảy ra');
    });
  });

  describe('error inheritance', () => {
    test('should be throwable', () => {
      expect(() => {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Test error');
      }).toThrow('Test error');
    });

    test('should be catchable as Error', () => {
      const error = new ApiError(httpStatus.BAD_REQUEST, 'Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(400);
    });

    test('should be catchable as ApiError', () => {
      const error = new ApiError(httpStatus.NOT_FOUND, 'Not found');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(404);
    });
  });

  describe('error properties', () => {
    test('should have name property', () => {
      const error = new ApiError(httpStatus.BAD_REQUEST, 'Test');

      expect(error.name).toBe('Error');
    });

    test('should preserve stack trace', () => {
      const error = new ApiError(httpStatus.BAD_REQUEST, 'Test');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });
});
