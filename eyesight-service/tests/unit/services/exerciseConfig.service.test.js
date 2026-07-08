/**
 * ExerciseConfig Service Unit Tests
 * Tests for exercise configuration CRUD and assignment operations
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
  ExerciseConfig: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
  Exercise: {},
  ExerciseAssignment: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
  },
}));

const { ExerciseConfig, ExerciseAssignment } = require('../../../src/models');
const exerciseConfigService = require('../../../src/services/exercise/exerciseConfig.service');

describe('ExerciseConfig Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExerciseConfig', () => {
    const mockConfigData = {
      exerciseId: 1,
      centerId: 1,
      name: 'Test Config',
      visionType: 'far',
      visionLevel: 10,
      duration: 30,
      frequency: 'daily',
      sessionsCount: 5,
      updatedBy: 1,
    };

    test('should create exercise config successfully', async () => {
      ExerciseConfig.create.mockResolvedValue({ id: 1, ...mockConfigData });

      const result = await exerciseConfigService.createExerciseConfig(mockConfigData);

      expect(ExerciseConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockConfigData,
          createdBy: mockConfigData.updatedBy,
        }),
        { transaction: null }
      );
      expect(result.id).toBe(1);
    });

    test('should throw error if exerciseId is missing', async () => {
      const invalidData = { ...mockConfigData, exerciseId: undefined };

      await expect(exerciseConfigService.createExerciseConfig(invalidData)).rejects.toThrow('ID bài tập là bắt buộc');
    });

    test('should throw error if centerId is missing', async () => {
      const invalidData = { ...mockConfigData, centerId: undefined };

      await expect(exerciseConfigService.createExerciseConfig(invalidData)).rejects.toThrow('ID trung tâm là bắt buộc');
    });

    test('should throw error for invalid visionType', async () => {
      const invalidData = { ...mockConfigData, visionType: 'invalid' };

      await expect(exerciseConfigService.createExerciseConfig(invalidData)).rejects.toThrow('Invalid visionType: invalid');
    });

    test('should accept valid visionTypes', async () => {
      const validTypes = ['far', 'near', 'contrast'];
      ExerciseConfig.create.mockResolvedValue({ id: 1, ...mockConfigData });

      const results = await Promise.all(
        validTypes.map((visionType) => exerciseConfigService.createExerciseConfig({ ...mockConfigData, visionType }))
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => expect(result).toBeDefined());
    });

    test('should work with transaction', async () => {
      const mockTransaction = { id: 'transaction' };
      ExerciseConfig.create.mockResolvedValue({ id: 1, ...mockConfigData });

      await exerciseConfigService.createExerciseConfig(mockConfigData, mockTransaction);

      expect(ExerciseConfig.create).toHaveBeenCalledWith(expect.any(Object), { transaction: mockTransaction });
    });

    test('persists inactivityThreshold through create', async () => {
      ExerciseConfig.create.mockResolvedValue({ id: 1 });

      await exerciseConfigService.createExerciseConfig({ ...mockConfigData, inactivityThreshold: 45 });

      expect(ExerciseConfig.create).toHaveBeenCalledWith(expect.objectContaining({ inactivityThreshold: 45 }), {
        transaction: null,
      });
    });
  });

  describe('getExerciseConfigById', () => {
    test('should return config with exercise relation', async () => {
      const mockConfig = {
        id: 1,
        name: 'Test Config',
        exercise: { id: 1, name: 'Exercise 1' },
      };

      ExerciseConfig.findByPk.mockResolvedValue(mockConfig);

      const result = await exerciseConfigService.getExerciseConfigById(1);

      expect(ExerciseConfig.findByPk).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          include: expect.any(Array),
        })
      );
      expect(result).toEqual(mockConfig);
    });

    test('should return null for non-existent config', async () => {
      ExerciseConfig.findByPk.mockResolvedValue(null);

      const result = await exerciseConfigService.getExerciseConfigById(999);

      expect(result).toBeNull();
    });
  });

  describe('queryExerciseConfigs', () => {
    test('should return paginated configs', async () => {
      const mockConfigs = [
        { id: 1, name: 'Config 1' },
        { id: 2, name: 'Config 2' },
      ];

      ExerciseConfig.findAndCountAll.mockResolvedValue({
        rows: mockConfigs,
        count: 2,
      });

      const result = await exerciseConfigService.queryExerciseConfigs({ centerId: 1 }, { page: 1, limit: 10 });

      expect(result.rows).toEqual(mockConfigs);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    test('should filter by role for admin', async () => {
      ExerciseConfig.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      const adminUser = { id: 1, userType: 'admin' };

      await exerciseConfigService.queryExerciseConfigs({ centerId: 1 }, {}, adminUser);

      expect(ExerciseConfig.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            centerId: 1,
            configType: { [require('sequelize').Op.in]: ['admin', 'system'] },
          }),
        })
      );
    });

    test('should filter by role for doctor', async () => {
      ExerciseConfig.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      const doctorUser = { id: 2, userType: 'doctor' };

      await exerciseConfigService.queryExerciseConfigs({ centerId: 1 }, {}, doctorUser);

      expect(ExerciseConfig.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            centerId: 1,
            [require('sequelize').Op.or]: [
              { configType: 'admin' },
              { configType: 'doctor', createdBy: 2 },
            ],
          }),
        })
      );
    });

    test('should handle sorting with direction in sortBy', async () => {
      ExerciseConfig.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      await exerciseConfigService.queryExerciseConfigs({}, { sortBy: 'name:DESC' });

      expect(ExerciseConfig.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['createdAt', 'DESC']],
        })
      );
    });

    test('should handle relation field sorting', async () => {
      ExerciseConfig.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      await exerciseConfigService.queryExerciseConfigs({}, { sortBy: 'exercise.name:ASC' });

      expect(ExerciseConfig.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['exercise', 'name'], 'ASC'],
        })
      );
    });
  });

  describe('canUserAccessExerciseConfig', () => {
    const centerId = 1;

    test('admin can access any config in same center (incl. legacy system + doctor)', () => {
      const admin = { id: 1, userType: 'admin', centerId };
      expect(
        exerciseConfigService.canUserAccessExerciseConfig(
          { centerId, configType: 'admin' },
          admin
        )
      ).toBe(true);
      expect(
        exerciseConfigService.canUserAccessExerciseConfig(
          { centerId, configType: 'system' },
          admin
        )
      ).toBe(true);
      expect(
        exerciseConfigService.canUserAccessExerciseConfig(
          { centerId, configType: 'doctor', createdBy: 2 },
          admin
        )
      ).toBe(true);
      expect(
        exerciseConfigService.canUserAccessExerciseConfig(
          { centerId: 99, configType: 'admin' },
          admin
        )
      ).toBe(false);
    });

    test('doctor can access system configs and own doctor configs', () => {
      const doctor = { id: 2, userType: 'doctor', centerId };
      expect(
        exerciseConfigService.canUserAccessExerciseConfig(
          { centerId, configType: 'admin' },
          doctor
        )
      ).toBe(true);
      expect(
        exerciseConfigService.canUserAccessExerciseConfig(
          { centerId, configType: 'doctor', createdBy: 2 },
          doctor
        )
      ).toBe(true);
      expect(
        exerciseConfigService.canUserAccessExerciseConfig(
          { centerId, configType: 'doctor', createdBy: 99 },
          doctor
        )
      ).toBe(false);
    });
  });

  describe('updateExerciseConfigById', () => {
    const mockExistingConfig = {
      id: 1,
      name: 'Old Name',
      visionType: 'far',
      save: jest.fn(),
    };

    test('should update config successfully', async () => {
      ExerciseConfig.findByPk.mockResolvedValue(mockExistingConfig);

      const updateData = { name: 'New Name' };

      const result = await exerciseConfigService.updateExerciseConfigById(1, updateData);

      expect(mockExistingConfig.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    test('should throw error for non-existent config', async () => {
      ExerciseConfig.findByPk.mockResolvedValue(null);

      await expect(exerciseConfigService.updateExerciseConfigById(999, { name: 'Test' })).rejects.toThrow(
        'Cấu hình bài tập không tồn tại'
      );
    });

    test('should validate visionType on update', async () => {
      ExerciseConfig.findByPk.mockResolvedValue(mockExistingConfig);

      await expect(exerciseConfigService.updateExerciseConfigById(1, { visionType: 'invalid' })).rejects.toThrow(
        'Invalid visionType: invalid'
      );
    });

    test('persists inactivityThreshold through update', async () => {
      const cfg = { id: 1, name: 'X', visionType: 'far', save: jest.fn() };
      ExerciseConfig.findByPk.mockResolvedValue(cfg);

      const result = await exerciseConfigService.updateExerciseConfigById(1, { inactivityThreshold: 45 });

      expect(cfg.save).toHaveBeenCalled();
      expect(result.inactivityThreshold).toBe(45);
    });
  });

  describe('deleteExerciseConfigById', () => {
    test('should delete config successfully', async () => {
      const mockConfig = {
        id: 1,
        destroy: jest.fn(),
      };

      ExerciseConfig.findByPk.mockResolvedValue(mockConfig);

      await exerciseConfigService.deleteExerciseConfigById(1);

      expect(mockConfig.destroy).toHaveBeenCalled();
    });

    test('should throw error for non-existent config', async () => {
      ExerciseConfig.findByPk.mockResolvedValue(null);

      await expect(exerciseConfigService.deleteExerciseConfigById(999)).rejects.toThrow('Cấu hình bài tập không tồn tại');
    });
  });

  describe('Patient Exercise Config (Assignment) Operations', () => {
    describe('createPatientExerciseConfig', () => {
      const mockAssignmentData = {
        patientId: 1,
        exerciseConfigId: 1,
        centerId: 1,
        updatedBy: 1,
      };

      test('should create assignment successfully', async () => {
        ExerciseAssignment.create.mockResolvedValue({ id: 1, ...mockAssignmentData });

        const result = await exerciseConfigService.createPatientExerciseConfig(mockAssignmentData);

        expect(ExerciseAssignment.create).toHaveBeenCalled();
        expect(result.id).toBe(1);
      });

      test('should throw error if patientId is missing', async () => {
        const invalidData = { ...mockAssignmentData, patientId: undefined };

        await expect(exerciseConfigService.createPatientExerciseConfig(invalidData)).rejects.toThrow(
          'ID bệnh nhân là bắt buộc'
        );
      });

      test('should throw error if exerciseConfigId is missing', async () => {
        const invalidData = { ...mockAssignmentData, exerciseConfigId: undefined };

        await expect(exerciseConfigService.createPatientExerciseConfig(invalidData)).rejects.toThrow(
          'ID cấu hình bài tập là bắt buộc'
        );
      });

      test('should throw error if centerId is missing', async () => {
        const invalidData = { ...mockAssignmentData, centerId: undefined };

        await expect(exerciseConfigService.createPatientExerciseConfig(invalidData)).rejects.toThrow(
          'ID trung tâm là bắt buộc'
        );
      });

      test('should set assignedBy from updatedBy', async () => {
        ExerciseAssignment.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));

        await exerciseConfigService.createPatientExerciseConfig(mockAssignmentData);

        const createCall = ExerciseAssignment.create.mock.calls[0][0];
        expect(createCall.assignedBy).toBe(mockAssignmentData.updatedBy);
      });
    });

    describe('getPatientExerciseConfigs', () => {
      test('should return paginated assignments for patient', async () => {
        const mockAssignments = [
          { id: 1, patientId: 1, exerciseConfig: { id: 1 } },
          { id: 2, patientId: 1, exerciseConfig: { id: 2 } },
        ];

        ExerciseAssignment.findAndCountAll.mockResolvedValue({
          rows: mockAssignments,
          count: 2,
        });

        const result = await exerciseConfigService.getPatientExerciseConfigs(1, {
          page: 1,
          limit: 10,
        });

        expect(ExerciseAssignment.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { patientId: 1 },
          })
        );
        expect(result.rows).toEqual(mockAssignments);
        expect(result.total).toBe(2);
      });
    });

    describe('updatePatientExerciseConfig', () => {
      test('should update assignment successfully', async () => {
        const mockAssignment = {
          id: 1,
          patientId: 1,
          save: jest.fn(),
        };

        ExerciseAssignment.findByPk.mockResolvedValue(mockAssignment);

        const updateData = { visionLevel: 5 };

        const result = await exerciseConfigService.updatePatientExerciseConfig(1, updateData);

        expect(mockAssignment.save).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      test('should throw error for non-existent assignment', async () => {
        ExerciseAssignment.findByPk.mockResolvedValue(null);

        await expect(exerciseConfigService.updatePatientExerciseConfig(999, { visionLevel: 5 })).rejects.toThrow(
          'Bài tập được giao không tồn tại'
        );
      });
    });

    describe('deletePatientExerciseConfig', () => {
      test('should delete assignment successfully', async () => {
        const mockAssignment = {
          id: 1,
          destroy: jest.fn(),
        };

        ExerciseAssignment.findByPk.mockResolvedValue(mockAssignment);

        await exerciseConfigService.deletePatientExerciseConfig(1);

        expect(mockAssignment.destroy).toHaveBeenCalled();
      });

      test('should throw error for non-existent assignment', async () => {
        ExerciseAssignment.findByPk.mockResolvedValue(null);

        await expect(exerciseConfigService.deletePatientExerciseConfig(999)).rejects.toThrow(
          'Bài tập được giao không tồn tại'
        );
      });
    });
  });

  describe('assignTemplateToPatient', () => {
    const mockTemplateData = {
      exerciseId: 1,
      patientId: 1,
      centerId: 1,
      name: 'Patient Config',
      visionLevel: 10,
    };

    test('should create patient config from template', async () => {
      ExerciseConfig.findOne.mockResolvedValue(null); // No existing config
      ExerciseConfig.create.mockResolvedValue({ id: 1, ...mockTemplateData, configType: 'patient' });

      const result = await exerciseConfigService.assignTemplateToPatient(mockTemplateData);

      expect(ExerciseConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          configType: 'patient',
          patientId: 1,
        })
      );
      expect(result.configType).toBe('patient');
    });

    test('should throw error if patient already has config for exercise', async () => {
      ExerciseConfig.findOne.mockResolvedValue({ id: 1 }); // Existing config

      await expect(exerciseConfigService.assignTemplateToPatient(mockTemplateData)).rejects.toThrow(
        'Bệnh nhân đã có cấu hình cho bài tập này'
      );
    });

    test('should throw error if exerciseId is missing', async () => {
      const invalidData = { ...mockTemplateData, exerciseId: undefined };

      await expect(exerciseConfigService.assignTemplateToPatient(invalidData)).rejects.toThrow('ID bài tập là bắt buộc');
    });

    test('should throw error if patientId is missing', async () => {
      const invalidData = { ...mockTemplateData, patientId: undefined };

      await expect(exerciseConfigService.assignTemplateToPatient(invalidData)).rejects.toThrow('ID bệnh nhân là bắt buộc');
    });
  });

  describe('getColorSchemePresets', () => {
    test('should return default presets when no centerId', async () => {
      const presets = await exerciseConfigService.getColorSchemePresets();

      expect(presets).toHaveProperty('whiteBlack');
      expect(presets).toHaveProperty('redBlue');
      expect(presets.whiteBlack).toEqual({
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
      });
    });
  });
});
