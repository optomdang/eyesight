/**
 * Patient Service Unit Tests
 * Tests for patient CRUD operations and treatment management
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
  User: {},
  Patient: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    isDuplicateCode: jest.fn(),
  },
  Doctor: {},
  Clinic: {},
}));

jest.mock('../../../src/utils/treatmentUtils', () => ({
  buildInTreatmentWhereClause: jest.fn(() => ({ treatmentStatus: 'active' })),
  buildCompletedWhereClause: jest.fn(() => ({ treatmentStatus: 'completed' })),
  buildNotStartedWhereClause: jest.fn(() => ({ treatmentStatus: 'not_started' })),
  buildEverTreatedWhereClause: jest.fn(() => ({ treatmentStatus: ['active', 'paused', 'completed'] })),
  isInTreatmentWindow: jest.fn(),
  // Real-ish compute so activate/resume/extend tests get a correct status.
  computeTreatmentStatus: jest.fn(({ paused, activeFrom, activeTo }, now = new Date()) => {
    if (paused) return 'paused';
    if (activeFrom && now < new Date(activeFrom)) return 'not_started';
    if (activeTo && now > new Date(activeTo)) return 'completed';
    return 'active';
  }),
}));

jest.mock('../../../src/utils/sessionProvisionUtils', () => ({
  provisionAllSessionsForPatient: jest.fn(),
}));

jest.mock('../../../src/utils/query', () => ({
  ATTRS: {
    USER_LIST: ['id', 'name', 'email'],
    USER_PROFILE: ['id', 'name', 'email', 'phoneNumber'],
    USER_BASIC: ['id', 'name'],
    CLINIC_BASIC: ['id', 'name'],
    CLINIC_LIST: ['id', 'name', 'code'],
    DOCTOR_BASIC: ['id', 'name'],
    DOCTOR_LIST: ['id', 'name', 'code'],
  },
  sanitizePagination: jest.fn((limit, page) => ({
    limit: limit || 10,
    page: page || 1,
    offset: ((page || 1) - 1) * (limit || 10),
  })),
  buildSortBy: jest.fn(() => [['createdAt', 'DESC']]),
  buildPagination: jest.fn((count, limit, page) => ({
    count,
    limit,
    page,
    totalPages: Math.ceil(count / limit),
  })),
  FILTERS: {
    multiTenant: jest.fn((centerId) => ({ centerId })),
    textSearch: jest.fn((field, value) => ({ [field]: value })),
    textSearchUnaccent: jest.fn((field, value) => ({ [field]: value })),
    jsonb: jest.fn(() => ({})),
  },
  monitor: {
    measure: jest.fn((name, fn) => fn()),
  },
}));

const { Patient } = require('../../../src/models');
const { isInTreatmentWindow } = require('../../../src/utils/treatmentUtils');
const { provisionAllSessionsForPatient } = require('../../../src/utils/sessionProvisionUtils');
const patientService = require('../../../src/services/clinic/patient.service');

describe('Patient Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPatient', () => {
    const mockPatientData = {
      code: 'P001',
      name: 'Test Patient',
      centerId: 1,
      updatedBy: 1,
      examResults: {
        far: {
          initialResult: {
            leftEye: '20/40',
            rightEye: '20/40',
            bothEye: '20/40',
          },
        },
      },
    };

    test('should create patient successfully', async () => {
      Patient.isDuplicateCode.mockResolvedValue(false);
      Patient.create.mockResolvedValue({ id: 1, ...mockPatientData });

      const result = await patientService.createPatient(mockPatientData);

      expect(Patient.isDuplicateCode).toHaveBeenCalledWith('P001', 1);
      expect(Patient.create).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    test('should throw error if patient code already exists', async () => {
      Patient.isDuplicateCode.mockResolvedValue(true);

      await expect(patientService.createPatient(mockPatientData)).rejects.toThrow('Mã bệnh nhân đã tồn tại');
      expect(Patient.create).not.toHaveBeenCalled();
    });

    test('should auto-copy initialResult to currentResult', async () => {
      Patient.isDuplicateCode.mockResolvedValue(false);
      Patient.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));

      await patientService.createPatient(mockPatientData);

      const createCall = Patient.create.mock.calls[0][0];
      expect(createCall.examResults.far.currentResult).toEqual(mockPatientData.examResults.far.initialResult);
    });

    test('should set createdBy from updatedBy', async () => {
      Patient.isDuplicateCode.mockResolvedValue(false);
      Patient.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));

      await patientService.createPatient(mockPatientData);

      const createCall = Patient.create.mock.calls[0][0];
      expect(createCall.createdBy).toBe(mockPatientData.updatedBy);
    });

    test('should work with transaction', async () => {
      const mockTransaction = { id: 'transaction' };
      Patient.isDuplicateCode.mockResolvedValue(false);
      Patient.create.mockResolvedValue({ id: 1, ...mockPatientData });

      await patientService.createPatient(mockPatientData, mockTransaction);

      expect(Patient.create).toHaveBeenCalledWith(expect.any(Object), { transaction: mockTransaction });
    });
  });

  describe('getPatientById', () => {
    test('should return patient with relations', async () => {
      const mockPatient = {
        id: 1,
        code: 'P001',
        name: 'Test Patient',
        user: { id: 1, name: 'User' },
        clinic: { id: 1, name: 'Clinic' },
        doctor: { id: 1, name: 'Doctor' },
      };

      Patient.findByPk.mockResolvedValue(mockPatient);

      const result = await patientService.getPatientById(1);

      expect(Patient.findByPk).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          include: expect.any(Array),
        })
      );
      expect(result).toEqual(mockPatient);
    });

    test('should return null for non-existent patient', async () => {
      Patient.findByPk.mockResolvedValue(null);

      const result = await patientService.getPatientById(999);

      expect(result).toBeNull();
    });
  });

  describe('getPatientByCode', () => {
    test('should return patient by code', async () => {
      const mockPatient = { id: 1, code: 'P001' };
      Patient.findOne.mockResolvedValue(mockPatient);

      const result = await patientService.getPatientByCode('P001');

      expect(Patient.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: 'P001', deleted: false },
        })
      );
      expect(result).toEqual(mockPatient);
    });
  });

  describe('updatePatientById', () => {
    const mockExistingPatient = {
      id: 1,
      code: 'P001',
      centerId: 1,
      activeFrom: null,
      activeTo: null,
      treatmentStatus: false,
      save: jest.fn(),
      get: jest.fn(() => ({ id: 1, code: 'P001' })),
    };

    test('should update patient successfully', async () => {
      Patient.findByPk.mockResolvedValue(mockExistingPatient);
      Patient.isDuplicateCode.mockResolvedValue(false);
      isInTreatmentWindow.mockReturnValue(false);

      const updateData = { name: 'Updated Name' };

      const result = await patientService.updatePatientById(1, updateData);

      expect(mockExistingPatient.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should throw error for non-existent patient', async () => {
      Patient.findByPk.mockResolvedValue(null);

      await expect(patientService.updatePatientById(999, { name: 'Test' })).rejects.toThrow('Bệnh nhân không tồn tại');
    });

    test('should throw error if new code already exists', async () => {
      Patient.findByPk.mockResolvedValue(mockExistingPatient);
      Patient.isDuplicateCode.mockResolvedValue(true);

      await expect(patientService.updatePatientById(1, { code: 'DUPLICATE' })).rejects.toThrow('Mã bệnh nhân đã tồn tại');
    });

    test('should provision sessions when patient becomes active', async () => {
      const inactivePatient = {
        ...mockExistingPatient,
        treatmentStatus: false,
        activeFrom: null,
      };

      Patient.findByPk.mockResolvedValue(inactivePatient);
      Patient.isDuplicateCode.mockResolvedValue(false);

      // First call: patient is inactive
      isInTreatmentWindow.mockReturnValueOnce(false);
      // Second call: patient becomes active
      isInTreatmentWindow.mockReturnValueOnce(true);

      await patientService.updatePatientById(1, {
        activeFrom: new Date(),
        activeTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        treatmentStatus: true,
      });

      // Wait for setImmediate
      await new Promise((resolve) => setImmediate(resolve));

      expect(provisionAllSessionsForPatient).toHaveBeenCalledWith(1);
    });
  });

  describe('deletePatientById', () => {
    test('should soft delete patient', async () => {
      const mockPatient = {
        id: 1,
        update: jest.fn(),
      };

      Patient.findByPk.mockResolvedValue(mockPatient);

      await patientService.deletePatientById(1);

      expect(mockPatient.update).toHaveBeenCalledWith({
        deleted: true,
        deletedAt: expect.any(Date),
      });
    });

    test('should throw error for non-existent patient', async () => {
      Patient.findByPk.mockResolvedValue(null);

      await expect(patientService.deletePatientById(999)).rejects.toThrow('Bệnh nhân không tồn tại');
    });
  });

  describe('queryPatients', () => {
    test('should return paginated patients', async () => {
      const mockPatients = [
        { id: 1, code: 'P001', get: jest.fn(() => ({ id: 1, code: 'P001' })) },
        { id: 2, code: 'P002', get: jest.fn(() => ({ id: 2, code: 'P002' })) },
      ];

      Patient.findAndCountAll.mockResolvedValue({
        rows: mockPatients,
        count: 2,
      });

      const result = await patientService.queryPatients({ centerId: 1 }, { page: 1, limit: 10 });

      expect(result.rows).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.page).toBe(1);
    });

    test('should filter by status active', async () => {
      Patient.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      await patientService.queryPatients({ centerId: 1, status: 'active' }, {});

      expect(Patient.findAndCountAll).toHaveBeenCalled();
    });

    test('should filter by severityLevel', async () => {
      Patient.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      await patientService.queryPatients({ centerId: 1, severityLevel: 'moderate' }, {});

      expect(Patient.findAndCountAll).toHaveBeenCalled();
    });

    test('should filter effectiveness=has_improvement using JSONB literal', async () => {
      Patient.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await patientService.queryPatients({ centerId: 1, effectiveness: 'has_improvement' }, {});

      const callArgs = Patient.findAndCountAll.mock.calls[0][0];
      const andClauses = callArgs.where[require('sequelize').Op.and] || [];
      expect(andClauses.some((c) => c.val && c.val.includes('currentResult'))).toBe(true);
      expect(andClauses.some((c) => c.val && c.val.includes('NOT'))).toBe(false);
    });

    test('should filter effectiveness=no_improvement using NOT JSONB literal', async () => {
      Patient.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await patientService.queryPatients({ centerId: 1, effectiveness: 'no_improvement' }, {});

      const callArgs = Patient.findAndCountAll.mock.calls[0][0];
      const andClauses = callArgs.where[require('sequelize').Op.and] || [];
      expect(andClauses.some((c) => c.val && c.val.includes('NOT'))).toBe(true);
    });

    test('should filter inactiveDays=0-7 using date arithmetic literal', async () => {
      Patient.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await patientService.queryPatients({ centerId: 1, inactiveDays: '0-7' }, {});

      const callArgs = Patient.findAndCountAll.mock.calls[0][0];
      const andClauses = callArgs.where[require('sequelize').Op.and] || [];
      expect(andClauses.some((c) => c.val && c.val.includes('BETWEEN 0 AND 7'))).toBe(true);
    });

    test('should filter inactiveDays=90+ using > 90 literal', async () => {
      Patient.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await patientService.queryPatients({ centerId: 1, inactiveDays: '90+' }, {});

      const callArgs = Patient.findAndCountAll.mock.calls[0][0];
      const andClauses = callArgs.where[require('sequelize').Op.and] || [];
      expect(andClauses.some((c) => c.val && c.val.includes('> 90'))).toBe(true);
    });

    test('should NOT pass effectiveness or inactiveDays as DB columns', async () => {
      Patient.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await patientService.queryPatients({ centerId: 1, effectiveness: 'no_improvement', inactiveDays: '7-30' }, {});

      const callArgs = Patient.findAndCountAll.mock.calls[0][0];
      expect(callArgs.where.effectiveness).toBeUndefined();
      expect(callArgs.where.inactiveDays).toBeUndefined();
    });
  });

  describe('Treatment Status Management', () => {
    const mockPatient = {
      id: 1,
      centerId: 1,
      treatmentStatus: true,
      activeFrom: new Date('2026-01-01T00:00:00.000Z'),
      activeTo: new Date('2026-01-31T00:00:00.000Z'),
      update: jest.fn(),
      save: jest.fn(),
      get: jest.fn(() => ({ treatmentStatus: true, doctorId: null })),
    };

    beforeEach(() => {
      Patient.findByPk.mockResolvedValue(mockPatient);
      isInTreatmentWindow.mockReturnValue(true);
    });

    describe('activatePatient', () => {
      test('should activate patient with dates', async () => {
        const activeFrom = new Date();
        const activeTo = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await patientService.activatePatient(1, activeFrom, activeTo, 1);

        expect(mockPatient.save).toHaveBeenCalled();
        expect(mockPatient.treatmentStatus).toBe('active'); // computed: activeFrom≤now≤activeTo
        expect(mockPatient.activeFrom).toBe(activeFrom);
        expect(mockPatient.activeTo).toBe(activeTo);
        expect(mockPatient.updatedBy).toBe(1);
      });

      test('should throw error for non-existent patient', async () => {
        Patient.findByPk.mockResolvedValue(null);

        await expect(patientService.activatePatient(999, new Date(), new Date(), 1)).rejects.toThrow(
          'Bệnh nhân không tồn tại'
        );
      });
    });

    describe('pausePatientTreatment', () => {
      test('should pause patient treatment', async () => {
        await patientService.pausePatientTreatment(1, 1);

        expect(mockPatient.save).toHaveBeenCalled();
        expect(mockPatient.treatmentStatus).toBe('paused');
        expect(mockPatient.updatedBy).toBe(1);
      });
    });

    describe('extendTreatmentPeriod', () => {
      test('should extend treatment period', async () => {
        const newActiveTo = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

        await patientService.extendTreatmentPeriod(1, newActiveTo, 1);

        expect(mockPatient.save).toHaveBeenCalled();
        expect(mockPatient.activeTo).toBe(newActiveTo);
        expect(mockPatient.updatedBy).toBe(1);
      });
    });

    describe('setPatientSeverity', () => {
      test('should set valid severity level', async () => {
        await patientService.setPatientSeverity(1, 'moderate', 'Test notes', 1);

        expect(mockPatient.update).toHaveBeenCalledWith({
          severityLevel: 'moderate',
          severityNotes: 'Test notes',
          updatedBy: 1,
        });
      });

      test('should throw error for invalid severity level', async () => {
        await expect(patientService.setPatientSeverity(1, 'invalid', 'Notes', 1)).rejects.toThrow(
          'Mức độ nghiêm trọng không hợp lệ'
        );
      });
    });
  });

  describe('updateMedicalRecord', () => {
    test('should update medical record', async () => {
      const mockPatient = {
        id: 1,
        update: jest.fn(),
      };

      Patient.findByPk.mockResolvedValue(mockPatient);

      await patientService.updateMedicalRecord(1, {
        medicalHistory: '<p>Test history</p>',
        additionalNotes: 'Test notes',
      });

      expect(mockPatient.update).toHaveBeenCalledWith({
        medicalHistory: '<p>Test history</p>',
        additionalNotes: 'Test notes',
      });
    });

    test('should throw error if image exceeds 1MB', async () => {
      const mockPatient = { id: 1 };
      Patient.findByPk.mockResolvedValue(mockPatient);

      const largeImage = { size: 2 * 1024 * 1024 }; // 2MB

      await expect(
        patientService.updateMedicalRecord(1, {
          medicalImages: [largeImage],
        })
      ).rejects.toThrow('Ảnh 1 vượt quá 1MB');
    });
  });
});
