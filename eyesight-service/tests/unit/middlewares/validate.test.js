/**
 * Validate Middleware Tests
 * Tests for request validation middleware
 */

const Joi = require('joi');
const httpStatus = require('http-status');
const validate = require('../../../src/middlewares/validate');
const ApiError = require('../../../src/utils/ApiError');

describe('Validate Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {},
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('body validation', () => {
    const schema = {
      body: Joi.object().keys({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        age: Joi.number().integer().min(0).optional(),
      }),
    };

    test('should pass validation with valid body', () => {
      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.name).toBe('John Doe');
      expect(mockReq.body.email).toBe('john@example.com');
    });

    test('should fail validation with missing required field', () => {
      mockReq.body = {
        name: 'John Doe',
        // email is missing
      };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      const error = mockNext.mock.calls[0][0];
      expect(error.statusCode).toBe(httpStatus.BAD_REQUEST);
      expect(error.message).toContain('email');
    });

    test('should fail validation with invalid email format', () => {
      mockReq.body = {
        name: 'John Doe',
        email: 'invalid-email',
      };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toContain('email');
    });

    test('should fail validation with invalid type', () => {
      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 'not-a-number',
      };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toContain('age');
    });

    test('should report all validation errors', () => {
      mockReq.body = {
        // name is missing
        email: 'invalid-email',
        age: -1,
      };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      const error = mockNext.mock.calls[0][0];
      // Should contain multiple error messages
      expect(error.message).toContain('name');
      expect(error.message).toContain('email');
    });
  });

  describe('params validation', () => {
    const schema = {
      params: Joi.object().keys({
        userId: Joi.number().integer().required(),
      }),
    };

    test('should pass validation with valid params', () => {
      mockReq.params = { userId: 1 };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should fail validation with invalid params', () => {
      mockReq.params = { userId: 'not-a-number' };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    test('should fail validation with missing params', () => {
      mockReq.params = {};

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('query validation', () => {
    const schema = {
      query: Joi.object().keys({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        sortBy: Joi.string().optional(),
        order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').optional(),
      }),
    };

    test('should pass validation with valid query', () => {
      mockReq.query = {
        page: 1,
        limit: 20,
        sortBy: 'name',
        order: 'ASC',
      };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should apply default values', () => {
      mockReq.query = {};

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.query.page).toBe(1);
      expect(mockReq.query.limit).toBe(10);
    });

    test('should fail validation with invalid order value', () => {
      mockReq.query = {
        order: 'INVALID',
      };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toContain('order');
    });

    test('should fail validation with limit exceeding max', () => {
      mockReq.query = {
        limit: 200,
      };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('combined validation', () => {
    const schema = {
      params: Joi.object().keys({
        patientId: Joi.number().integer().required(),
      }),
      query: Joi.object().keys({
        includeDeleted: Joi.boolean().optional(),
      }),
      body: Joi.object().keys({
        name: Joi.string().required(),
      }),
    };

    test('should validate all parts of request', () => {
      mockReq.params = { patientId: 1 };
      mockReq.query = { includeDeleted: false };
      mockReq.body = { name: 'Test Patient' };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should fail if any part is invalid', () => {
      mockReq.params = { patientId: 'invalid' };
      mockReq.query = { includeDeleted: false };
      mockReq.body = { name: 'Test Patient' };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('real-world schemas', () => {
    describe('user creation schema', () => {
      const createUserSchema = {
        body: Joi.object().keys({
          email: Joi.string().required().email(),
          password: Joi.string().required().min(8),
          name: Joi.string().required(),
          phoneNumber: Joi.string()
            .pattern(/^0\d{9}$/)
            .optional(),
          userType: Joi.string().valid('admin', 'doctor', 'patient').required(),
          centerId: Joi.number().required(),
        }),
      };

      test('should validate valid user creation request', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          phoneNumber: '0123456789',
          userType: 'patient',
          centerId: 1,
        };

        validate(createUserSchema)(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      test('should reject invalid phone number format', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          phoneNumber: '123456789', // Missing leading 0
          userType: 'patient',
          centerId: 1,
        };

        validate(createUserSchema)(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      });

      test('should reject invalid userType', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          userType: 'invalid',
          centerId: 1,
        };

        validate(createUserSchema)(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      });
    });

    describe('patient query schema', () => {
      const queryPatientsSchema = {
        query: Joi.object().keys({
          name: Joi.string().optional(),
          status: Joi.string().valid('active', 'inactive', 'completed').optional(),
          severityLevel: Joi.string().valid('mild', 'moderate', 'severe', 'critical').optional(),
          centerId: Joi.number().optional(),
          page: Joi.number().integer().min(1).optional(),
          limit: Joi.number().integer().min(1).max(100).optional(),
          sortBy: Joi.string().optional(),
          order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').optional(),
        }),
      };

      test('should validate valid patient query', () => {
        mockReq.query = {
          status: 'active',
          severityLevel: 'moderate',
          page: 1,
          limit: 20,
        };

        validate(queryPatientsSchema)(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      test('should reject invalid status', () => {
        mockReq.query = {
          status: 'invalid_status',
        };

        validate(queryPatientsSchema)(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      });
    });
  });
});
