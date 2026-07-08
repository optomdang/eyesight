/**
 * User Service Unit Tests
 * Tests for user CRUD operations, authentication, and role management
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
  User: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    isEmailTaken: jest.fn(),
    isPhoneNumberTaken: jest.fn(),
  },
  Center: {},
  Role: {},
  Clinic: {},
  Doctor: {},
  Patient: {},
}));

jest.mock('../../../src/services/authentication/role.service', () => ({
  getRoleByCodeAndCenterId: jest.fn(),
}));

jest.mock('../../../src/services/clinic/doctor.service', () => ({
  createDoctor: jest.fn(),
  updateDoctorById: jest.fn(),
}));

jest.mock('../../../src/services/clinic/patient.service', () => ({
  createPatient: jest.fn(),
  updatePatientById: jest.fn(),
}));

const { User } = require('../../../src/models');
const { getRoleByCodeAndCenterId } = require('../../../src/services/authentication/role.service');
const doctorService = require('../../../src/services/clinic/doctor.service');
const patientService = require('../../../src/services/clinic/patient.service');
const userService = require('../../../src/services/authentication/user.service');

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const mockUserData = {
      email: 'test@example.com',
      name: 'Test User',
      phoneNumber: '0123456789',
      centerId: 1,
      userType: 'patient',
      updatedBy: 1,
      patient: {
        code: 'P001',
        name: 'Test Patient',
      },
    };

    const mockRole = { id: 3, code: 'patient' };
    const mockCreatedUser = {
      id: 1,
      ...mockUserData,
      roleId: 3,
    };

    test('should create user successfully with patient record', async () => {
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);
      getRoleByCodeAndCenterId.mockResolvedValue(mockRole);
      User.create.mockResolvedValue(mockCreatedUser);
      User.findByPk.mockResolvedValue(mockCreatedUser);
      patientService.createPatient.mockResolvedValue({ id: 1 });

      const result = await userService.createUser(mockUserData);

      expect(User.isEmailTaken).toHaveBeenCalledWith(mockUserData.email);
      expect(User.isPhoneNumberTaken).toHaveBeenCalledWith(mockUserData.phoneNumber);
      expect(getRoleByCodeAndCenterId).toHaveBeenCalledWith('patient', 1);
      expect(patientService.createPatient).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should throw error if email already exists', async () => {
      User.isEmailTaken.mockResolvedValue(true);

      await expect(userService.createUser(mockUserData)).rejects.toThrow('Email đã tồn tại');
      expect(User.create).not.toHaveBeenCalled();
    });

    test('should throw error if phone number already exists', async () => {
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(true);

      await expect(userService.createUser(mockUserData)).rejects.toThrow('Số điện thoại đã tồn tại');
      expect(User.create).not.toHaveBeenCalled();
    });

    test('should throw error if role not found for userType', async () => {
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);
      getRoleByCodeAndCenterId.mockResolvedValue(null);

      await expect(userService.createUser(mockUserData)).rejects.toThrow('Vai trò patient không tồn tại cho trung tâm 1');
    });

    test('should create doctor record when userType is doctor', async () => {
      const doctorUserData = {
        ...mockUserData,
        userType: 'doctor',
        doctor: {
          specialization: 'Ophthalmology',
        },
        patient: undefined,
      };

      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);
      getRoleByCodeAndCenterId.mockResolvedValue({ id: 2, code: 'doctor' });
      User.create.mockResolvedValue({ id: 1, ...doctorUserData, roleId: 2 });
      User.findByPk.mockResolvedValue({ id: 1, ...doctorUserData });
      doctorService.createDoctor.mockResolvedValue({ id: 1 });

      await userService.createUser(doctorUserData);

      expect(doctorService.createDoctor).toHaveBeenCalled();
      expect(patientService.createPatient).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    test('should return user with relations', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: { id: 1, name: 'Admin' },
        center: { id: 1, name: 'Center 1' },
      };

      User.findByPk.mockResolvedValue(mockUser);

      const result = await userService.getUserById(1);

      expect(User.findByPk).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          include: expect.any(Array),
        })
      );
      expect(result).toEqual(mockUser);
    });

    test('should return null for non-existent user', async () => {
      User.findByPk.mockResolvedValue(null);

      const result = await userService.getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    test('should return user by email', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await userService.getUserByEmail('test@example.com');

      expect(User.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        })
      );
      expect(result).toEqual(mockUser);
    });

    test('should return null for non-existent email', async () => {
      User.findOne.mockResolvedValue(null);

      const result = await userService.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateUserById', () => {
    const mockExistingUser = {
      id: 1,
      email: 'old@example.com',
      name: 'Old Name',
      centerId: 1,
      userType: 'patient',
      save: jest.fn(),
    };

    test('should update user successfully', async () => {
      User.findByPk.mockResolvedValue(mockExistingUser);
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);

      const updateData = { name: 'New Name' };

      await userService.updateUserById(1, updateData);

      expect(mockExistingUser.save).toHaveBeenCalled();
    });

    test('should update patient data when patient object provided', async () => {
      const mockPatientUser = { ...mockExistingUser, userType: 'patient' };
      User.findByPk.mockResolvedValueOnce(mockPatientUser).mockResolvedValueOnce({ ...mockPatientUser, patient: { id: 1 } });
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);
      patientService.updatePatientById.mockResolvedValue({ id: 1 });

      const updateData = {
        name: 'Updated Name',
        patient: {
          id: 1,
          severityLevel: 'moderate',
          treatmentStatus: true,
        },
      };

      await userService.updateUserById(1, updateData);

      expect(mockPatientUser.save).toHaveBeenCalled();
      expect(patientService.updatePatientById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          id: 1,
          severityLevel: 'moderate',
          treatmentStatus: true,
          userId: 1,
          centerId: 1,
        }),
        expect.any(Object)
      );
    });

    test('should update doctor data when doctor object provided', async () => {
      const mockDoctorUser = { ...mockExistingUser, userType: 'doctor' };
      User.findByPk.mockResolvedValueOnce(mockDoctorUser).mockResolvedValueOnce({ ...mockDoctorUser, doctor: { id: 1 } });
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);
      doctorService.updateDoctorById.mockResolvedValue({ id: 1 });

      const updateData = {
        name: 'Updated Name',
        doctor: {
          id: 1,
          specialization: 'Cardiology',
          licenseNumber: 'LIC123',
        },
      };

      await userService.updateUserById(1, updateData);

      expect(mockDoctorUser.save).toHaveBeenCalled();
      expect(doctorService.updateDoctorById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          id: 1,
          specialization: 'Cardiology',
          licenseNumber: 'LIC123',
          userId: 1,
          centerId: 1,
        }),
        expect.any(Object)
      );
    });

    test('should update patient data regardless of userType', async () => {
      // This test ensures patient data is updated even if userType is 'doctor' or 'admin'
      // because we check for presence of patient object, not userType
      const mockAdminUser = { ...mockExistingUser, userType: 'admin' };
      User.findByPk.mockResolvedValueOnce(mockAdminUser).mockResolvedValueOnce({ ...mockAdminUser, patient: { id: 1 } });
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);
      patientService.updatePatientById.mockResolvedValue({ id: 1 });

      const updateData = {
        name: 'Updated Name',
        patient: {
          id: 1,
          severityLevel: 'severe',
        },
      };

      await userService.updateUserById(1, updateData);

      expect(patientService.updatePatientById).toHaveBeenCalled();
    });

    test('should throw error for non-existent user', async () => {
      User.findByPk.mockResolvedValue(null);

      await expect(userService.updateUserById(999, { name: 'Test' })).rejects.toThrow('Tài khoản không tồn tại');
    });

    test('should throw error if new email already taken', async () => {
      User.findByPk.mockResolvedValue(mockExistingUser);
      User.isEmailTaken.mockResolvedValue(true);

      await expect(userService.updateUserById(1, { email: 'taken@example.com' })).rejects.toThrow('Email đã tồn tại');
    });

    test('should throw error if new phone number already taken', async () => {
      User.findByPk.mockResolvedValue(mockExistingUser);
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(true);

      await expect(userService.updateUserById(1, { phoneNumber: '0987654321' })).rejects.toThrow('Số điện thoại đã tồn tại');
    });
  });

  describe('queryUsers', () => {
    test('should return paginated users', async () => {
      const mockUsers = [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
      ];

      User.findAndCountAll.mockResolvedValue({
        rows: mockUsers,
        count: 2,
      });

      const result = await userService.queryUsers({}, { page: 1, limit: 10 });

      expect(result.rows).toEqual(mockUsers);
      expect(result.total).toBe(2);
    });

    test('should filter by name with accent removal', async () => {
      User.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      await userService.queryUsers({ name: 'Nguyễn' }, {});

      expect(User.findAndCountAll).toHaveBeenCalled();
    });
  });

  describe('storeRegistrationToken', () => {
    test('should store FCM token successfully', async () => {
      const mockUser = {
        id: 1,
        fcmRegistrationToken: null,
        save: jest.fn(),
      };

      User.findByPk.mockResolvedValue(mockUser);

      await userService.storeRegistrationToken(1, 'fcm-token-123');

      expect(mockUser.fcmRegistrationToken).toBe('fcm-token-123');
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should throw error for non-existent user', async () => {
      User.findByPk.mockResolvedValue(null);

      await expect(userService.storeRegistrationToken(999, 'fcm-token-123')).rejects.toThrow('Tài khoản không tồn tại');
    });
  });
});
