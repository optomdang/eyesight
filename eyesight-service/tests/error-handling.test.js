const httpStatus = require('http-status');
const ApiError = require('../src/utils/ApiError');
const catchAsync = require('../src/utils/catchAsync');

describe('Error Handling Consistency', () => {
  describe('ApiError Usage', () => {
    test('should create ApiError with Vietnamese message', () => {
      const error = new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');

      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(httpStatus.NOT_FOUND);
      expect(error.message).toBe('Bệnh nhân không tồn tại');
      expect(error.isOperational).toBe(true);
    });

    test('should create ApiError with proper status codes', () => {
      const notFoundError = new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy');
      const badRequestError = new ApiError(httpStatus.BAD_REQUEST, 'Dữ liệu không hợp lệ');
      const forbiddenError = new ApiError(httpStatus.FORBIDDEN, 'Không có quyền truy cập');

      expect(notFoundError.statusCode).toBe(404);
      expect(badRequestError.statusCode).toBe(400);
      expect(forbiddenError.statusCode).toBe(403);
    });
  });

  describe('CatchAsync Wrapper', () => {
    test('should wrap async function and handle errors', async () => {
      const mockReq = {};
      const mockRes = { send: jest.fn() };
      const mockNext = jest.fn();

      const asyncFunction = catchAsync(async (_req, _res) => {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Test error');
      });

      await asyncFunction(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.BAD_REQUEST,
          message: 'Test error',
        })
      );
    });

    test('should handle successful async operations', async () => {
      const mockReq = {};
      const mockRes = { send: jest.fn() };
      const mockNext = jest.fn();

      const asyncFunction = catchAsync(async (req, res) => {
        res.send({ success: true });
      });

      await asyncFunction(mockReq, mockRes, mockNext);

      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Vietnamese Error Messages', () => {
    test('should use Vietnamese for common error scenarios', () => {
      const errors = [
        { code: httpStatus.NOT_FOUND, message: 'Bệnh nhân không tồn tại' },
        { code: httpStatus.NOT_FOUND, message: 'Bài tập không tồn tại' },
        { code: httpStatus.NOT_FOUND, message: 'Cấu hình không tồn tại' },
        { code: httpStatus.BAD_REQUEST, message: 'Email đã tồn tại' },
        { code: httpStatus.BAD_REQUEST, message: 'Số điện thoại đã tồn tại' },
        { code: httpStatus.FORBIDDEN, message: 'Không có quyền truy cập' },
        { code: httpStatus.FORBIDDEN, message: 'Không có quyền cập nhật' },
        { code: httpStatus.FORBIDDEN, message: 'Không có quyền xóa' },
      ];

      errors.forEach(({ code, message }) => {
        const error = new ApiError(code, message);
        // Check that message contains Vietnamese characters or common Vietnamese words
        const hasVietnamese =
          /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(message) ||
          /không|tồn tại|quyền|đã|có/.test(message);
        expect(hasVietnamese).toBe(true);
        expect(error.statusCode).toBe(code);
      });
    });
  });

  describe('CenterId Security Pattern', () => {
    test('should validate centerId security check pattern', () => {
      const mockUser = { centerId: 1 };
      const mockEntity = { centerId: 2 };

      // Simulate centerId security check
      const checkCenterAccess = (entity, user) => {
        if (entity.centerId !== user.centerId) {
          throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền truy cập');
        }
      };

      expect(() => {
        checkCenterAccess(mockEntity, mockUser);
      }).toThrow('Không có quyền truy cập');
    });

    test('should allow access when centerIds match', () => {
      const mockUser = { centerId: 1 };
      const mockEntity = { centerId: 1 };

      const checkCenterAccess = (entity, user) => {
        if (entity.centerId !== user.centerId) {
          throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền truy cập');
        }
        return true;
      };

      expect(() => {
        checkCenterAccess(mockEntity, mockUser);
      }).not.toThrow();
    });
  });
});
