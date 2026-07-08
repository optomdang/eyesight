/**
 * VT Stereopsis — task-mode helpers (trial meta generation + stage policy).
 *
 * All modes share the arcsec disparity staircase; modes differ in what the
 * patient judges (floating shape ID, float position, digit ID).
 */

import type {
  VtStereopsisTaskMode,
  VtStimulusStereopsisConfig,
  VtTrial,
} from 'src/types/core/vtQuest';
import { ALL_INTRO_SHAPE_TYPES, type GeoShapeType } from 'src/utils/stereopsis/stereopsisEngine';
import { VT_UNLIMITED_TRIALS_PER_STAGE } from './gaborTaskModes';

const INTRO_SHAPES = ALL_INTRO_SHAPE_TYPES;
const FLOAT_SHAPES: GeoShapeType[] = ['square', 'circle'];

export const STEREOPSIS_TASK_MODE_LABELS: Record<VtStereopsisTaskMode, string> = {
  shape_id: 'Nhận hình nổi',
  float_position: 'Tìm ô có hình nổi',
  digit_id: 'Nhận chữ số nổi',
};

export const ALL_STEREOPSIS_TASK_MODES: VtStereopsisTaskMode[] = [
  'shape_id',
  'float_position',
  'digit_id',
];

export const STEREOPSIS_SHAPE_LABELS: Record<string, string> = {
  star: 'Ngôi sao',
  triangle: 'Tam giác',
  square: 'Vuông',
  circle: 'Tròn',
  diamond: 'Hình thoi',
  rect: 'Chữ nhật',
  heart: 'Trái tim',
  plus: 'Dấu +',
};

export const STEREOPSIS_SHAPE_ICONS: Record<string, string> = {
  star: '★',
  triangle: '▲',
  square: '■',
  circle: '⬤',
  diamond: '◆',
  rect: '▬',
  heart: '♥',
  plus: '＋',
};

export const STEREOPSIS_POSITION_LABELS = ['Ô 1', 'Ô 2', 'Ô 3', 'Ô 4', 'Ô 5'];

export function getStereopsisModeRotation(
  config: VtStimulusStereopsisConfig | undefined
): VtStereopsisTaskMode[] {
  const rotation = config?.taskModesPerSession?.filter((m) =>
    (ALL_STEREOPSIS_TASK_MODES as string[]).includes(m)
  );
  if (rotation && rotation.length > 0) return rotation;
  return [config?.taskMode ?? 'shape_id'];
}

export interface StereopsisStageEndPolicy {
  trialsPerStage: number;
  endOnStaircase: boolean;
}

export function resolveStereopsisStageEndPolicy(
  settings: { trialsPerStage: number },
  config: VtStimulusStereopsisConfig | undefined
): StereopsisStageEndPolicy {
  const modes = getStereopsisModeRotation(config);
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

function shuffled<T>(items: T[], random: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function resolveStereopsisTaskMode(
  config: VtStimulusStereopsisConfig | undefined,
  stageIndex: number,
  isBoss = false,
  random: () => number = Math.random
): VtStereopsisTaskMode {
  const rotation = getStereopsisModeRotation(config);
  if (rotation.length > 1) {
    if (isBoss) return pickOne(rotation, random);
    return rotation[stageIndex % rotation.length];
  }
  return rotation[0];
}

export function buildStereopsisRngSeed(random: () => number = Math.random): number {
  return Math.floor(random() * 2147483645) + 1;
}

/**
 * Build per-trial meta for a stereopsis task mode.
 * Arcsec disparity is stored on trial.difficultyValue (staircase).
 */
export function buildStereopsisTaskTrialMeta(
  mode: VtStereopsisTaskMode,
  config: VtStimulusStereopsisConfig | undefined,
  random: () => number = Math.random
): Record<string, unknown> {
  const rngSeed = buildStereopsisRngSeed(random);

  if (mode === 'shape_id') {
    const shapeType = pickOne(INTRO_SHAPES, random);
    const maxOptions = INTRO_SHAPES.length;
    const requested = config?.shapeOptionCount ?? maxOptions;
    const optionCount = Math.max(3, Math.min(requested, maxOptions));

    let optionShapeIds: string[];
    if (optionCount >= maxOptions) {
      optionShapeIds = shuffled([...INTRO_SHAPES], random);
    } else {
      const distractors = INTRO_SHAPES.filter((s) => s !== shapeType);
      const picked = shuffled(distractors, random).slice(0, optionCount - 1);
      optionShapeIds = shuffled([shapeType, ...picked], random);
    }

    const correctIndex = optionShapeIds.indexOf(shapeType);
    return {
      taskMode: mode,
      rngSeed,
      shapeType,
      optionShapeIds,
      correctIndex,
    };
  }

  if (mode === 'float_position') {
    const positionCount = config?.positionCount ?? 5;
    const floatAt = Math.floor(random() * positionCount);
    const floatShape = pickOne(FLOAT_SHAPES, random);
    return {
      taskMode: mode,
      rngSeed,
      floatAt,
      floatShape,
      positionCount,
      correctIndex: floatAt,
    };
  }

  // digit_id
  const digit = Math.floor(random() * 10);
  const optionDigits = shuffled(
    Array.from({ length: 10 }, (_, i) => i),
    random
  );
  const correctIndex = optionDigits.indexOf(digit);
  return {
    taskMode: mode,
    rngSeed,
    digit,
    optionDigits,
    correctIndex,
  };
}

export function getStereopsisTaskModeFromTrial(
  trial: VtTrial | null | undefined
): VtStereopsisTaskMode {
  const mode = trial?.meta?.taskMode;
  return typeof mode === 'string' && (ALL_STEREOPSIS_TASK_MODES as string[]).includes(mode)
    ? (mode as VtStereopsisTaskMode)
    : 'shape_id';
}
