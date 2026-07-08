/**
 * Unit tests for the REAL calculateCorrelation (Pearson) from dashboardPatient.service.
 *
 * (Replaces the deleted dashboard-statistics.integration.test.js, which re-defined a LOCAL
 * copy of this function and asserted .toContain() on self-written SQL — it verified nothing
 * about the actual code. These tests import and exercise the real implementation.)
 */

const { calculateCorrelation } = require('../../../src/services/dashboard/dashboardPatient.service');

describe('calculateCorrelation (real Pearson implementation)', () => {
  it('returns ~+1 for a perfectly increasing linear relationship', () => {
    expect(calculateCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBeCloseTo(1, 5);
  });

  it('returns ~-1 for a perfectly decreasing linear relationship', () => {
    expect(calculateCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])).toBeCloseTo(-1, 5);
  });

  it('is near 0 for an uncorrelated pattern', () => {
    expect(Math.abs(calculateCorrelation([1, 2, 3, 4, 5], [10, 14, 11, 13, 12]))).toBeLessThan(0.5);
  });

  it('ignores null/undefined pairs and uses only complete pairs', () => {
    // Only (1,10),(2,11),(5,14) are complete → still a strong positive correlation.
    const r = calculateCorrelation([1, 2, null, 4, 5], [10, 11, 12, null, 14]);
    expect(Number.isNaN(r)).toBe(false);
    expect(r).toBeGreaterThan(0.9);
  });

  it('returns 0 when fewer than 2 valid pairs exist (cannot correlate)', () => {
    expect(calculateCorrelation([1], [10])).toBe(0);
    expect(calculateCorrelation([], [])).toBe(0);
  });

  it('returns 0 when one variable has zero variance (flat series → undefined slope)', () => {
    expect(calculateCorrelation([1, 2, 3], [5, 5, 5])).toBe(0);
  });
});
