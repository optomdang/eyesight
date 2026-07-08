/**
 * VT Crowding — task-mode helpers (trial meta generation + stage policy).
 *
 * All modes share the spacing-ratio staircase; modes differ in what the
 * patient judges (location, letter ID, matching, odd card, delayed recall,
 * flanker similarity).
 */

import type {
  VtCrowdingStageConfig,
  VtCrowdingTaskMode,
  VtResponseSide,
  VtStimulusCrowdingConfig,
  VtTrial,
} from 'src/types/core/vtQuest';
import { VT_UNLIMITED_TRIALS_PER_STAGE } from './gaborTaskModes';
import {
  pickFlankerLetters,
  pickTargetLetter,
} from '../stimuli/crowdingRenderer';

/** Memorize-phase duration for delayed_letter, in ms. */
export const DELAYED_LETTER_MEMORIZE_MS = 1600;

export const CROWDING_TASK_MODE_LABELS: Record<VtCrowdingTaskMode, string> = {
  location_2afc: 'Tìm chữ ẩn (trái/phải)',
  central_letter_id: 'Nhận diện chữ giữa',
  letter_match_2afc: 'Ghép chữ mẫu',
  odd_letter_out: 'Tìm cụm khác biệt',
  delayed_letter: 'Ghi nhớ chữ giữa',
  flanker_same_different: 'Giống hay khác flankers',
};

export const ALL_CROWDING_TASK_MODES: VtCrowdingTaskMode[] = [
  'location_2afc',
  'central_letter_id',
  'letter_match_2afc',
  'odd_letter_out',
  'delayed_letter',
  'flanker_same_different',
];

export const FLANKER_SAME_LABEL = 'Giống nhau';
export const FLANKER_DIFFERENT_LABEL = 'Khác nhau';

export function getCrowdingModeRotation(
  config: VtStimulusCrowdingConfig | undefined
): VtCrowdingTaskMode[] {
  const rotation = config?.taskModesPerSession?.filter((m) =>
    (ALL_CROWDING_TASK_MODES as string[]).includes(m)
  );
  if (rotation && rotation.length > 0) return rotation;
  return [config?.taskMode ?? 'location_2afc'];
}

export interface CrowdingStageEndPolicy {
  trialsPerStage: number;
  endOnStaircase: boolean;
}

