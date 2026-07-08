import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createStaircaseState, stepStaircaseEasier } from '../core/staircase';
import { applyTrialTimeout, createTrial } from '../core/trialRunner';
import { useTrialResponseTimeout } from '../gamification/useTrialResponseTimeout';
import { getInactivityThresholdMs } from 'src/utils/exerciseDuration';

const GABOR_PARAMS = {
  startValue: 0.4,
  stepSize: 0.1,
  stepHalveAfterReversals: 4,
  minValue: 0.02,
  maxValue: 1.0,
};

describe('stepStaircaseEasier', () => {
  it('increases contrast value by one step (easier for gabor)', () => {
    const state = createStaircaseState(GABOR_PARAMS);
    const next = stepStaircaseEasier(state, GABOR_PARAMS);
    expect(next.currentValue).toBeCloseTo(0.5);
    expect(next.trialCount).toBe(state.trialCount);
    expect(next.reversalCount).toBe(state.reversalCount);
  });

  it('clamps at maxValue', () => {
    const state = { ...createStaircaseState(GABOR_PARAMS), currentValue: 0.98 };
    const next = stepStaircaseEasier(state, GABOR_PARAMS);
    expect(next.currentValue).toBe(GABOR_PARAMS.maxValue);
  });
});

describe('applyTrialTimeout', () => {
  it('eases staircase without appending a trial', () => {
    const session = {
      currentWorld: 'gabor' as const,
      stageIndex: 0,
      completedStages: [],
      staircaseState: createStaircaseState(GABOR_PARAMS),
      currentStageTrials: [],
      totalStars: 0,
      totalCoins: 0,
      currentCombo: 3,
    };
    const trial = createTrial(0, 'gabor', session.staircaseState.currentValue);
    const next = applyTrialTimeout(session, GABOR_PARAMS);
    expect(next.currentStageTrials).toHaveLength(0);
    expect(next.currentCombo).toBe(3);
    expect(next.staircaseState.currentValue).toBeGreaterThan(trial.difficultyValue);
  });
});

describe('getInactivityThresholdMs (shared idle / VT trial timeout)', () => {
  it('defaults to 30 seconds', () => {
    expect(getInactivityThresholdMs(undefined)).toBe(30000);
    expect(getInactivityThresholdMs({ inactivityThreshold: 45 })).toBe(45000);
  });
});

describe('useTrialResponseTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onTimeout after delay when active', () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useTrialResponseTimeout({
        timeoutMs: 5000,
        active: true,
        trialKey: 'trial-1',
        onTimeout,
      })
    );

    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not fire when inactive', () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useTrialResponseTimeout({
        timeoutMs: 1000,
        active: false,
        trialKey: 'trial-1',
        onTimeout,
      })
    );

    vi.advanceTimersByTime(2000);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
