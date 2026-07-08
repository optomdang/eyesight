/**
 * VT Quest — Trial Runner state machine.
 *
 * Manages the sequence: ISI → show stimulus → await response → feedback → next trial.
 * Keeps trial state; delegates staircase logic to staircase.ts.
 */

import type {
  VtTrial,
  VtSessionState,
  VtWorld,
  VtResponseSide,
  VtStageResult,
  VtTrialResponseInput,
} from 'src/types/core/vtQuest';
import {
  advanceStaircase,
  isStaircaseDone,
  computeThreshold,
  stepStaircaseEasier,
} from './staircase';
import { isVtResponseCorrect } from './gaborTaskModes';
import type { VtVernierTaskMode } from 'src/types/core/vtQuest';
import { vernierNeedsRandomOffsetSign } from './vernierTaskModes';
import { crowdingMatchSideFromMeta } from './crowdingTaskModes';
import { computeTrialReward, computeCoins } from '../gamification/rewards';
import type { VtStaircaseParams } from 'src/types/core/vtQuest';

/** Randomly choose left or right for the signal side */
export function randomSignalSide(random: () => number = Math.random): VtResponseSide {
  return random() < 0.5 ? 'left' : 'right';
}

/** Random carrier phase so Gabor stripes differ each trial at the same contrast. */
export function randomGaborPhase(random: () => number = Math.random): number {
  return random() * 2 * Math.PI;
}

/** Random horizontal offset direction for Vernier (left vs right misalignment). */
export function randomVernierOffsetSign(random: () => number = Math.random): 1 | -1 {
  return random() < 0.5 ? 1 : -1;
}

function buildTrialMeta(
  world: VtWorld,
  meta: Record<string, unknown> | undefined,
  random: () => number
): Record<string, unknown> | undefined {
  if (world === 'gabor') {
    return { ...meta, phaseRad: randomGaborPhase(random) };
  }
  if (world === 'vernier') {
    const taskMode = meta?.taskMode as string | undefined;
    const mode = (taskMode ?? 'alignment_2afc') as VtVernierTaskMode;
    const needsOffsetSign =
      vernierNeedsRandomOffsetSign(mode) && meta?.offsetSign !== -1 && meta?.offsetSign !== 1;
    if (needsOffsetSign) {
      return { ...meta, offsetSign: randomVernierOffsetSign(random) };
    }
    return meta;
  }
  return meta;
}

/**
 * Build a new blank trial at the current difficulty level.
 * @param meta - optional modality-specific metadata (e.g. crowding letters)
 */
export function createTrial(
  trialIndex: number,
  world: VtWorld,
  currentValue: number,
  meta?: Record<string, unknown>,
  random: () => number = Math.random
): VtTrial {
  const trialMeta = buildTrialMeta(world, meta, random);
  const matchSide = crowdingMatchSideFromMeta(trialMeta);
  return {
    trialIndex,
    world,
    signalSide: matchSide ?? randomSignalSide(random),
    response: null,
    correct: null,
    difficultyValue: currentValue,
    reactionTimeMs: null,
    ...(trialMeta ? { meta: trialMeta } : {}),
  };
}

/**
 * Record a response on the current trial.
 * Accepts side-based (2AFC), index (MCQ / odd-one-out) or indices (match cards).
 * Returns the completed trial (immutable).
 */
export function recordResponse(
  trial: VtTrial,
  response: VtTrialResponseInput,
  reactionTimeMs: number
): VtTrial {
  const correct = isVtResponseCorrect(trial, response);
  if (typeof response === 'string') {
    return { ...trial, response, correct, reactionTimeMs };
  }
  if ('index' in response) {
    return { ...trial, response: null, responseIndex: response.index, correct, reactionTimeMs };
  }
  return { ...trial, response: null, responseIndices: response.indices, correct, reactionTimeMs };
}

/**
 * Compute star rating for a completed stage.
 * 3 stars: ≥80% correct  /  2 stars: ≥65%  /  1 star: else
 */
export function computeStars(accuracy: number): 0 | 1 | 2 | 3 {
  if (accuracy >= 0.8) return 3;
  if (accuracy >= 0.65) return 2;
  return 1;
}

/**
 * Finalize a stage: compute threshold, stars, coins; return VtStageResult.
 */
export function finalizeStage(
  world: VtWorld,
  stageIndex: number,
  trials: VtTrial[],
  session: VtSessionState,
  staircaseParams: VtStaircaseParams & { minReversals: number }
): VtStageResult {
  const correct = trials.filter((t) => t.correct).length;
  const accuracy = trials.length > 0 ? correct / trials.length : 0;
  const threshold = computeThreshold(session.staircaseState, staircaseParams.minReversals);

  // Track max combo from trial sequence
  let maxCombo = 0;
  let runCombo = 0;
  for (const t of trials) {
    if (t.correct) {
      runCombo += 1;
      if (runCombo > maxCombo) maxCombo = runCombo;
    } else {
      runCombo = 0;
    }
  }

  const stars = computeStars(accuracy);
  const coins = computeCoins(accuracy, maxCombo);

  return {
    world,
    stageIndex,
    trials,
    threshold,
    accuracy,
    stars,
    coinsEarned: coins,
    maxCombo,
  };
}

/**
 * Check if the current trial stage should end.
 * @param endOnStaircase — when false, only `trialsPerStage` ends the stage (Gabor multi/single-mode policy).
 */
export function isStageDone(
  session: VtSessionState,
  trialsPerStage: number,
  staircaseParams: VtStaircaseParams & { minReversals: number; maxTrials: number },
  options?: { endOnStaircase?: boolean }
): boolean {
  const trialsDone = session.currentStageTrials.length;
  if (trialsDone >= trialsPerStage) return true;
  if (options?.endOnStaircase === false) return false;
  return isStaircaseDone(session.staircaseState, staircaseParams);
}

/**
 * Advance session state after a response.
 * Returns new session state (immutable).
 */
export function applyResponse(
  session: VtSessionState,
  trial: VtTrial,
  response: VtTrialResponseInput,
  reactionTimeMs: number,
  staircaseParams: VtStaircaseParams
): VtSessionState {
  const completedTrial = recordResponse(trial, response, reactionTimeMs);
  const newStaircase = advanceStaircase(
    session.staircaseState,
    completedTrial.correct!,
    staircaseParams
  );

  const newTrials = [...session.currentStageTrials, completedTrial];
  const isCombo = completedTrial.correct;
  const newCombo = isCombo ? session.currentCombo + 1 : 0;
  const trialCoins = isCombo ? computeTrialReward(newCombo).totalCoins : 0;

  return {
    ...session,
    currentStageTrials: newTrials,
    staircaseState: newStaircase,
    currentCombo: newCombo,
    totalCoins: session.totalCoins + trialCoins,
  };
}

/**
 * Ease difficulty one step when there is no response within the allotted time.
 * Does not append a trial or change combo / coins.
 */
export function applyTrialTimeout(
  session: VtSessionState,
  staircaseParams: VtStaircaseParams
): VtSessionState {
  return {
    ...session,
    staircaseState: stepStaircaseEasier(session.staircaseState, staircaseParams),
  };
}
