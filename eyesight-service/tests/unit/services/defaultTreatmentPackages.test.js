const {
  ensureDefaultTreatmentPackages,
  backfillDefaultTreatmentPackagesForAllCenters,
} = require('../../../src/services/system/defaultTreatmentPackages.service');

describe('defaultTreatmentPackages', () => {
  test('catalog defines four Amblyopia tiers with expected sizes', () => {
    const { DEFAULT_TREATMENT_PACKAGES } = require('../../../src/config/defaultTreatmentPackages');
    expect(DEFAULT_TREATMENT_PACKAGES).toHaveLength(4);
    expect(DEFAULT_TREATMENT_PACKAGES[0].exerciseModeNames).toHaveLength(5);
    expect(DEFAULT_TREATMENT_PACKAGES[1].exerciseModeNames).toHaveLength(8);
    expect(DEFAULT_TREATMENT_PACKAGES[2].exerciseModeNames).toHaveLength(11);
    expect(DEFAULT_TREATMENT_PACKAGES[3].exerciseModeNames).toHaveLength(15);
  });

  test('exports backfill helpers', () => {
    expect(typeof ensureDefaultTreatmentPackages).toBe('function');
    expect(typeof backfillDefaultTreatmentPackagesForAllCenters).toBe('function');
  });
});
