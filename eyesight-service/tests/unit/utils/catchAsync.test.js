/**
 * catchAsync Utility Tests
 * Tests for async error handling wrapper
 */

const catchAsync = require('../../../src/utils/catchAsync');

describe('catchAsync', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('successful execution', () => {
    test('should execute async function successfully', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = catchAsync(asyncFn);

      await wrappedFn(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should pass request, response, and next to handler', async () => {
      const asyncFn = jest.fn().mockResolvedValue(undefined);
      const wrappedFn = catchAsync(asyncFn);

      await wrappedFn(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    test('should allow handler to send response', async () => {
      const asyncFn = jest.fn().mockImplementation(async (req, res) => {
        res.status(200).json({ message: 'success' });
      });
      const wrappedFn = catchAsync(asyncFn);

      await wrappedFn(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'success' });
    });
  });

  describe('error handling', () => {
    test('should catch and pass error to next middleware', async () => {
      const error = new Error('Test error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = catchAsync(asyncFn);

      // catchAsync returns a function that returns a Promise
      // We need to wait for the promise to resolve
      wrappedFn(mockReq, mockRes, mockNext);

      // Wait for the promise to settle
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    test('should handle ApiError', async () => {
      const ApiError = require('../../../src/utils/ApiError');
      const error = new ApiError(400, 'Bad request');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = catchAsync(asyncFn);

      wrappedFn(mockReq, mockRes, mockNext);

      // Wait for the promise to settle
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(ApiError);
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
    });

    test('should handle thrown errors', async () => {
      const asyncFn = jest.fn().mockImplementation(async () => {
        throw new Error('Thrown error');
      });
      const wrappedFn = catchAsync(asyncFn);

      wrappedFn(mockReq, mockRes, mockNext);

      // Wait for the promise to settle
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Thrown error');
    });

    test('should handle rejected promises', async () => {
      const asyncFn = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error('Rejected promise'));
      });
      const wrappedFn = catchAsync(asyncFn);

      wrappedFn(mockReq, mockRes, mockNext);

      // Wait for the promise to settle
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Rejected promise');
    });
  });

  describe('function wrapping', () => {
    test('should return a function', () => {
      const asyncFn = jest.fn();
      const wrappedFn = catchAsync(asyncFn);

      expect(typeof wrappedFn).toBe('function');
    });

    test('should preserve function behavior', async () => {
      let callCount = 0;
      const asyncFn = jest.fn().mockImplementation(async () => {
        callCount++;
      });
      const wrappedFn = catchAsync(asyncFn);

      await wrappedFn(mockReq, mockRes, mockNext);
      await wrappedFn(mockReq, mockRes, mockNext);

      expect(callCount).toBe(2);
    });
  });

  describe('edge cases', () => {
    test('should handle sync errors in async function', async () => {
      const asyncFn = jest.fn().mockImplementation(async () => {
        JSON.parse('invalid json'); // Sync error
      });
      const wrappedFn = catchAsync(asyncFn);

      wrappedFn(mockReq, mockRes, mockNext);

      // Wait for the promise to settle
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(expect.any(SyntaxError));
    });

    test('should handle undefined return', async () => {
      const asyncFn = jest.fn().mockResolvedValue(undefined);
      const wrappedFn = catchAsync(asyncFn);

      await wrappedFn(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle null return', async () => {
      const asyncFn = jest.fn().mockResolvedValue(null);
      const wrappedFn = catchAsync(asyncFn);

      await wrappedFn(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
