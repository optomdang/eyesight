/**
 * Vision improvement algorithm — SINGLE source of truth (D8).
 *
 * Reads the Patient.examResults cache and computes improvement per the BU spec:
 *  - Eye model by type: stereopsis → bothEye only; far/near/contrast → leftEye & rightEye
 *    (no bothEye, NEVER compare across eyes — fixes D10 cross-eye bug).
 *  - Levels are compared NUMERICALLY (toLevel) so "9" vs "10" is 9<10, not lexicographic (D2).
 *  - Higher level = better vision (level 20 = 20/5 ... level 1 = 20/400).
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
 * Compare one vision type's initial vs current per eye.
 * @returns {{ improved: boolean, declined: boolean }}
 */
const compareType = (type, data) => {
  if (!data || !data.initialResult || !data.currentResult) return { improved: false, declined: false };
  let improved = false;
  let declined = false;
  for (const eye of eyesForType(type)) {
    const init = toLevel(data.initialResult[eye]);
    const cur = toLevel(data.currentResult[eye]);
    if (init === null || cur === null) continue; // need same-eye pair
    if (type === 'stereopsis') {
      // Legacy levels 1–10: higher = better. New arcsec (≥20): lower = better.
      const legacy = init >= 1 && init <= 10 && cur >= 1 && cur <= 10;
      if (legacy) {
        if (cur > init) improved = true;
        else if (cur < init) declined = true;
      } else {
        if (cur < init) improved = true;
        else if (cur > init) declined = true;
      }
    } else if (cur > init) improved = true;
    else if (cur < init) declined = true;
  }
  return { improved, declined };
};

/** TỶ LỆ CẢI THIỆN numerator rule: improved in ≥1 of the 4 types. */
const patientImproved = (examResults) => !!examResults && VISION_TYPES.some((t) => compareType(t, examResults[t]).improved);

/**
 * Classify a patient for ONE vision type (cause pie #9).
 * improved (any eye up) > declined (any eye down) > stable.
 * Returns null if no comparable data for that type.
 */
const classifyType = (type, examResults) => {
  const data = examResults?.[type];
  if (!data || !data.initialResult || !data.currentResult) return null;
  const { improved, declined } = compareType(type, data);
  // need at least one comparable eye pair
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
  compareType,
  patientImproved,
  classifyType,
  farLineDelta,
  farLineDeltaBestEye,
  improvedInType,
  farRecoveryPct,
};
