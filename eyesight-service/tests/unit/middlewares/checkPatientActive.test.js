const httpStatus = require('http-status');
const checkPatientActive = require('../../../src/middlewares/checkPatientActive');
const { Patient } = require('../../../src/models');
const ApiError = require('../../../src/utils/ApiError');

// Mock the Patient model
jest.mock('../../../src/models', () => ({
  Patient: {
    findOne: jest.fn(),
  },
}));

describe('checkPatientActive middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Reset request, response, and next function
    req = {
      user: null,
      patient: null,
    };
    res = {};
    next = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Non-patient users', () => {
    it('should allow doctors to proceed without checking patient status', async () => {
      req.user = {
        id: 1,
        userType: 'doctor',
        email: 'doctor@test.com',
      };

      await checkPatientActive(req, res, next);

      // Should call next without error
      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);

      // Should NOT query Patient model
      expect(Patient.findOne).not.toHaveBeenCalled();

      // Should NOT set req.patient
      expect(req.patient).toBeNull();
    });

    it('should allow admins to proceed without checking patient status', async () => {
      req.user = {
        id: 2,
        userType: 'admin',
        email: 'admin@test.com',
      };

      await checkPatientActive(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(Patient.findOne).not.toHaveBeenCalled();
      expect(req.patient).toBeNull();
    });

    it('should allow users with undefined userType to proceed', async () => {
      req.user = {
        id: 3,
        email: 'user@test.com',
      };

      await checkPatientActive(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(Patient.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Active patients', () => {
    it('should allow active patients to proceed', async () => {
      req.user = {
        id: 10,
        userType: 'patient',
        email: 'patient@test.com',
      };

      const mockPatient = {
        id: 100,
        treatmentStatus: 'active',
        doctorId: 5,
      };

      Patient.findOne.mockResolvedValue(mockPatient);

      await checkPatientActive(req, res, next);

      // Should query Patient model with correct parameters
      expect(Patient.findOne).toHaveBeenCalledWith({
        where: {
          userId: 10,
          deleted: false,
        },
        attributes: ['id', 'treatmentStatus', 'doctorId'],
      });

      // Should cache patient record in req.patient
      expect(req.patient).toEqual(mockPatient);

      // Should call next without error
      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should cache patient record for controller use', async () => {
      req.user = {
        id: 11,
        userType: 'patient',
      };

      const mockPatient = {
        id: 101,
        treatmentStatus: 'active',
        doctorId: 6,
      };

      Patient.findOne.mockResolvedValue(mockPatient);

      await checkPatientActive(req, res, next);

      // Verify patient is cached in request
      expect(req.patient).toBeDefined();
      expect(req.patient.id).toBe(101);
      expect(req.patient.treatmentStatus).toBe('active');
      expect(req.patient.doctorId).toBe(6);
    });
  });

  describe('Inactive patients', () => {
    it('should block inactive patients with 403 error', async () => {
      req.user = {
        id: 20,
        userType: 'patient',
        email: 'inactive@test.com',
      };

      const mockPatient = {
        id: 200,
        treatmentStatus: 'paused',
        doctorId: 7,
      };

      Patient.findOne.mockResolvedValue(mockPatient);

      await checkPatientActive(req, res, next);

      // Should query Patient model
      expect(Patient.findOne).toHaveBeenCalledWith({
        where: {
          userId: 20,
          deleted: false,
        },
        attributes: ['id', 'treatmentStatus', 'doctorId'],
      });

      // Should call next with ApiError
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(httpStatus.FORBIDDEN);
      expect(error.message).toBe(
        'Tài khoản của bạn hiện không trong liệu trình điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ.'
      );

      // Should NOT cache patient record
      expect(req.patient).toBeNull();
    });

    it('should use correct Vietnamese error message', async () => {
      req.user = {
        id: 21,
        userType: 'patient',
      };

      Patient.findOne.mockResolvedValue({
        id: 201,
        treatmentStatus: 'paused',
        doctorId: 8,
      });

      await checkPatientActive(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('không trong liệu trình điều trị');
      expect(error.message).toContain('bác sĩ');
    });
  });

  describe('Error cases', () => {
    it('should return 404 if patient record not found', async () => {
      req.user = {
        id: 30,
        userType: 'patient',
        email: 'orphan@test.com',
      };

      // Patient record not found
      Patient.findOne.mockResolvedValue(null);

      await checkPatientActive(req, res, next);

      // Should call next with 404 error
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(httpStatus.NOT_FOUND);
      expect(error.message).toBe('Thông tin bệnh nhân không tồn tại');
    });

    it('should handle database errors gracefully', async () => {
      req.user = {
        id: 31,
        userType: 'patient',
      };

      const dbError = new Error('Database connection failed');
      Patient.findOne.mockRejectedValue(dbError);

      await checkPatientActive(req, res, next);

      // Should propagate database error
      expect(next).toHaveBeenCalledWith(dbError);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should handle unexpected errors', async () => {
      req.user = {
        id: 32,
        userType: 'patient',
      };

      const unexpectedError = new Error('Unexpected error');
      Patient.findOne.mockRejectedValue(unexpectedError);

      await checkPatientActive(req, res, next);

      expect(next).toHaveBeenCalledWith(unexpectedError);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing req.user gracefully', async () => {
      req.user = null;

      await checkPatientActive(req, res, next);

      // Should proceed without error (skip check)
      expect(next).toHaveBeenCalledWith();
      expect(Patient.findOne).not.toHaveBeenCalled();
    });

    it('should handle undefined req.user gracefully', async () => {
      req.user = undefined;

      await checkPatientActive(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(Patient.findOne).not.toHaveBeenCalled();
    });

    it('should only query non-deleted patients', async () => {
      req.user = {
        id: 40,
        userType: 'patient',
      };

      Patient.findOne.mockResolvedValue({
        id: 400,
        treatmentStatus: 'active',
        doctorId: 10,
      });

      await checkPatientActive(req, res, next);

      // Verify deleted: false is in query
      const queryArgs = Patient.findOne.mock.calls[0][0];
      expect(queryArgs.where.deleted).toBe(false);
    });

    it('should use minimal attributes for performance', async () => {
      req.user = {
        id: 41,
        userType: 'patient',
      };

      Patient.findOne.mockResolvedValue({
        id: 401,
        treatmentStatus: 'active',
        doctorId: 11,
      });

      await checkPatientActive(req, res, next);

      // Verify only necessary attributes are queried
      const queryArgs = Patient.findOne.mock.calls[0][0];
      expect(queryArgs.attributes).toEqual(['id', 'treatmentStatus', 'doctorId']);
      expect(queryArgs.attributes.length).toBe(3);
    });
  });

  describe('Integration with error handling', () => {
    it('should work with Express error handling middleware', async () => {
      req.user = {
        id: 50,
        userType: 'patient',
      };

      Patient.findOne.mockResolvedValue({
        id: 500,
        treatmentStatus: 'paused',
        doctorId: 12,
      });

      await checkPatientActive(req, res, next);

      // Error should be passed to next() for error middleware
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];

      // Error should have properties for error middleware
      expect(error).toHaveProperty('statusCode');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('isOperational');
    });
  });
});