export function resolveCrowdingStageEndPolicy(
  settings: { trialsPerStage: number },
  config: VtStimulusCrowdingConfig | undefined
): CrowdingStageEndPolicy {
  const modes = getCrowdingModeRotation(config);
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

/** Fisher–Yates shuffle (non-mutating). */
function shuffled<T>(items: T[], random: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function resolveCrowdingTaskMode(
  config: VtStimulusCrowdingConfig | undefined,
  stageIndex: number,
  isBoss = false,
  random: () => number = Math.random
): VtCrowdingTaskMode {
  const rotation = getCrowdingModeRotation(config);
  if (rotation.length > 1) {
    if (isBoss) return pickOne(rotation, random);
    return rotation[stageIndex % rotation.length];
  }
  return rotation[0];
}

/** Pick a fresh target + flanker pair for one trial. */
export function buildCrowdingTrialLetters(
  random: () => number = Math.random
): VtCrowdingStageConfig {
  const targetLetter = pickTargetLetter([], random);
  return { targetLetter, flankerLetters: pickFlankerLetters(targetLetter, random) };
}

/**
 * location_2afc keeps one letter set per stage so patients learn which symbol is "special".
 * All other modes randomize target + flankers every trial.
 */
export function crowdingUsesStageFixedLetters(mode: VtCrowdingTaskMode): boolean {
  return mode === 'location_2afc';
}

function resolveTrialLetters(
  mode: VtCrowdingTaskMode,
  stageConfig: VtCrowdingStageConfig,
  random: () => number
): VtCrowdingStageConfig {
  return crowdingUsesStageFixedLetters(mode) ? stageConfig : buildCrowdingTrialLetters(random);
}

function buildLetterMcqMeta(
  mode: VtCrowdingTaskMode,
  targetLetter: string,
  config: VtStimulusCrowdingConfig | undefined,
  random: () => number
): Record<string, unknown> {
  const n = config?.letterOptionCount ?? 4;
  const distractorPool = [
    ...pickFlankerLetters(targetLetter, random),
    pickTargetLetter([targetLetter], random),
    pickTargetLetter([targetLetter, ...pickFlankerLetters(targetLetter, random)], random),
  ].filter((l) => l !== targetLetter);

  const optionsLetters: string[] = [targetLetter];
  while (optionsLetters.length < n) {
    const candidate =
      distractorPool[(optionsLetters.length - 1) % distractorPool.length] ??
      pickTargetLetter([targetLetter, ...optionsLetters], random);
    optionsLetters.push(candidate);
  }

  const shuffledOptions = shuffled(optionsLetters, random);
  const correctIndex = shuffledOptions.indexOf(targetLetter);
  return {
    taskMode: mode,
    targetLetter,
    optionsLetters: shuffledOptions,
    correctIndex,
  };
}

/**
 * Build per-trial meta for a crowding task mode.
 * location_2afc returns stage letters only — signalSide from trialRunner.
 */
export function buildCrowdingTaskTrialMeta(
  mode: VtCrowdingTaskMode,
  config: VtStimulusCrowdingConfig | undefined,
  stageConfig: VtCrowdingStageConfig,
  random: () => number = Math.random
): Record<string, unknown> {
  const { targetLetter, flankerLetters } = resolveTrialLetters(mode, stageConfig, random);

  if (mode === 'location_2afc') {
    return { targetLetter, flankerLetters };
  }

  if (mode === 'central_letter_id' || mode === 'delayed_letter') {
    return {
      ...buildLetterMcqMeta(mode, targetLetter, config, random),
      flankerLetters,
    };
  }

  if (mode === 'letter_match_2afc') {
    const matchSide: VtResponseSide = random() < 0.5 ? 'left' : 'right';
    const distractorLetter = pickTargetLetter([targetLetter, ...flankerLetters], random);
    const leftTargetLetter = matchSide === 'left' ? targetLetter : distractorLetter;
    const rightTargetLetter = matchSide === 'right' ? targetLetter : distractorLetter;
    return {
      taskMode: mode,
      targetLetter,
      flankerLetters,
      referenceLetter: targetLetter,
      matchSide,
      leftTargetLetter,
      rightTargetLetter,
    };
  }

  if (mode === 'odd_letter_out') {
    const n = config?.cardGridSize ?? 4;
    const oddLetter = pickTargetLetter([targetLetter], random);
    const correctIndex = Math.floor(random() * n);
    const cardTargets = Array.from({ length: n }, (_, i) =>
      i === correctIndex ? oddLetter : targetLetter
    );
    return {
      taskMode: mode,
      targetLetter,
      flankerLetters,
      cardTargets,
      correctIndex,
    };
  }

  if (mode === 'flanker_same_different') {
    const flankersMatchTarget = random() < 0.5;
    const trialFlankers: [string, string] = flankersMatchTarget
      ? [targetLetter, targetLetter]
      : flankerLetters;
    const correctIndex = flankersMatchTarget ? 0 : 1;
    return {
      taskMode: mode,
      targetLetter,
      flankerLetters: trialFlankers,
      flankersMatchTarget,
      correctIndex,
    };
  }

  return { targetLetter, flankerLetters };
}

export function getCrowdingTaskModeFromTrial(
  trial: VtTrial | null | undefined
): VtCrowdingTaskMode {
  const mode = trial?.meta?.taskMode;
  return typeof mode === 'string' && (ALL_CROWDING_TASK_MODES as string[]).includes(mode)
    ? (mode as VtCrowdingTaskMode)
    : 'location_2afc';
}

/** Whether the mode uses left/right response buttons (2AFC canvas). */
export function isCrowdingSideBasedMode(mode: VtCrowdingTaskMode): boolean {
  return mode === 'location_2afc' || mode === 'letter_match_2afc';
}

/** Read matchSide from meta for letter_match_2afc signalSide resolution. */
export function crowdingMatchSideFromMeta(
  meta: Record<string, unknown> | undefined
): VtResponseSide | undefined {
  const side = meta?.matchSide;
  return side === 'left' || side === 'right' ? side : undefined;
}
