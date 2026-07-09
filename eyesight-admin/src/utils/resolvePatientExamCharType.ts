/**
 * Resolve the best charType to use for the far-acuity exercise.
 *
 * Priority:
 *   1. Most-recent completed exam whose examType matches the exercise visionType.
 *   2. Most-recent completed exam of any other relevant type (far / contrast / near).
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
 * Map exercise visionType to the primary exam type to query first, plus fallbacks.
 * For 'near' exercises look at near exams first; for 'contrast' look at contrast first, etc.
 */
function examTypesForVisionType(visionType?: string | null): string[] {
  switch (visionType) {
    case 'near':
      return ['near', 'far', 'contrast'];
    case 'contrast':
      return ['contrast', 'far', 'near'];
    case 'far':
    default:
      return ['far', 'contrast', 'near'];
  }
}

/**
 * Fetch the charType from the patient's most recent completed exam that matches
 * the exercise visionType. Returns the charType string or the default 'E'.
 *
 * @param visionType  'far' | 'near' | 'contrast' from PortalExerciseConfig.visionType
 */
export async function resolvePatientExamCharType(visionType?: string | null): Promise<ExamCharType> {
  const examTypes = examTypesForVisionType(visionType);

  try {
    const responses = await Promise.allSettled(
      examTypes.map((examType) =>
        getMyExamResults({ examType, status: 'completed', limit: 5 })
      )
    );

    for (const resp of responses) {
      if (resp.status !== 'fulfilled') continue;
      const raw = resp.value;
      const items: any[] = Array.isArray(raw)
        ? raw
        : (raw?.data ?? raw?.items ?? raw?.rows ?? []);
      const found = pickCharType(Array.isArray(items) ? items : []);
      if (found) return found;
    }
  } catch {
    // Network error — fall through to default
  }

  return 'E';
}
