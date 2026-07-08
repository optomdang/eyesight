/**
 * InjectData Middleware Tests
 * Tests for data injection middleware (centerId, updatedBy)
 */

const injectData = require('../../../src/middlewares/injectData');

describe('InjectData Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 1,
        centerId: 100,
      },
      body: {},
      query: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('body injection', () => {
    test('should inject centerId and updatedBy into body', () => {
      mockReq.body = { name: 'Test' };

      injectData('body')(mockReq, mockRes, mockNext);

      expect(mockReq.body.centerId).toBe(100);
      expect(mockReq.body.updatedBy).toBe(1);
      expect(mockReq.body.name).toBe('Test');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should override client-supplied centerId in body (multi-tenant security)', () => {
      // A client must never be able to act on another center by supplying centerId.
      mockReq.body = { name: 'Test', centerId: 200 };

      injectData('body')(mockReq, mockRes, mockNext);

      expect(mockReq.body.centerId).toBe(100); // forced to the authenticated user's center
      expect(mockReq.body.updatedBy).toBe(1);
    });

    test('should always set updatedBy from user', () => {
      mockReq.body = { name: 'Test', updatedBy: 999 };

      injectData('body')(mockReq, mockRes, mockNext);

      expect(mockReq.body.updatedBy).toBe(1);
    });

    test('should handle empty body', () => {
      mockReq.body = {};

      injectData('body')(mockReq, mockRes, mockNext);

      expect(mockReq.body.centerId).toBe(100);
      expect(mockReq.body.updatedBy).toBe(1);
    });
  });

  describe('query injection', () => {
    test('should inject centerId into query', () => {
      mockReq.query = { page: 1, limit: 10 };

      injectData('query')(mockReq, mockRes, mockNext);

      expect(mockReq.query.centerId).toBe(100);
      expect(mockReq.query.page).toBe(1);
      expect(mockReq.query.limit).toBe(10);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should override client-supplied centerId in query (multi-tenant security)', () => {
      // Dashboards read req.query.centerId; it must come from the token, not the client,
      // so a user cannot read another center's reports via ?centerId=200.
      mockReq.query = { page: 1, centerId: 200 };

      injectData('query')(mockReq, mockRes, mockNext);

      expect(mockReq.query.centerId).toBe(100); // forced to the authenticated user's center
    });

    test('should not inject updatedBy into query', () => {
      mockReq.query = { page: 1 };

      injectData('query')(mockReq, mockRes, mockNext);

      expect(mockReq.query.updatedBy).toBeUndefined();
    });

    test('should handle empty query', () => {
      mockReq.query = {};

      injectData('query')(mockReq, mockRes, mockNext);

      expect(mockReq.query.centerId).toBe(100);
    });
  });

  describe('without user', () => {
    test('should not inject data when user is not present', () => {
      mockReq.user = null;
      mockReq.body = { name: 'Test' };

      injectData('body')(mockReq, mockRes, mockNext);

      expect(mockReq.body.centerId).toBeUndefined();
      expect(mockReq.body.updatedBy).toBeUndefined();
      expect(mockReq.body.name).toBe('Test');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should not inject data when user is undefined', () => {
      mockReq.user = undefined;
      mockReq.query = { page: 1 };

      injectData('query')(mockReq, mockRes, mockNext);

      expect(mockReq.query.centerId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle user with centerId 0', () => {
      mockReq.user = { id: 1, centerId: 0 };
      mockReq.body = { name: 'Test' };

      injectData('body')(mockReq, mockRes, mockNext);

      // 0 is falsy, so it should be replaced with user's centerId
      expect(mockReq.body.centerId).toBe(0);
    });

    test('should handle user with id 0', () => {
      mockReq.user = { id: 0, centerId: 100 };
      mockReq.body = { name: 'Test' };

      injectData('body')(mockReq, mockRes, mockNext);

      expect(mockReq.body.updatedBy).toBe(0);
    });

    test('should preserve other body properties', () => {
      mockReq.body = {
        name: 'Test',
        email: 'test@example.com',
        config: { setting: true },
        items: [1, 2, 3],
      };

      injectData('body')(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('Test');
      expect(mockReq.body.email).toBe('test@example.com');
      expect(mockReq.body.config).toEqual({ setting: true });
      expect(mockReq.body.items).toEqual([1, 2, 3]);
    });

    test('should preserve other query properties', () => {
      mockReq.query = {
        page: 1,
        limit: 10,
        sortBy: 'name',
        order: 'ASC',
        status: 'active',
      };

      injectData('query')(mockReq, mockRes, mockNext);

      expect(mockReq.query.page).toBe(1);
      expect(mockReq.query.limit).toBe(10);
      expect(mockReq.query.sortBy).toBe('name');
      expect(mockReq.query.order).toBe('ASC');
      expect(mockReq.query.status).toBe('active');
    });
  });

  describe('real-world scenarios', () => {
    test('should inject data for patient creation', () => {
      mockReq.body = {
        code: 'P001',
        name: 'Test Patient',
        userId: 5,
        clinicId: 10,
      };

      injectData('body')(mockReq, mockRes, mockNext);

      expect(mockReq.body).toEqual({
        code: 'P001',
        name: 'Test Patient',
        userId: 5,
        clinicId: 10,
        centerId: 100,
        updatedBy: 1,
      });
    });

    test('should inject data for patient query', () => {
      mockReq.query = {
        status: 'active',
        severityLevel: 'moderate',
        page: 1,
        limit: 20,
      };

      injectData('query')(mockReq, mockRes, mockNext);

      expect(mockReq.query).toEqual({
        status: 'active',
        severityLevel: 'moderate',
        page: 1,
        limit: 20,
        centerId: 100,
      });
    });

    test('should inject data for exercise config creation', () => {
      mockReq.body = {
        exerciseId: 1,
        name: 'Test Config',
        visionType: 'far',
        visionLevel: 10,
        duration: 30,
      };

      injectData('body')(mockReq, mockRes, mockNext);

      expect(mockReq.body.centerId).toBe(100);
      expect(mockReq.body.updatedBy).toBe(1);
    });
  });

  describe('middleware chaining', () => {
    test('should call next() to continue middleware chain', () => {
      injectData('body')(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should return result of next()', () => {
      mockNext.mockReturnValue('next-result');

      const result = injectData('body')(mockReq, mockRes, mockNext);

      expect(result).toBe('next-result');
    });
  });
});
