/**
 * Build a sandbox Assignment for VT Quest preview / admin test (no API, no patient).
 */

import type { Assignment } from 'src/types';
import type { ColorScheme } from 'src/types/core/visual-settings';
import { DEFAULT_VT_SETTINGS, type VtSettings } from 'src/types/core/vtQuest';
import {
  getVtExerciseDisplayName,
  resolveVtSettingsForExerciseType,
} from './vtExerciseTypes';

export interface VtQuestSandboxParams {
  visionType: 'far' | 'near' | 'contrast';
  /** Simulated patient vision level (1-based); applied via levelOverride. */
  visionLevel: number;
  distance: number;
  eye?: 'left' | 'right' | 'both';
  colorScheme?: ColorScheme | null;
  vtSettings?: Partial<VtSettings> | null;
  duration?: number;
  inactivityThreshold?: number | null;
  exerciseName?: string;
  /** Registry exercise type (vt-gabor, vt-vernier, vt-crowding, vt-quest) */
  exerciseType?: string;
}

export function mergeVtSettings(partial?: Partial<VtSettings> | null): VtSettings {
  if (!partial) return DEFAULT_VT_SETTINGS;
  return {
    ...DEFAULT_VT_SETTINGS,
    ...partial,
    stimulus: {
      ...DEFAULT_VT_SETTINGS.stimulus,
      ...(partial.stimulus ?? {}),
      gabor: {
        ...DEFAULT_VT_SETTINGS.stimulus.gabor,
        ...(partial.stimulus?.gabor ?? {}),
      },
    },
    staircase: {
      ...DEFAULT_VT_SETTINGS.staircase,
      ...(partial.staircase ?? {}),
    },
  };
}

export function buildVtQuestSandboxAssignment(params: VtQuestSandboxParams): Assignment {
  const exerciseType = params.exerciseType ?? 'vt-quest';
  const displayName = params.exerciseName ?? getVtExerciseDisplayName(exerciseType);

  return {
    id: 0,
    patientId: 0,
    configId: 0,
    status: 'active',
    sessionsCompleted: 0,
    levelOverride: true,
    visionLevel: params.visionLevel,
    createdAt: '',
    updatedAt: '',
    exercise: {
      id: 0,
      name: displayName,
      code: exerciseType,
      exerciseType,
    },
    exerciseConfig: {
      id: 0,
      exerciseId: 0,
      configType: 'admin',
      name: 'VT Quest — Chơi thử',
      eye: params.eye ?? 'both',
      distance: params.distance,
      duration: params.duration ?? 30,
      visionType: params.visionType,
      fontSize: 55,
      contrast: 100,
      colorScheme: params.colorScheme ?? undefined,
      vtSettings: resolveVtSettingsForExerciseType(
        exerciseType,
        mergeVtSettings(params.vtSettings)
      ),
      inactivityThreshold: params.inactivityThreshold ?? 30,
    } as Assignment['exerciseConfig'],
  };
}
