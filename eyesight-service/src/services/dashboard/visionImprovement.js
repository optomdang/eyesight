/**
 * Vision improvement algorithm — SINGLE source of truth (D8).
 *
 * Reads the Patient.examResults cache and computes improvement per the BU spec:
 *  - Eye model by type: stereopsis → bothEye only; far/near/contrast → leftEye & rightEye
 *    (no bothEye, NEVER compare across eyes — fixes D10 cross-eye bug).
 *  - Levels are compared NUMERICALLY (toLevel) so "9" vs "10" is 9<10, not lexicographic (D2).
 *  - Higher level = better vision (level 20 = 20/5 ... level 1 = 20/400).
 *  - Type / patient outcome uses net latest vs baseline (best-eye), not “any single eye dipped”.
 *
 * Pure functions — unit-testable, no DB.
 */

const VISION_TYPES = ['far', 'near', 'contrast', 'stereopsis'];

const eyesForType = (type) => (type === 'stereopsis' ? ['bothEye'] : ['leftEye', 'rightEye']);

/** Parse a vision level to a finite number, else null (handles string/number/empty). */
const toLevel = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Net latest−baseline delta for one vision type.
 * far/near/contrast → best-eye delta (higher level = better).
 * stereopsis → signed improvement (positive = better); legacy 1–10 higher=better, arcsec lower=better.
 * @returns {number|null}
 */
const typeNetDelta = (type, data) => {
  if (!data || !data.initialResult || !data.currentResult) return null;

  if (type === 'stereopsis') {
    const init = toLevel(data.initialResult.bothEye);
    const cur = toLevel(data.currentResult.bothEye);
    if (init === null || cur === null) return null;
    const legacy = init >= 1 && init <= 10 && cur >= 1 && cur <= 10;
    return legacy ? cur - init : init - cur;
  }

  let best = null;
  for (const eye of ['leftEye', 'rightEye']) {
    const init = toLevel(data.initialResult[eye]);
    const cur = toLevel(data.currentResult[eye]);
    if (init === null || cur === null) continue;
    const delta = cur - init;
    if (best === null || delta > best) best = delta;
  }
  return best;
};

/**
 * Compare one vision type's initial vs current (net / best-eye).
 * @returns {{ improved: boolean, declined: boolean }}
 */
const compareType = (type, data) => {
  const delta = typeNetDelta(type, data);
  if (delta === null) return { improved: false, declined: false };
  return { improved: delta > 0, declined: delta < 0 };
};

/**
 * Overall patient bucket for pie #9 / rate #3.
 * Prefer far acuity best-eye (same primary metric as BXH CẢI THIỆN):
 *   latest vs baseline → >0 improved, <0 declined, 0 stable.
 * A single eye dip does not force Giảm sút when the better eye is flat/up.
 * Contrast-only dips do not override a flat/better far result.
 * When far data is missing, fall back to near/contrast/stereopsis net deltas.
 * @returns {'improved'|'declined'|'stable'}
 */
const classifyPatientOutcome = (examResults) => {
  if (!examResults) return 'stable';

  const farDelta = typeNetDelta('far', examResults.far);
  if (farDelta !== null) {
    if (farDelta > 0) return 'improved';
    if (farDelta < 0) return 'declined';
    return 'stable';
  }

  let sawUp = false;
  let sawDown = false;
  for (const t of ['near', 'contrast', 'stereopsis']) {
    const delta = typeNetDelta(t, examResults[t]);
    if (delta === null) continue;
    if (delta > 0) sawUp = true;
    else if (delta < 0) sawDown = true;
  }
  if (sawUp) return 'improved';
  if (sawDown) return 'declined';
  return 'stable';
};

/** TỶ LỆ CẢI THIỆN numerator: net far (or fallback) latest > baseline. */
const patientImproved = (examResults) => classifyPatientOutcome(examResults) === 'improved';

/** Giảm sút: net latest < baseline (far-primary). */
const patientDeclined = (examResults) => classifyPatientOutcome(examResults) === 'declined';

/**
 * Classify a patient for ONE vision type (cause pie helpers / per-type cards).
 * improved (net > 0) > declined (net < 0) > stable.
 * Returns null if no comparable data for that type.
 */
const classifyType = (type, examResults) => {
  const data = examResults?.[type];
  if (!data || !data.initialResult || !data.currentResult) return null;
  const { improved, declined } = compareType(type, data);
  const comparable = eyesForType(type).some(
    (eye) => toLevel(data.initialResult[eye]) !== null && toLevel(data.currentResult[eye]) !== null
  );
  if (!comparable) return null;
  if (improved) return 'improved';
  if (declined) return 'declined';
  return 'stable';
};

/**
 * MỨC ĐỘ CẢI THIỆN (#4): average far line-delta across the eyes that have init+current.
 * @returns {number|null} average (current_level - initial_level) of far eyes, or null if none.
 */
const farLineDelta = (examResults) => {
  const data = examResults?.far;
  if (!data || !data.initialResult || !data.currentResult) return null;
  const deltas = [];
  for (const eye of ['leftEye', 'rightEye']) {
    const init = toLevel(data.initialResult[eye]);
    const cur = toLevel(data.currentResult[eye]);
    if (init !== null && cur !== null) deltas.push(cur - init);
  }
  if (deltas.length === 0) return null;
  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
};

/**
 * BXH CẢI THIỆN: số dòng thị lực xa của mắt cải thiện NHIỀU NHẤT (không TB 2 mắt).
 * Mắt đã 20/20 từ đầu (delta=0) không kéo giảm mắt còn lại.
 * @returns {number|null}
 */
const farLineDeltaBestEye = (examResults) => {
  const data = examResults?.far;
  if (!data || !data.initialResult || !data.currentResult) return null;
  return typeNetDelta('far', data);
};

/** Per-type improvement boolean for the 4 cards (#12-15). */
const improvedInType = (type, examResults) => compareType(type, examResults?.[type]).improved;

/**
 * PHỤC HỒI eye selection (#10). Inputs = far recovery % of each eye (null if absent).
 *  - chỉ 1 mắt có dữ liệu → mắt đó
 *  - cả 2 mắt chưa đạt 20/20 (<100) → mắt TỐT HƠN (% cao hơn)
 *  - đúng 1 mắt đã đạt 20/20 (≥100) → mắt CÒN LẠI (chưa đạt)
 *  - cả 2 đã đạt → 100
 * @returns {number|null}
 */
const farRecoveryPct = (leftPct, rightPct) => {
  const present = [leftPct, rightPct].filter((v) => v !== null && v !== undefined);
  if (present.length === 0) return null;
  if (present.length === 1) return present[0];
  const reachedCount = present.filter((v) => v >= 100).length;
  if (reachedCount === 2) return 100;
  if (reachedCount === 1) return Math.min(leftPct, rightPct); // mắt chưa đạt 20/20
  return Math.max(leftPct, rightPct); // cả 2 chưa đạt → mắt tốt hơn
};

module.exports = {
  VISION_TYPES,
  toLevel,
  typeNetDelta,
  compareType,
  classifyPatientOutcome,
  patientImproved,
  patientDeclined,
  classifyType,
  farLineDelta,
  farLineDeltaBestEye,
  improvedInType,
  farRecoveryPct,
};
