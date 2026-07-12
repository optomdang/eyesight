const {
  isReexamWithinSixMonths,
  computeDocumentHash,
  deriveAgreementStatus,
  PHASE_STATUSES,
} = require('../../../src/services/clinic/warrantyAgreement.helpers');

describe('warrantyAgreement helpers', () => {
  test('isReexamWithinSixMonths when last completed within 6 months', () => {
    const recent = new Date();
    recent.setMonth(recent.getMonth() - 2);
    const phases = [{ status: PHASE_STATUSES.COMPLETED, completedAt: recent.toISOString() }];
    expect(isReexamWithinSixMonths(phases)).toBe(true);
  });

  test('isReexamWithinSixMonths false when last completed over 6 months ago', () => {
    const old = new Date();
    old.setMonth(old.getMonth() - 8);
    const phases = [{ status: PHASE_STATUSES.COMPLETED, completedAt: old.toISOString() }];
    expect(isReexamWithinSixMonths(phases)).toBe(false);
  });

  test('computeDocumentHash is stable', () => {
    const snapshot = { a: 1, b: 'test' };
    expect(computeDocumentHash(snapshot)).toHaveLength(64);
    expect(computeDocumentHash(snapshot)).toBe(computeDocumentHash(snapshot));
  });

  test('deriveAgreementStatus reflects phase states', () => {
    expect(deriveAgreementStatus([])).toBe(PHASE_STATUSES.DRAFT);
    expect(
      deriveAgreementStatus([{ status: PHASE_STATUSES.AWAITING_GUARDIAN }])
    ).toBe(PHASE_STATUSES.AWAITING_GUARDIAN);
    expect(
      deriveAgreementStatus([
        { status: PHASE_STATUSES.COMPLETED },
        { status: PHASE_STATUSES.AWAITING_DOCTOR },
      ])
    ).toBe(PHASE_STATUSES.AWAITING_DOCTOR);
    expect(
      deriveAgreementStatus([
        { status: PHASE_STATUSES.COMPLETED },
        { status: PHASE_STATUSES.COMPLETED },
      ])
    ).toBe(PHASE_STATUSES.COMPLETED);
  });
});
