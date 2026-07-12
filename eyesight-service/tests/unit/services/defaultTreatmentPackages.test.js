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

  test('Ultra and Ultimate include refund guarantee flag', () => {
    const { DEFAULT_TREATMENT_PACKAGES } = require('../../../src/config/defaultTreatmentPackages');
    expect(DEFAULT_TREATMENT_PACKAGES[0].includesRefundGuarantee).toBe(false);
    expect(DEFAULT_TREATMENT_PACKAGES[1].includesRefundGuarantee).toBe(false);
    expect(DEFAULT_TREATMENT_PACKAGES[2].includesRefundGuarantee).toBe(true);
    expect(DEFAULT_TREATMENT_PACKAGES[3].includesRefundGuarantee).toBe(true);
  });

  test('exports backfill helpers', () => {
    expect(typeof ensureDefaultTreatmentPackages).toBe('function');
    expect(typeof backfillDefaultTreatmentPackagesForAllCenters).toBe('function');
  });
});
