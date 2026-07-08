/**
 * VT Quest exercise type helpers — single-modality games vs legacy combined quest.
 */

import { normalizeExerciseType } from 'src/components/exercises/registry';
import { DEFAULT_VT_SETTINGS, type VtSettings, type VtWorld } from 'src/types/core/vtQuest';

/** Single-modality exercise type → world id */
export const VT_SINGLE_MODALITY_TYPES = {
  'vt-gabor': 'gabor',
  'vt-vernier': 'vernier',
  'vt-crowding': 'crowding',
  'vt-stereopsis': 'stereopsis',
} as const;

export type VtSingleModalityExerciseType = keyof typeof VT_SINGLE_MODALITY_TYPES;

export const VT_QUEST_FAMILY_TYPES = [
  'vt-quest',
  'vt-gabor',
  'vt-vernier',
  'vt-crowding',
  'vt-stereopsis',
] as const;

export type VtQuestFamilyExerciseType = (typeof VT_QUEST_FAMILY_TYPES)[number];

export function isVtQuestFamily(exerciseType?: string | null): boolean {
  if (!exerciseType) return false;
  const normalized = normalizeExerciseType(exerciseType);
  return (VT_QUEST_FAMILY_TYPES as readonly string[]).includes(normalized);
}

/** Returns fixed world for single-modality types; null for legacy vt-quest (all worlds). */
export function getVtModalityFromExerciseType(
  exerciseType?: string | null
): VtWorld | null {
  if (!exerciseType) return null;
  const normalized = normalizeExerciseType(exerciseType);
  return VT_SINGLE_MODALITY_TYPES[normalized as VtSingleModalityExerciseType] ?? null;
}

export function isVtSingleModalityExercise(exerciseType?: string | null): boolean {
  return getVtModalityFromExerciseType(exerciseType) != null;
}

/** Resolve exercise type from portal assignment (API nests under exerciseConfig.exercise). */
export function resolveVtExerciseTypeFromAssignment(
  assignment?: {
    exercise?: { exerciseType?: string | null } | null;
    exerciseConfig?: { exercise?: { exerciseType?: string | null } | null } | null;
  } | null
): string | null | undefined {
  return (
    assignment?.exercise?.exerciseType ??
    assignment?.exerciseConfig?.exercise?.exerciseType ??
    null
  );
}

export function resolveVtSettingsForExerciseType(
  exerciseType: string | null | undefined,
  raw?: Partial<VtSettings> | null
): VtSettings {
  const modality = getVtModalityFromExerciseType(exerciseType);
  const merged: VtSettings = raw
    ? {
        ...DEFAULT_VT_SETTINGS,
        ...raw,
        stimulus: { ...DEFAULT_VT_SETTINGS.stimulus, ...(raw.stimulus ?? {}) },
        staircase: { ...DEFAULT_VT_SETTINGS.staircase, ...(raw.staircase ?? {}) },
        gamification: { ...DEFAULT_VT_SETTINGS.gamification, ...(raw.gamification ?? {}) },
      }
    : { ...DEFAULT_VT_SETTINGS };

  if (modality) {
    return { ...merged, modalities: [modality] };
  }

  if (!merged.modalities?.length) {
    return { ...merged, modalities: DEFAULT_VT_SETTINGS.modalities };
  }

  return merged;
}

export function getVtExerciseDisplayName(exerciseType?: string | null): string {
  const normalized = normalizeExerciseType(exerciseType ?? '');
  switch (normalized) {
    case 'vt-gabor':
      return 'Phi hành gia — Ánh sáng';
    case 'vt-vernier':
      return 'Phi hành gia — Chính xác';
    case 'vt-crowding':
      return 'Phi hành gia — Đám đông';
    case 'vt-stereopsis':
      return 'Phi hành gia — Chiều sâu';
    case 'vt-quest':
      return 'Phi hành gia thị giác (tổng hợp)';
    default:
      return 'Phi hành gia thị giác';
  }
}
