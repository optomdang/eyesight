import { describe, it, expect } from 'vitest';
import { buildVtPauseSnapshot, parseVtPauseSnapshot } from '../core/vtPauseSnapshot';
import type { VtSessionState } from 'src/types/core/vtQuest';

const baseSession: VtSessionState = {
  currentWorld: 'gabor',
  stageIndex: 2,
  completedStages: [],
  staircaseState: {
    currentValue: 0.4,
    lastDirection: 1,
    reversalCount: 0,
    reversalValues: [],
    trialCount: 3,
    stepSize: 0.1,
  },
  currentStageTrials: [],
  totalStars: 5,
  totalCoins: 120,
  currentCombo: 2,
};

describe('vtPauseSnapshot', () => {
  it('round-trips full engine overlay through build/parse', () => {
    const built = buildVtPauseSnapshot({
      session: baseSession,
      screen: 'trial',
      currentTrial: {
        trialIndex: 3,
        world: 'gabor',
        signalSide: 'left',
        response: null,
        correct: null,
        difficultyValue: 0.4,
        reactionTimeMs: null,
      },
      isPendingResponse: true,
      stimulusVisible: true,
      lastStageResult: null,
      crowdingStageConfig: null,
      isBossStage: false,
    });

    const parsed = parseVtPauseSnapshot(built);
    expect(parsed).not.toBeNull();
    expect(parsed?.vtScreen).toBe('trial');
    expect(parsed?.totalStars).toBe(5);
    expect(parsed?.currentTrial?.trialIndex).toBe(3);
    expect(parsed?.isPendingResponse).toBe(true);
  });

  it('parses legacy session-only exerciseState', () => {
    const parsed = parseVtPauseSnapshot(baseSession);
    expect(parsed?.currentWorld).toBe('gabor');
    expect(parsed?.stageIndex).toBe(2);
    expect(parsed?.vtScreen).toBe('world-map');
  });
});
