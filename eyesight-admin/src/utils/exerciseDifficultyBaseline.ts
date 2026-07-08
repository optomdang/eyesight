/**
 * Exercise difficulty baseline resolver.
 *
 * Determines the starting vision level for a single exercise execution based on
 * the chosen `difficultyBaselineSource` mode on the config and the assignment's
 * `lastAchievedVisionLevel` (peak reached across all previous executions).
 *
 * Priority chain (highest → lowest):
 *  1. levelOverride + visionLevel (doctor-specified, from assignment)
 *  2. difficultyBaselineSource === 'latest_achieved' with saved peak
 *  3. Patient's latest exam result for the relevant visionType + eye
 *
 * Note: does NOT touch the mm→px / PPI chain (@locked in visionUtils).
 */

import {
  computeExercisePatientVision,
  type ExerciseExamResults,
  type TrainingEye,
} from 'src/utils/visionUtils';

export type DifficultyBaselineSource = 'current_exam' | 'latest_achieved';

/**
 * Extract the peak vision level from an exercise result's `resultMetrics` blob.
 *
 * | exerciseType  | peak field                                        |
 * |---------------|---------------------------------------------------|
 * | far-acuity    | peakFarLevel  (also used for near by same engine) |
 * | contrast      | peakContrastLevel                                 |
 * | VT Quest      | peakVisionLevel (written at VT complete)          |
 * | 2048 / static | peakVisionLevel or peakFarLevel, whichever exists |
 */
export function extractPeakVisionLevelFromResultMetrics(
  resultMetrics: Record<string, unknown> | null | undefined,
  visionType: 'far' | 'near' | 'contrast' | 'stereopsis' | null | undefined
): number | null {
  if (!resultMetrics) return null;

  if (visionType === 'contrast') {
    const v = resultMetrics['peakContrastLevel'];
    return typeof v === 'number' && v > 0 ? v : null;
  }

  // far, near, VT Quest, 2048 — try the canonical peak fields in priority order.
  for (const key of ['peakFarLevel', 'peakVisionLevel'] as const) {
    const v = resultMetrics[key];
    if (typeof v === 'number' && v > 0) return v;
  }
  return null;
}

interface ResolveParams {
  /** Chosen mode on ExerciseConfig. Defaults to 'current_exam' when absent. */
  difficultyBaselineSource?: DifficultyBaselineSource | null;
  /** Whether the doctor has set an explicit override level on the assignment. */
  levelOverride?: boolean | null;
  /** Explicit level from assignment (only used when levelOverride is true). */
  visionLevel?: number | null;
  /** Vision type that drives sizing (far / near / contrast / stereopsis). */
  visionType?: 'far' | 'near' | 'contrast' | 'stereopsis' | null;
  /** Per-patient training eye from assignment. */
  trainingEye?: TrainingEye | string | null;
  /** Default eye from config. */
  configEye?: TrainingEye | string | null;
  /** Patient's fresh exam results used as the current_exam baseline. */
  examResults?: ExerciseExamResults | null;
  /**
   * Highest vision level the patient has previously reached in this assignment.
   * Null/undefined = assignment never played (first execution).
   * Only consulted when difficultyBaselineSource === 'latest_achieved'.
   */
  lastAchievedVisionLevel?: number | null;
}

/**
 * Returns the vision level at which the exercise should start for this execution,
 * or `null` when there is insufficient data to determine a level.
 */
export function resolveExerciseStartVisionLevel(params: ResolveParams): number | null {
  const {
    difficultyBaselineSource,
    levelOverride,
    visionLevel,
    visionType,
    trainingEye,
    configEye,
    examResults,
    lastAchievedVisionLevel,
  } = params;

  // Stereopsis has no level scale — not supported.
  if (visionType === 'stereopsis') return null;

  // ── 1. Doctor-specified override (always wins) ────────────────────────────
  if (levelOverride && visionLevel != null && visionLevel > 0) {
    return visionLevel;
  }

  const source: DifficultyBaselineSource = difficultyBaselineSource ?? 'current_exam';

  // ── 2. latest_achieved: use saved peak when available ─────────────────────
  if (source === 'latest_achieved' && lastAchievedVisionLevel != null && lastAchievedVisionLevel > 0) {
    return lastAchievedVisionLevel;
  }

  // ── 3. Baseline from current exam result ──────────────────────────────────
  const patientVision = computeExercisePatientVision({
    levelOverride: false, // override already handled above
    visionLevel,
    visionType,
    trainingEye,
    configEye,
    examResults: examResults ?? undefined,
  });

  if (visionType === 'near') return patientVision.nearVisionLevel;
  if (visionType === 'contrast') return patientVision.contrastLevel;
  return patientVision.farVisionLevel;
}
