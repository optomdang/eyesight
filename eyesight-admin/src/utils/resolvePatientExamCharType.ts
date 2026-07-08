/**
 * Resolve the best charType to use for the far-acuity exercise.
 *
 * Priority:
 *   1. Most-recent completed far exam with a non-empty charType.
 *   2. Most-recent completed contrast exam with a non-empty charType.
 *   3. Fallback: 'E' (E-chart, universally understood).
 */

import { getMyExamResults } from 'src/services/patient.service';

export type ExamCharType = 'E' | 'C' | 'A' | 'N' | 'S';

const VALID_CHAR_TYPES = new Set<ExamCharType>(['E', 'C', 'A', 'N', 'S']);

function isValidCharType(v: unknown): v is ExamCharType {
  return typeof v === 'string' && VALID_CHAR_TYPES.has(v as ExamCharType);
}

function pickCharType(results: any[]): ExamCharType | null {
  if (!Array.isArray(results)) return null;
  // Sort by completedAt desc (most recent first)
  const sorted = [...results].sort((a, b) => {
    const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return db - da;
  });
  for (const r of sorted) {
    const ct = r.charType ?? r.result?.charType;
    if (isValidCharType(ct)) return ct;
  }
  return null;
}

/**
 * Fetch the charType from the patient's most recent completed exams.
 * Returns the charType string or the default 'E'.
 */
export async function resolvePatientExamCharType(): Promise<ExamCharType> {
  try {
    const [farResponse, contrastResponse] = await Promise.allSettled([
      getMyExamResults({ examType: 'far', status: 'completed', limit: 5 }),
      getMyExamResults({ examType: 'contrast', status: 'completed', limit: 5 }),
    ]);

    const farResults =
      farResponse.status === 'fulfilled'
        ? (farResponse.value?.data ?? farResponse.value?.items ?? farResponse.value ?? [])
        : [];

    const farCharType = pickCharType(Array.isArray(farResults) ? farResults : []);
    if (farCharType) return farCharType;

    const contrastResults =
      contrastResponse.status === 'fulfilled'
        ? (contrastResponse.value?.data ?? contrastResponse.value?.items ?? contrastResponse.value ?? [])
        : [];

    const contrastCharType = pickCharType(Array.isArray(contrastResults) ? contrastResults : []);
    if (contrastCharType) return contrastCharType;
  } catch {
    // Network error — fall through to default
  }

  return 'E';
}
