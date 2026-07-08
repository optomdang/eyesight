/**
 * Pure helpers to rebuild Patient.examResults (cache) from raw ExamResult rows.
 * Extracted so the backfill logic is unit-testable without touching the DB.
 */

const VISION_TYPES = ['far', 'near', 'contrast', 'stereopsis'];

/** A completed exam is "full" when it has the eyes the type requires. */
const isFull = (r) =>
  r.examType === 'stereopsis'
    ? r.bothEyeLevel != null && r.bothEyeLevel !== ''
    : r.leftEyeLevel != null && r.leftEyeLevel !== '' && r.rightEyeLevel != null && r.rightEyeLevel !== '';

const eyeObj = (r) => ({
  leftEye: r.examType === 'stereopsis' ? null : r.leftEyeLevel ?? null,
  rightEye: r.examType === 'stereopsis' ? null : r.rightEyeLevel ?? null,
  bothEye: r.examType === 'stereopsis' ? r.bothEyeLevel ?? null : null,
});

const hasData = (res) => !!res && (res.leftEye != null || res.rightEye != null || res.bothEye != null);

/**
 * Rebuild the examResults cache from completed exams.
 * Conservative: only fills a vision type whose currentResult is empty; keeps an existing initialResult.
 *
 * @param {object} existingExamResults - current Patient.examResults (may be {} or partial)
 * @param {Array} exams - completed ExamResult rows for the patient, sorted by completedAt ASC
 * @returns {{ examResults: object, changed: boolean }}
 */
const rebuildExamResults = (existingExamResults, exams) => {
  const examResults = { ...(existingExamResults || {}) };
  let changed = false;

  for (const type of VISION_TYPES) {
    const entry = { ...(examResults[type] || {}) };
    if (hasData(entry.currentResult)) continue; // do not overwrite existing data

    const full = exams.filter((e) => e.examType === type && isFull(e));
    if (full.length === 0) continue;

    const first = full[0];
    const last = full[full.length - 1];

    if (!hasData(entry.initialResult)) entry.initialResult = eyeObj(first);
    entry.currentResult = eyeObj(last);
    entry.lastExamDate = last.completedAt || last.createdAt || null;

    examResults[type] = entry;
    changed = true;
  }

  return { examResults, changed };
};

/**
 * Apply a single completed exam to the patient cache (always refreshes currentResult).
 * Used after ExamResult save so portal/exercise can read fresh levels immediately.
 */
const applyCompletedExamToPatientCache = (existingExamResults, completedExam) => {
  if (!completedExam || completedExam.status !== 'completed') {
    return { examResults: existingExamResults || {}, changed: false };
  }
  const type = completedExam.examType;
  if (!VISION_TYPES.includes(type) || !isFull(completedExam)) {
    return { examResults: existingExamResults || {}, changed: false };
  }

  const examResults = { ...(existingExamResults || {}) };
  const entry = { ...(examResults[type] || {}) };
  const current = eyeObj(completedExam);

  if (!hasData(entry.initialResult)) {
    entry.initialResult = { ...current };
  }
  entry.currentResult = current;
  entry.lastExamDate =
    completedExam.completedAt || completedExam.updatedAt || completedExam.createdAt || new Date().toISOString();

  examResults[type] = entry;
  return { examResults, changed: true };
};

module.exports = {
  VISION_TYPES,
  isFull,
  eyeObj,
  hasData,
  rebuildExamResults,
  applyCompletedExamToPatientCache,
};
