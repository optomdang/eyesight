/**
 * Doctor Service Unit Tests
 * Tests for doctor CRUD operations
 */

// Mock dependencies first
jest.mock('../../../src/config/db', () => ({
  sequelize: {
    transaction: jest.fn(() => ({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
  },
}));

jest.mock('../../../src/models', () => ({
  Doctor: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    isDuplicateCode: jest.fn(),
  },
  User: {},
  Clinic: {},
  Patient: {
    count: jest.fn(),
  },
}));

const { Doctor, Patient } = require('../../../src/models');
const doctorService = require('../../../src/services/clinic/doctor.service');

describe('Doctor Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDoctor', () => {
    const mockDoctorData = {
      code: 'D001',
      name: 'Dr. Test',
      userId: 1,
      centerId: 1,
      clinicId: 1,
      specialization: 'Ophthalmology',
      updatedBy: 1,
    };

    test('should create doctor successfully', async () => {
      Doctor.isDuplicateCode.mockResolvedValue(false);
      Doctor.create.mockResolvedValue({ id: 1, ...mockDoctorData });

      const result = await doctorService.createDoctor(mockDoctorData);

      expect(Doctor.isDuplicateCode).toHaveBeenCalledWith('D001', 1);
      expect(Doctor.create).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    test('should throw error if doctor code already exists', async () => {
      Doctor.isDuplicateCode.mockResolvedValue(true);

      await expect(doctorService.createDoctor(mockDoctorData)).rejects.toThrow('Mã bác sĩ đã tồn tại');
      expect(Doctor.create).not.toHaveBeenCalled();
    });

    test('should set createdBy from updatedBy', async () => {
      Doctor.isDuplicateCode.mockResolvedValue(false);
      Doctor.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));

      await doctorService.createDoctor(mockDoctorData);

      const createCall = Doctor.create.mock.calls[0][0];
      expect(createCall.createdBy).toBe(mockDoctorData.updatedBy);
    });

    test('should work with transaction', async () => {
      const mockTransaction = { id: 'transaction' };
      Doctor.isDuplicateCode.mockResolvedValue(false);
      Doctor.create.mockResolvedValue({ id: 1, ...mockDoctorData });

      await doctorService.createDoctor(mockDoctorData, mockTransaction);

      expect(Doctor.create).toHaveBeenCalledWith(expect.any(Object), { transaction: mockTransaction });
    });
  });

  describe('getDoctorById', () => {
    test('should return doctor with relations', async () => {
      const mockDoctor = {
        id: 1,
        code: 'D001',
        name: 'Dr. Test',
        user: { id: 1, name: 'User' },
        clinic: { id: 1, name: 'Clinic' },
      };

      Doctor.findByPk.mockResolvedValue(mockDoctor);

      const result = await doctorService.getDoctorById(1);

      expect(Doctor.findByPk).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          include: expect.any(Array),
        })
      );
      expect(result).toEqual(mockDoctor);
    });

    test('should return null for non-existent doctor', async () => {
      Doctor.findByPk.mockResolvedValue(null);

      const result = await doctorService.getDoctorById(999);

      expect(result).toBeNull();
    });

    test('should include patient count when includeCount is true', async () => {
      const mockDoctor = {
        id: 1,
        code: 'D001',
        toJSON: jest.fn(() => ({ id: 1, code: 'D001' })),
      };

      Doctor.findByPk.mockResolvedValue(mockDoctor);
      Patient.count.mockResolvedValue(5);

      const result = await doctorService.getDoctorById(1, { includeCount: true });

      expect(Patient.count).toHaveBeenCalledWith({
        where: { doctorId: 1, deleted: false },
      });
      expect(result.treatedPatientsCount).toBe(5);
    });
  });

  describe('getDoctorByCode', () => {
    test('should return doctor by code', async () => {
      const mockDoctor = { id: 1, code: 'D001' };
      Doctor.findOne.mockResolvedValue(mockDoctor);

      const result = await doctorService.getDoctorByCode('D001');

      expect(Doctor.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ code: 'D001' }),
        })
      );
      expect(result).toEqual(mockDoctor);
    });
  });

  describe('updateDoctorById', () => {
    const mockExistingDoctor = {
      id: 1,
      code: 'D001',
      centerId: 1,
      save: jest.fn(),
    };

    test('should update doctor successfully', async () => {
      Doctor.findByPk.mockResolvedValue(mockExistingDoctor);
      Doctor.isDuplicateCode.mockResolvedValue(false);

      const updateData = { name: 'Updated Name' };

      const result = await doctorService.updateDoctorById(1, updateData);

      expect(mockExistingDoctor.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should throw error for non-existent doctor', async () => {
      Doctor.findByPk.mockResolvedValue(null);

      await expect(doctorService.updateDoctorById(999, { name: 'Test' })).rejects.toThrow('Bác sĩ không tồn tại');
    });

    test('should throw error if new code already exists', async () => {
      Doctor.findByPk.mockResolvedValue(mockExistingDoctor);
      Doctor.isDuplicateCode.mockResolvedValue(true);

      await expect(doctorService.updateDoctorById(1, { code: 'DUPLICATE' })).rejects.toThrow('Mã bác sĩ đã tồn tại');
    });
  });

  describe('deleteDoctorById', () => {
    test('should soft delete doctor', async () => {
      const mockDoctor = {
        id: 1,
        update: jest.fn(),
      };

      Doctor.findByPk.mockResolvedValue(mockDoctor);

      await doctorService.deleteDoctorById(1);

      expect(mockDoctor.update).toHaveBeenCalledWith({
        deleted: true,
        deletedAt: expect.any(Date),
      });
    });

    test('should throw error for non-existent doctor', async () => {
      Doctor.findByPk.mockResolvedValue(null);

      await expect(doctorService.deleteDoctorById(999)).rejects.toThrow('Bác sĩ không tồn tại');
    });
  });

  describe('queryDoctors', () => {
    test('should return paginated doctors', async () => {
      const mockDoctors = [
        { id: 1, code: 'D001', toJSON: jest.fn(() => ({ id: 1, code: 'D001' })) },
        { id: 2, code: 'D002', toJSON: jest.fn(() => ({ id: 2, code: 'D002' })) },
      ];

      Doctor.count.mockResolvedValue(2);
      Doctor.findAll.mockResolvedValue(mockDoctors);

      const result = await doctorService.queryDoctors({ centerId: 1 }, { page: 1, limit: 10 });

      expect(result.rows).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    test('should filter by clinicId', async () => {
      Doctor.count.mockResolvedValue(0);
      Doctor.findAll.mockResolvedValue([]);

      await doctorService.queryDoctors({ centerId: 1, clinicId: 1 }, {});

      expect(Doctor.count).toHaveBeenCalled();
      expect(Doctor.findAll).toHaveBeenCalled();
    });

    test('should handle sorting', async () => {
      Doctor.count.mockResolvedValue(0);
      Doctor.findAll.mockResolvedValue([]);

      await doctorService.queryDoctors({ centerId: 1 }, { sortBy: 'name:ASC' });

      expect(Doctor.findAll).toHaveBeenCalled();
    });
  });

  describe('getDoctorByUserId', () => {
    test('should return doctor by userId', async () => {
      const mockDoctor = { id: 1, userId: 1 };
      Doctor.findOne.mockResolvedValue(mockDoctor);

      const result = await doctorService.getDoctorByUserId(1);

      expect(Doctor.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 1 }),
        })
      );
      expect(result).toEqual(mockDoctor);
    });

    test('should return null if doctor not found', async () => {
      Doctor.findOne.mockResolvedValue(null);

      const result = await doctorService.getDoctorByUserId(999);

      expect(result).toBeNull();
    });
  });

  describe('deleteDoctorByIds', () => {
    test('should bulk soft delete doctors', async () => {
      Doctor.update.mockResolvedValue([2]);

      await doctorService.deleteDoctorByIds([1, 2]);

      expect(Doctor.update).toHaveBeenCalledWith({ deleted: true, deletedAt: expect.any(Date) }, { where: { id: [1, 2] } });
    });
  });
});
