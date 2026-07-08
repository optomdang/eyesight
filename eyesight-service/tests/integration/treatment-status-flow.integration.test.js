/**
 * Treatment Status Flow Tests (pure logic, no DB).
 *
 * Post-refactor (P4): `Patient.treatmentStatus` is a STRING enum
 *   not_started | active | paused | completed — AUTHORITATIVE & stored.
 *
 * - getTreatmentPhase(patient)   → returns the stored status verbatim (or 'unknown')
 * - isInTreatmentWindow(patient) → true iff status === 'active'
 * - computeTreatmentStatus({paused, activeFrom, activeTo}, now) → derives the status
 *     from the pause intent + dates (used by patient create/activate + the sync job).
 */

const {
  getTreatmentPhase,
  isInTreatmentWindow,
  computeTreatmentStatus,
  TREATMENT_STATUS,
} = require('../../src/utils/treatmentUtils');

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

describe('Treatment Status — stored enum is authoritative', () => {
  describe('getTreatmentPhase returns the stored status', () => {
    it.each([
      ['active', TREATMENT_STATUS.ACTIVE],
      ['paused', TREATMENT_STATUS.PAUSED],
      ['not_started', TREATMENT_STATUS.NOT_STARTED],
      ['completed', TREATMENT_STATUS.COMPLETED],
    ])('returns "%s" verbatim', (status) => {
      expect(getTreatmentPhase({ treatmentStatus: status })).toBe(status);
    });

    it('returns "unknown" for null/undefined patient or missing status', () => {
      expect(getTreatmentPhase(null)).toBe('unknown');
      expect(getTreatmentPhase(undefined)).toBe('unknown');
      expect(getTreatmentPhase({})).toBe('unknown');
    });
  });

  describe('isInTreatmentWindow is true only for "active"', () => {
    it('is true for active', () => {
      expect(isInTreatmentWindow({ treatmentStatus: TREATMENT_STATUS.ACTIVE })).toBe(true);
    });

    it.each([TREATMENT_STATUS.PAUSED, TREATMENT_STATUS.NOT_STARTED, TREATMENT_STATUS.COMPLETED])(
      'is false for %s',
      (status) => {
        expect(isInTreatmentWindow({ treatmentStatus: status })).toBe(false);
      }
    );

    it('is false for null/undefined', () => {
      expect(isInTreatmentWindow(null)).toBe(false);
      expect(isInTreatmentWindow(undefined)).toBe(false);
    });
  });
});

describe('computeTreatmentStatus — derive status from pause + dates', () => {
  it('paused intent always wins → "paused"', () => {
    expect(computeTreatmentStatus({ paused: true, activeFrom: daysFromNow(-30), activeTo: daysFromNow(30) })).toBe(
      TREATMENT_STATUS.PAUSED
    );
  });

  it('future activeFrom → "not_started"', () => {
    expect(computeTreatmentStatus({ paused: false, activeFrom: daysFromNow(7), activeTo: daysFromNow(37) })).toBe(
      TREATMENT_STATUS.NOT_STARTED
    );
  });

  it('past activeTo → "completed"', () => {
    expect(computeTreatmentStatus({ paused: false, activeFrom: daysFromNow(-60), activeTo: daysFromNow(-30) })).toBe(
      TREATMENT_STATUS.COMPLETED
    );
  });

  it('inside the window, not paused → "active"', () => {
    expect(computeTreatmentStatus({ paused: false, activeFrom: daysFromNow(-30), activeTo: daysFromNow(30) })).toBe(
      TREATMENT_STATUS.ACTIVE
    );
  });

  it('null dates, not paused → "active"', () => {
    expect(computeTreatmentStatus({ paused: false, activeFrom: null, activeTo: null })).toBe(TREATMENT_STATUS.ACTIVE);
  });

  describe('transitions', () => {
    it('resume: paused → active when un-paused inside window', () => {
      const dates = { activeFrom: daysFromNow(-30), activeTo: daysFromNow(30) };
      expect(computeTreatmentStatus({ ...dates, paused: true })).toBe(TREATMENT_STATUS.PAUSED);
      expect(computeTreatmentStatus({ ...dates, paused: false })).toBe(TREATMENT_STATUS.ACTIVE);
    });

    it('extension: completed → active when activeTo pushed to the future', () => {
      expect(computeTreatmentStatus({ paused: false, activeFrom: daysFromNow(-60), activeTo: daysFromNow(-1) })).toBe(
        TREATMENT_STATUS.COMPLETED
      );
      expect(computeTreatmentStatus({ paused: false, activeFrom: daysFromNow(-60), activeTo: daysFromNow(180) })).toBe(
        TREATMENT_STATUS.ACTIVE
      );
    });

    it('start reached: not_started → active when activeFrom passes', () => {
      expect(computeTreatmentStatus({ paused: false, activeFrom: daysFromNow(7), activeTo: daysFromNow(37) })).toBe(
        TREATMENT_STATUS.NOT_STARTED
      );
      expect(computeTreatmentStatus({ paused: false, activeFrom: daysFromNow(-1), activeTo: daysFromNow(37) })).toBe(
        TREATMENT_STATUS.ACTIVE
      );
    });
  });

  describe('boundaries', () => {
    it('activeFrom == now → active', () => {
      const now = new Date();
      expect(computeTreatmentStatus({ paused: false, activeFrom: now, activeTo: daysFromNow(30) }, now)).toBe(
        TREATMENT_STATUS.ACTIVE
      );
    });

    it('activeTo just in the future → active', () => {
      const now = new Date();
      expect(
        computeTreatmentStatus(
          { paused: false, activeFrom: daysFromNow(-30), activeTo: new Date(now.getTime() + 1000) },
          now
        )
      ).toBe(TREATMENT_STATUS.ACTIVE);
    });
  });
});
