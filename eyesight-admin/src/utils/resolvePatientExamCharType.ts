/**
 * Resolve the best charType to use for far-acuity (BTL) exercise setup.
 *
 * Priority (user requirement):
 *   1. Char type from the patient's most recent completed exam (matching visionType first)
 *   2. Char type from the patient's most recent completed far-acuity exercise
 *   3. Fallback: 'E'
 *
 * Do NOT let a stale per-assignment localStorage default override (1)/(2).
 */

import { getMyExamResults, getMyExerciseResults } from 'src/services/patient.service';

export type ExamCharType = 'E' | 'C' | 'A' | 'N' | 'S';

const VALID_CHAR_TYPES = new Set<ExamCharType>(['E', 'C', 'A', 'N', 'S']);

export const FAR_ACUITY_LAST_CHAR_TYPE_KEY = 'far_acuity_last_char_type';

export function isValidCharType(v: unknown): v is ExamCharType {
  return typeof v === 'string' && VALID_CHAR_TYPES.has(v as ExamCharType);
}

function pickCharTypeFromExamResults(results: any[]): ExamCharType | null {
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

function pickCharTypeFromExerciseResults(results: any[]): ExamCharType | null {
  if (!Array.isArray(results)) return null;
  const sorted = [...results].sort((a, b) => {
    const da = a.completedAt
      ? new Date(a.completedAt).getTime()
      : a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;
    const db = b.completedAt
      ? new Date(b.completedAt).getTime()
      : b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;
    return db - da;
  });

  for (const r of sorted) {
    const visionType = r.assignment?.exerciseConfig?.visionType ?? r.exerciseConfig?.visionType;
    // Far-acuity / contrast / near acuity exercises share the same char picker.
    if (visionType && !['far', 'near', 'contrast'].includes(visionType)) continue;

    const ct =
      r.resultMetrics?.charType ??
      r.exerciseState?.charType ??
      r.exerciseConfig?.charType;
    if (isValidCharType(ct)) return ct;
  }
  return null;
}

/**
 * Map exercise visionType → exam types to query (primary first).
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

function unwrapRows(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const nested = obj.data ?? obj.items ?? obj.rows;
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

/**
 * Fetch the charType from the patient's most recent completed exam that matches
 * the exercise visionType. Returns the charType string or the default 'E'.
 *
 * @deprecated Prefer resolveDefaultFarAcuityCharType which also checks exercise history.
 */
export async function resolvePatientExamCharType(visionType?: string | null): Promise<ExamCharType> {
  const resolved = await resolveDefaultFarAcuityCharType(visionType);
  return resolved.charType;
}

export type FarAcuityCharTypeSource = 'exam' | 'exercise' | 'default';

export interface ResolvedFarAcuityCharType {
  charType: ExamCharType;
  source: FarAcuityCharTypeSource;
  /** Exam charType when found (may equal charType when source === 'exam'). */
  fromExam: ExamCharType | null;
  /** Exercise charType when found. */
  fromExercise: ExamCharType | null;
}

/**
 * Resolve default charType for BTL / far-acuity setup:
 * exam (matching vision) → last exercise → 'E'.
 */
export async function resolveDefaultFarAcuityCharType(
  visionType?: string | null
): Promise<ResolvedFarAcuityCharType> {
  const examTypes = examTypesForVisionType(visionType);
  let fromExam: ExamCharType | null = null;
  let fromExercise: ExamCharType | null = null;

  try {
    const examResponses = await Promise.allSettled(
      examTypes.map((examType) =>
        getMyExamResults({ examType, status: 'completed', limit: 5 })
      )
    );

    for (const resp of examResponses) {
      if (resp.status !== 'fulfilled') continue;
      const found = pickCharTypeFromExamResults(unwrapRows(resp.value));
      if (found) {
        fromExam = found;
        break;
      }
    }
  } catch {
    // ignore — fall through
  }

  try {
    const exerciseRaw = await getMyExerciseResults({
      limit: 20,
      page: 1,
      sortBy: 'createdAt',
      order: 'desc',
    });
    fromExercise = pickCharTypeFromExerciseResults(unwrapRows(exerciseRaw));
  } catch {
    // ignore — fall through
  }

  // Device fallback when backend history has no charType yet (older results).
  if (!fromExercise && typeof localStorage !== 'undefined') {
    const cached =
      localStorage.getItem(FAR_ACUITY_LAST_CHAR_TYPE_KEY) ||
      // migrate: scan any legacy per-assignment keys
      (() => {
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key?.startsWith('far_acuity_char_type_')) {
            const value = localStorage.getItem(key);
            if (isValidCharType(value)) return value;
          }
        }
        return null;
      })();
    if (isValidCharType(cached)) fromExercise = cached;
  }

  if (fromExam) {
    return { charType: fromExam, source: 'exam', fromExam, fromExercise };
  }
  if (fromExercise) {
    return { charType: fromExercise, source: 'exercise', fromExam, fromExercise };
  }
  return { charType: 'E', source: 'default', fromExam: null, fromExercise: null };
}

export function rememberFarAcuityCharType(charType: ExamCharType): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(FAR_ACUITY_LAST_CHAR_TYPE_KEY, charType);
}
