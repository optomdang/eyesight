/**
 * Build a sandbox Assignment for Far Acuity admin test (no API, no patient).
 */

import type { Assignment } from 'src/types';
import type { ColorScheme, DichopticConfig } from 'src/types/core/visual-settings';

export interface FarAcuitySandboxParams {
  /**
   * Simulated starting level (1-based).
   * - far / near → acuity (letter size)
   * - contrast → contrast logCS step (FarAcuityExercise reads this as initialContrastLevel)
   */
  visionLevel?: number;
  /** far | near | contrast — controls acuity table / contrast ladder. */
  visionType?: 'far' | 'near' | 'contrast';
  /** Explicit letter-size acuity when visionType is contrast (defaults to level 10 / 20/50). */
  farAcuityLevel?: number;
  distance?: number;
  eye?: 'left' | 'right' | 'both';
  duration?: number;
  exerciseName?: string;
  /** Applied to optotype text + background in the sandbox exercise. */
  colorScheme?: ColorScheme | null;
  dichoptic?: DichopticConfig | null;
}

export function buildFarAcuitySandboxAssignment(params: FarAcuitySandboxParams = {}): Assignment {
  const visionType = params.visionType ?? 'far';
  const isContrast = visionType === 'contrast';

  return {
    id: 0,
    patientId: 0,
    configId: 0,
    status: 'active',
    sessionsCompleted: 0,
    levelOverride: true,
    // Contrast: assignment.visionLevel = contrast step; far letter size via lastAchievedVisionLevel stash
    visionLevel: params.visionLevel ?? (isContrast ? 1 : 10),
    lastAchievedVisionLevel: isContrast ? (params.farAcuityLevel ?? 10) : undefined,
    createdAt: '',
    updatedAt: '',
    exercise: {
      id: 0,
      name: params.exerciseName ?? 'Bài tập thị lực xa',
      code: 'far-acuity',
      exerciseType: 'far-acuity',
    },
    exerciseConfig: {
      id: 0,
      exerciseId: 0,
      configType: 'admin',
      name: 'Bài tập thị lực xa — Chơi thử',
      eye: params.eye ?? 'both',
      distance: params.distance ?? 3,
      duration: params.duration ?? 30,
      visionType,
      fontSize: 55,
      contrast: 100,
      inactivityThreshold: 30,
      ...(params.colorScheme ? { colorScheme: params.colorScheme } : {}),
      ...(params.dichoptic ? { dichoptic: params.dichoptic } : {}),
    } as Assignment['exerciseConfig'],
  };
}
