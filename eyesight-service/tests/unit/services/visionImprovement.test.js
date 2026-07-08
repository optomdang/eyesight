const {
  patientImproved,
  farLineDelta,
  farLineDeltaBestEye,
  classifyType,
  improvedInType,
  compareType,
  farRecoveryPct,
} = require('../../../src/services/dashboard/visionImprovement');

// Helper builders
const far = (initL, initR, curL, curR) => ({
  far: { initialResult: { leftEye: initL, rightEye: initR }, currentResult: { leftEye: curL, rightEye: curR } },
});
const stereo = (init, cur) => ({
  stereopsis: { initialResult: { bothEye: init }, currentResult: { bothEye: cur } },
});

describe('visionImprovement — numeric & per-eye correctness', () => {
  it('compares levels NUMERICALLY, not lexicographically (9 < 10)', () => {
    // far left: 9 → 10 is an improvement (lexical "9" > "10" would be wrong)
    expect(improvedInType('far', far('9', '9', '10', '10'))).toBe(true);
    expect(compareType('far', far('9', '9', '10', '10').far).improved).toBe(true);
  });

  it('never compares across eyes (left vs left, right vs right)', () => {
    // left declines (10→7) but right improves (5→8) → improved=true, declined=true
    const res = compareType('far', far('10', '5', '7', '8').far);
    expect(res.improved).toBe(true);
    expect(res.declined).toBe(true);
  });

  it('stereopsis uses bothEye only (legacy level index 1–10: higher = better)', () => {
    expect(improvedInType('stereopsis', stereo('5', '7'))).toBe(true);
    expect(improvedInType('stereopsis', stereo('7', '5'))).toBe(false);
  });

  it('stereopsis arcsec: lower = better (40 → 25 is improvement)', () => {
    expect(improvedInType('stereopsis', stereo('40', '25'))).toBe(true);
    expect(improvedInType('stereopsis', stereo('25', '40'))).toBe(false);
  });

  it('patientImproved = improved in ANY of 4 types', () => {
    const both = { ...far('7', '7', '7', '7'), ...stereo('40', '25') }; // far flat, stereo arcsec improved
    expect(patientImproved(both)).toBe(true);
    expect(patientImproved(far('7', '7', '7', '7'))).toBe(false);
  });

  it('farLineDelta = average of the two far eyes deltas (BU example → +2.5)', () => {
    // Patient A: 7→10 = +3 (use left), Patient B: 9→11 = +2. Here single patient both eyes:
    // left 7→10 (+3), right 9→11 (+2) → avg = 2.5
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
    // TH1: MP 80%, MT 40% (cả 2 <100) → mắt tốt hơn = 80
    expect(farRecoveryPct(80, 40)).toBe(80);
    // TH2: MP 100% (đạt 20/20), MT 50% → lấy mắt còn lại = 50
    expect(farRecoveryPct(100, 50)).toBe(50);
    // cả 2 đạt → 100
    expect(farRecoveryPct(100, 120)).toBe(100);
    // chỉ 1 mắt có dữ liệu
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
