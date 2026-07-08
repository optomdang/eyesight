import { describe, it, expect } from 'vitest';
import { buildStaircaseForStage } from '../useVtQuestEngine';
import { isStageDone, applyResponse, createTrial } from 'src/components/exercises/vt/core/trialRunner';
import { createStaircaseState } from 'src/components/exercises/vt/core/staircase';
import { DEFAULT_VT_SETTINGS } from 'src/types/core/vtQuest';

describe('buildStaircaseForStage', () => {
  it('starts each stage with a fresh staircase (reversalCount = 0)', () => {
    const { staircaseState } = buildStaircaseForStage('gabor', DEFAULT_VT_SETTINGS, 4, 0.8);
    expect(staircaseState.reversalCount).toBe(0);
    expect(staircaseState.trialCount).toBe(0);
    expect(staircaseState.currentValue).toBe(0.8);
  });
});

describe('stage trial count with staircase carry-over', () => {
  const params = {
    startValue: 0.8,
    stepSize: 0.08,
    stepHalveAfterReversals: 2,
    minValue: 0.02,
    maxValue: 1,
    minReversals: 6,
    maxTrials: 20,
  };

  it('stale staircase from a prior stage ends the next stage after one trial (bug)', () => {
    const stale = createStaircaseState(params);
    const staleState = { ...stale, reversalCount: 6, trialCount: 10 };

    const session = {
      currentWorld: 'gabor' as const,
      stageIndex: 2,
      completedStages: [],
      staircaseState: staleState,
      currentStageTrials: [] as ReturnType<typeof createTrial>[],
      totalStars: 0,
      totalCoins: 0,
      currentCombo: 0,
    };

    const trial = createTrial(0, 'gabor', staleState.currentValue);
    const afterOne = applyResponse(session, trial, 'left', 500, params);

    expect(isStageDone(afterOne, 10, params)).toBe(true);
    expect(afterOne.currentStageTrials).toHaveLength(1);
  });

  it('fresh staircase allows up to trialsPerStage before stage ends', () => {
    const { staircaseState } = buildStaircaseForStage('gabor', DEFAULT_VT_SETTINGS, 2, 0.8);
    const gaborParams = {
      ...params,
      stepSize: DEFAULT_VT_SETTINGS.staircase.stepSize,
      minReversals: DEFAULT_VT_SETTINGS.staircase.minReversals,
      maxTrials: DEFAULT_VT_SETTINGS.staircase.maxTrials,
    };

    let session = {
      currentWorld: 'gabor' as const,
      stageIndex: 2,
      completedStages: [],
      staircaseState,
      currentStageTrials: [] as ReturnType<typeof createTrial>[],
      totalStars: 0,
      totalCoins: 0,
      currentCombo: 0,
    };

    for (let i = 0; i < 9; i++) {
      const trial = createTrial(i, 'gabor', session.staircaseState.currentValue, undefined, () => 0.1);
      session = applyResponse(session, trial, trial.signalSide!, 500, gaborParams);
      expect(isStageDone(session, 10, gaborParams)).toBe(false);
    }

    const lastTrial = createTrial(9, 'gabor', session.staircaseState.currentValue, undefined, () => 0.1);
    session = applyResponse(session, lastTrial, lastTrial.signalSide!, 500, gaborParams);
    expect(isStageDone(session, 10, gaborParams)).toBe(true);
    expect(session.currentStageTrials).toHaveLength(10);
  });
});
