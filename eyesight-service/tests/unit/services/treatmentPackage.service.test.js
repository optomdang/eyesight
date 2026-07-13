jest.mock('../../../src/models', () => ({
  TreatmentPackage: {},
  PatientTreatmentPackage: {
    findOne: jest.fn(),
    update: jest.fn(),
  },
  ExerciseAssignment: {},
  ExerciseConfig: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock('../../../src/services/system/auditLog.service', () => ({
  logEntityAuditEvent: jest.fn(),
}));

const { Op } = require('sequelize');
const {
  isExerciseConfigAccessibleForPatient,
  isConfigAllowedByPackage,
  resolveConfigReferentChain,
  expandAllowedConfigIds,
} = require('../../../src/services/exercise/treatmentPackage.service');
const { PatientTreatmentPackage, ExerciseConfig } = require('../../../src/models');

describe('treatmentPackage.service — config referent chain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PatientTreatmentPackage.update.mockResolvedValue([0]);
  });

  describe('resolveConfigReferentChain', () => {
    test('returns single id when config has no referent', async () => {
      ExerciseConfig.findByPk.mockResolvedValue({ id: 99, configReferentId: null });

      await expect(resolveConfigReferentChain(99)).resolves.toEqual([99]);
    });

    test('walks parent referent ids', async () => {
      ExerciseConfig.findByPk
        .mockResolvedValueOnce({ id: 200, configReferentId: 100 })
        .mockResolvedValueOnce({ id: 100, configReferentId: null });

      await expect(resolveConfigReferentChain(200)).resolves.toEqual([200, 100]);
    });
  });

  describe('isConfigAllowedByPackage', () => {
    test('allows clone when parent template is in package', async () => {
      ExerciseConfig.findByPk
        .mockResolvedValueOnce({ id: 200, configReferentId: 100 })
        .mockResolvedValueOnce({ id: 100, configReferentId: null });

      await expect(isConfigAllowedByPackage(200, [100, 101])).resolves.toBe(true);
    });

    test('rejects clone when no ancestor is in package', async () => {
      ExerciseConfig.findByPk
        .mockResolvedValueOnce({ id: 200, configReferentId: 100 })
        .mockResolvedValueOnce({ id: 100, configReferentId: null });

      await expect(isConfigAllowedByPackage(200, [101, 102])).resolves.toBe(false);
    });
  });

  describe('expandAllowedConfigIds', () => {
    test('includes doctor clones that reference an allowed template', async () => {
      // Templates 100, 101 → clone 200 references 100; deeper clone 300 references 200.
      ExerciseConfig.findAll
        .mockResolvedValueOnce([{ id: 200 }]) // children of [100, 101]
        .mockResolvedValueOnce([{ id: 300 }]) // children of [200]
        .mockResolvedValueOnce([]); // children of [300]

      const result = await expandAllowedConfigIds([100, 101], { centerId: 7 });

      expect(result.sort((a, b) => a - b)).toEqual([100, 101, 200, 300]);
      expect(ExerciseConfig.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            configReferentId: { [Op.in]: [100, 101] },
            centerId: 7,
          }),
        })
      );
    });

    test('returns empty when no allowed ids', async () => {
      await expect(expandAllowedConfigIds([])).resolves.toEqual([]);
      expect(ExerciseConfig.findAll).not.toHaveBeenCalled();
    });

    test('returns only templates when there are no clones', async () => {
      ExerciseConfig.findAll.mockResolvedValueOnce([]);

      await expect(expandAllowedConfigIds([100, 101])).resolves.toEqual([100, 101]);
    });
  });

  describe('isExerciseConfigAccessibleForPatient', () => {
    test('allows patient-specific clone derived from package mode', async () => {
      const expiresAt = new Date(Date.now() + 86400000);
      PatientTreatmentPackage.findOne.mockResolvedValue({
        expiresAt,
        treatmentPackage: { exerciseConfigIds: [100, 101] },
      });
      ExerciseConfig.findByPk
        .mockResolvedValueOnce({ id: 200, configReferentId: 100 })
        .mockResolvedValueOnce({ id: 100, configReferentId: null });

      await expect(isExerciseConfigAccessibleForPatient(3, 200)).resolves.toBe(true);
      expect(PatientTreatmentPackage.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId: 3,
            status: 'active',
            expiresAt: { [Op.gt]: expect.any(Date) },
          }),
        })
      );
    });

    test('returns true when patient has no active package', async () => {
      PatientTreatmentPackage.findOne.mockResolvedValue(null);

      await expect(isExerciseConfigAccessibleForPatient(3, 999)).resolves.toBe(true);
      expect(ExerciseConfig.findByPk).not.toHaveBeenCalled();
    });
  });
});
