/**
 * VT Quest — Transformed 1-up/1-down staircase algorithm.
 *
 * Targets 50% correct detection (unbiased).
 * Step halves after `stepHalveAfterReversals` reversals for finer tracking.
 * Threshold = mean of reversal values when ≥ minReversals reached.
 */

import type { VtStaircaseState, VtStaircaseParams } from 'src/types/core/vtQuest';

export function createStaircaseState(params: VtStaircaseParams): VtStaircaseState {
  return {
    currentValue: params.startValue,
    lastDirection: -1,
    reversalCount: 0,
    reversalValues: [],
    trialCount: 0,
    stepSize: params.stepSize,
  };
}

/**
 * Advance staircase after a trial response.
 * Returns updated state (immutable — original not mutated).
 *
 * @param state - current staircase state
 * @param correct - whether the patient got this trial correct
 * @param params - staircase parameters
 */
export function advanceStaircase(
  state: VtStaircaseState,
  correct: boolean,
  params: VtStaircaseParams
): VtStaircaseState {
  const next = { ...state, reversalValues: [...state.reversalValues], trialCount: state.trialCount + 1 };

  // 1-up/1-down: correct → make harder (decrease value), wrong → make easier (increase)
  const newDirection: 1 | -1 = correct ? 1 : -1;

  const isReversal = next.trialCount > 1 && newDirection !== state.lastDirection;

  let newStepSize = next.stepSize;
  if (isReversal) {
    next.reversalCount += 1;
    next.reversalValues.push(next.currentValue);
    // Halve step after threshold crossings
    if (next.reversalCount === params.stepHalveAfterReversals) {
      newStepSize = Math.max(params.stepSize / 4, 0.005);
    }
  }

  // Move in correct direction; clamp to valid range
  const delta = newDirection === 1 ? -newStepSize : newStepSize;
  const newValue = Math.min(params.maxValue, Math.max(params.minValue, next.currentValue + delta));

  return {
    ...next,
    currentValue: newValue,
    lastDirection: newDirection,
    stepSize: newStepSize,
  };
}

/**
 * Compute threshold estimate from reversal values.
 * Uses mean of last N reversals (excludes first 2 if enough data).
 * Returns null if not enough reversals yet.
 */
export function computeThreshold(
  state: VtStaircaseState,
  minReversals: number
): number | null {
  const { reversalValues } = state;
  if (reversalValues.length < minReversals) return null;

  // Exclude first 2 reversals (transient phase)
  const trimmed = reversalValues.length > 4 ? reversalValues.slice(2) : reversalValues;
  const sum = trimmed.reduce((acc, v) => acc + v, 0);
  return sum / trimmed.length;
}

/**
 * Whether the staircase block should terminate.
 */
export function isStaircaseDone(state: VtStaircaseState, params: VtStaircaseParams & { minReversals: number; maxTrials: number }): boolean {
  return (
    state.reversalCount >= params.minReversals ||
    state.trialCount >= params.maxTrials
  );
}

/**
 * One easier step when the patient does not respond in time.
 * Does not count as a trial or affect reversal tracking.
 */
export function stepStaircaseEasier(
  state: VtStaircaseState,
  params: VtStaircaseParams
): VtStaircaseState {
  const delta = state.stepSize;
  const newValue = Math.min(params.maxValue, Math.max(params.minValue, state.currentValue + delta));
  return { ...state, currentValue: newValue };
}
