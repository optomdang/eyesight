/**
 * VT Vernier — task-mode helpers (trial meta generation + stage policy).
 *
 * All modes share the arcsec offset staircase; modes differ in what the
 * patient judges (which side, offset direction, relative offset, odd card,
 * delayed recall).
 */

import type {
  VtStimulusVernierConfig,
  VtTrial,
  VtVernierTaskMode,
} from 'src/types/core/vtQuest';
import { VT_UNLIMITED_TRIALS_PER_STAGE } from './gaborTaskModes';

export const DEFAULT_VERNIER_OFFSET_RATIO = 0.5;

/** Memorize-phase duration for delayed_direction, in ms. */
export const DELAYED_DIRECTION_MEMORIZE_MS = 1600;

export const VERNIER_TASK_MODE_LABELS: Record<VtVernierTaskMode, string> = {
  alignment_2afc: 'Tìm bên lệch',
  offset_direction_mcq: 'Hướng lệch',
  greater_offset_2afc: 'Bên lệch nhiều hơn',
  odd_line_out: 'Tìm cặp khác',
  delayed_direction: 'Ghi nhớ hướng lệch',
};

export const ALL_VERNIER_TASK_MODES: VtVernierTaskMode[] = [
  'alignment_2afc',
  'offset_direction_mcq',
  'greater_offset_2afc',
  'odd_line_out',
  'delayed_direction',
];

/** MCQ option indices: 0 = lệch trái, 1 = lệch phải */
export const VERNIER_DIRECTION_OPTION_COUNT = 2;

export function getVernierModeRotation(
  config: VtStimulusVernierConfig | undefined
): VtVernierTaskMode[] {
  const rotation = config?.taskModesPerSession?.filter((m) =>
    (ALL_VERNIER_TASK_MODES as string[]).includes(m)
  );
  if (rotation && rotation.length > 0) return rotation;
  return [config?.taskMode ?? 'alignment_2afc'];
}

export interface VernierStageEndPolicy {
  trialsPerStage: number;
  endOnStaircase: boolean;
}

export function resolveVernierStageEndPolicy(
  settings: { trialsPerStage: number },
  config: VtStimulusVernierConfig | undefined
): VernierStageEndPolicy {
  const modes = getVernierModeRotation(config);
  if (modes.length === 1) {
    return { trialsPerStage: VT_UNLIMITED_TRIALS_PER_STAGE, endOnStaircase: false };
  }
  return {
    trialsPerStage: settings.trialsPerStage,
    endOnStaircase: false,
  };
}

function pickOne<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

export function resolveVernierTaskMode(
  config: VtStimulusVernierConfig | undefined,
  stageIndex: number,
  isBoss = false,
  random: () => number = Math.random
): VtVernierTaskMode {
  const rotation = getVernierModeRotation(config);
  if (rotation.length > 1) {
    if (isBoss) return pickOne(rotation, random);
    return rotation[stageIndex % rotation.length];
  }
  return rotation[0];
}

/**
 * Build per-trial meta for a vernier task mode.
 * alignment_2afc returns {} — legacy signalSide + trialRunner offsetSign.
 */
export function buildVernierTaskTrialMeta(
  mode: VtVernierTaskMode,
  config: VtStimulusVernierConfig | undefined,
  random: () => number = Math.random
): Record<string, unknown> {
  if (mode === 'alignment_2afc') return {};

  if (mode === 'offset_direction_mcq' || mode === 'delayed_direction') {
    const offsetSign: 1 | -1 = random() < 0.5 ? -1 : 1;
    const correctIndex = offsetSign === -1 ? 0 : 1;
    return { taskMode: mode, offsetSign, correctIndex };
  }

  if (mode === 'greater_offset_2afc') {
    return {
      taskMode: mode,
      distractorOffsetRatio: config?.offsetRatio ?? DEFAULT_VERNIER_OFFSET_RATIO,
    };
  }

  if (mode === 'odd_line_out') {
    const n = 4;
    const commonSign: 1 | -1 = random() < 0.5 ? -1 : 1;
    const correctIndex = Math.floor(random() * n);
    const cardOffsetSigns: (1 | -1)[] = Array.from({ length: n }, (_, i) =>
      i === correctIndex ? (commonSign === 1 ? -1 : 1) : commonSign
    );
    return { taskMode: mode, cardOffsetSigns, correctIndex };
  }

  return {};
}

export function getVernierTaskModeFromTrial(trial: VtTrial | null | undefined): VtVernierTaskMode {
  const mode = trial?.meta?.taskMode;
  return typeof mode === 'string' && (ALL_VERNIER_TASK_MODES as string[]).includes(mode)
    ? (mode as VtVernierTaskMode)
    : 'alignment_2afc';
}

/** Whether the mode uses left/right response buttons (2AFC canvas). */
export function isVernierSideBasedMode(mode: VtVernierTaskMode): boolean {
  return mode === 'alignment_2afc' || mode === 'greater_offset_2afc';
}

/** Whether trialRunner should inject a random offsetSign into meta. */
export function vernierNeedsRandomOffsetSign(mode: VtVernierTaskMode): boolean {
  return mode === 'alignment_2afc' || mode === 'greater_offset_2afc';
}
