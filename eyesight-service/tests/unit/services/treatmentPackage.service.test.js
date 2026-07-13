jest.mock('../../../src/models', () => ({
  TreatmentPackage: {},
  PatientTreatmentPackage: {
    findOne: jest.fn(),
    update: jest.fn(),
  },
  ExerciseAssignment: {},
  ExerciseConfig: {
    findByPk: jest.fn(),
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
