const {
  patientImproved,
  patientDeclined,
  classifyPatientOutcome,
  farLineDelta,
  farLineDeltaBestEye,
  classifyType,
  improvedInType,
  compareType,
  typeNetDelta,
  farRecoveryPct,
} = require('../../../src/services/dashboard/visionImprovement');

// Helper builders
const far = (initL, initR, curL, curR) => ({
  far: { initialResult: { leftEye: initL, rightEye: initR }, currentResult: { leftEye: curL, rightEye: curR } },
});
const contrast = (initL, initR, curL, curR) => ({
  contrast: {
    initialResult: { leftEye: initL, rightEye: initR },
    currentResult: { leftEye: curL, rightEye: curR },
  },
});
const stereo = (init, cur) => ({
  stereopsis: { initialResult: { bothEye: init }, currentResult: { bothEye: cur } },
});

describe('visionImprovement — numeric & per-eye correctness', () => {
  it('compares levels NUMERICALLY, not lexicographically (9 < 10)', () => {
    expect(improvedInType('far', far('9', '9', '10', '10'))).toBe(true);
    expect(compareType('far', far('9', '9', '10', '10').far).improved).toBe(true);
  });

  it('uses best-eye net delta: one eye down does not force declined if better eye holds/up', () => {
    // left declines (10→7) but right improves (5→8) → net best = +3 → improved only
    const res = compareType('far', far('10', '5', '7', '8').far);
    expect(res.improved).toBe(true);
    expect(res.declined).toBe(false);
    expect(typeNetDelta('far', far('10', '5', '7', '8').far)).toBe(3);
  });

  it('one eye dips while the other is flat → type stable (best-eye delta 0), not declined', () => {
    expect(classifyType('far', far('11', '13', '11', '11'))).toBe('stable');
    expect(compareType('far', far('11', '13', '11', '11').far)).toEqual({
      improved: false,
      declined: false,
    });
  });

  it('stereopsis uses bothEye only (legacy level index 1–10: higher = better)', () => {
    expect(improvedInType('stereopsis', stereo('5', '7'))).toBe(true);
    expect(improvedInType('stereopsis', stereo('7', '5'))).toBe(false);
  });

  it('stereopsis arcsec: lower = better (40 → 25 is improvement)', () => {
    expect(improvedInType('stereopsis', stereo('40', '25'))).toBe(true);
    expect(improvedInType('stereopsis', stereo('25', '40'))).toBe(false);
  });

  it('patient outcome prefers far best-eye over contrast-only dips', () => {
    // far flat, contrast down → stable (not declined)
    const flatFarContrastDown = { ...far('12', '11', '12', '11'), ...contrast('13', '13', '11', '5') };
    expect(classifyPatientOutcome(flatFarContrastDown)).toBe('stable');
    expect(patientImproved(flatFarContrastDown)).toBe(false);
    expect(patientDeclined(flatFarContrastDown)).toBe(false);

    // far up, contrast down → improved
    const farUpContrastDown = { ...far('10', '10', '12', '12'), ...contrast('13', '13', '5', '5') };
    expect(classifyPatientOutcome(farUpContrastDown)).toBe('improved');
    expect(patientImproved(farUpContrastDown)).toBe(true);

    // far down → declined even if contrast flat
    expect(classifyPatientOutcome(far('12', '12', '9', '9'))).toBe('declined');
    expect(patientDeclined(far('12', '12', '9', '9'))).toBe(true);
  });

  it('far best-eye still better than baseline → improved (not declined)', () => {
    // left +2, right -1 → best = +2
    expect(classifyPatientOutcome(far('10', '14', '12', '13'))).toBe('improved');
  });

  it('no far data: fall back to other types net delta', () => {
    expect(classifyPatientOutcome(contrast('10', '10', '12', '12'))).toBe('improved');
    expect(classifyPatientOutcome(contrast('12', '12', '10', '10'))).toBe('declined');
    expect(classifyPatientOutcome(stereo('40', '25'))).toBe('improved');
  });

  it('farLineDelta = average of the two far eyes deltas (BU example → +2.5)', () => {
    expect(farLineDelta(far('7', '9', '10', '11'))).toBeCloseTo(2.5, 5);
  });

  it('farLineDelta uses the eye that has data when only one present', () => {
    expect(farLineDelta(far('7', '', '10', ''))).toBeCloseTo(3, 5);
    expect(farLineDelta(far('', '', '', ''))).toBeNull();
  });

  it('farLineDeltaBestEye = max delta; mắt 20/20 không kéo xuống', () => {
    expect(farLineDeltaBestEye(far('20', '7', '20', '10'))).toBe(3);
    expect(farLineDeltaBestEye(far('7', '9', '10', '11'))).toBe(3);
  });

  it('farRecoveryPct: both <20/20 → better eye; one =20/20 → the other eye', () => {
    expect(farRecoveryPct(80, 40)).toBe(80);
    expect(farRecoveryPct(100, 50)).toBe(50);
    expect(farRecoveryPct(100, 120)).toBe(100);
    expect(farRecoveryPct(66.67, null)).toBe(66.67);
    expect(farRecoveryPct(null, null)).toBeNull();
  });

  it('classifyType: improved / declined / stable / null', () => {
    expect(classifyType('far', far('7', '7', '10', '10'))).toBe('improved');
    expect(classifyType('far', far('10', '10', '7', '7'))).toBe('declined');
    expect(classifyType('far', far('8', '8', '8', '8'))).toBe('stable');
    expect(classifyType('far', far('', '', '', ''))).toBeNull();
  });
});
