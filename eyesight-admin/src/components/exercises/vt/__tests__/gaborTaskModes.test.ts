import { describe, it, expect } from 'vitest';
import {
  resolveGaborTaskMode,
  buildGaborTaskTrialMeta,
  getGaborTaskModeFromTrial,
  isSideBasedMode,
  isVtResponseCorrect,
  orientationLabel,
  GABOR_ORIENTATIONS_2,
  GABOR_ORIENTATIONS_4,
  getGaborModeRotation,
  resolveGaborStageEndPolicy,
  VT_UNLIMITED_TRIALS_PER_STAGE,
} from '../core/gaborTaskModes';
import { createTrial, recordResponse } from '../core/trialRunner';
import type { VtStimulusGaborConfig, VtTrial } from 'src/types/core/vtQuest';

const baseConfig: VtStimulusGaborConfig = {
  sfCpD: 3,
  orientation: 'vertical',
  sigmaDeg: 0.5,
};

function trialWithMeta(meta: Record<string, unknown>): VtTrial {
  return {
    trialIndex: 0,
    world: 'gabor',
    signalSide: 'left',
    response: null,
    correct: null,
    difficultyValue: 0.5,
    reactionTimeMs: null,
    meta,
  };
}

describe('resolveGaborTaskMode', () => {
  it('defaults to location_2afc without config', () => {
    expect(resolveGaborTaskMode(undefined, 0)).toBe('location_2afc');
    expect(resolveGaborTaskMode(baseConfig, 3)).toBe('location_2afc');
  });

  it('uses fixed taskMode when set', () => {
    expect(resolveGaborTaskMode({ ...baseConfig, taskMode: 'orientation_id' }, 2)).toBe(
      'orientation_id'
    );
  });

  it('rotates taskModesPerSession by stage index', () => {
    const config: VtStimulusGaborConfig = {
      ...baseConfig,
      taskModesPerSession: ['location_2afc', 'orientation_id', 'odd_one_out'],
    };
    expect(resolveGaborTaskMode(config, 0)).toBe('location_2afc');
    expect(resolveGaborTaskMode(config, 1)).toBe('orientation_id');
    expect(resolveGaborTaskMode(config, 2)).toBe('odd_one_out');
    expect(resolveGaborTaskMode(config, 3)).toBe('location_2afc');
  });

  it('boss stage picks a random mode from the rotation list', () => {
    const config: VtStimulusGaborConfig = {
      ...baseConfig,
      taskModesPerSession: ['orientation_id', 'odd_one_out'],
    };
    expect(resolveGaborTaskMode(config, 4, true, () => 0.1)).toBe('orientation_id');
    expect(resolveGaborTaskMode(config, 4, true, () => 0.9)).toBe('odd_one_out');
  });
});

describe('buildGaborTaskTrialMeta', () => {
  it('returns empty meta for location_2afc (legacy path)', () => {
    expect(buildGaborTaskTrialMeta('location_2afc', baseConfig)).toEqual({});
  });

  it('orientation_id: correctIndex within options, target matches option', () => {
    const meta = buildGaborTaskTrialMeta('orientation_id', baseConfig, () => 0.6);
    const options = meta.optionsDeg as number[];
    const idx = meta.correctIndex as number;
    expect(options).toEqual(GABOR_ORIENTATIONS_4);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(options.length);
    expect(meta.targetOrientationDeg).toBe(options[idx]);
  });

  it('orientation_id respects orientationCount 2', () => {
    const meta = buildGaborTaskTrialMeta(
      'orientation_id',
      { ...baseConfig, orientationCount: 2 },
      () => 0.4
    );
    expect(meta.optionsDeg).toEqual(GABOR_ORIENTATIONS_2);
  });

  it('orientation_match: exactly 2 target cards sharing the same orientation', () => {
    for (let seed = 0; seed < 10; seed++) {
      let n = seed;
      const rnd = () => {
        n = (n * 9301 + 49297) % 233280;
        return n / 233280;
      };
      const meta = buildGaborTaskTrialMeta('orientation_match', baseConfig, rnd);
      const cards = meta.cardOrientations as number[];
      const targets = meta.targetIndices as number[];
      expect(cards).toHaveLength(4);
      expect(targets).toHaveLength(2);
      const [a, b] = targets;
      expect(cards[a]).toBe(cards[b]);
      // No distractor shares the pair orientation
      cards.forEach((deg, idx) => {
        if (!targets.includes(idx)) expect(deg).not.toBe(cards[a]);
      });
    }
  });

  it('orientation_match respects cardGridSize 6', () => {
    const meta = buildGaborTaskTrialMeta(
      'orientation_match',
      { ...baseConfig, cardGridSize: 6 },
      () => 0.3
    );
    expect(meta.cardOrientations as number[]).toHaveLength(6);
    expect(meta.targetIndices as number[]).toHaveLength(2);
  });

  it('odd_one_out: exactly one card differs at correctIndex', () => {
    const meta = buildGaborTaskTrialMeta('odd_one_out', baseConfig, () => 0.7);
    const cards = meta.cardOrientations as number[];
    const idx = meta.correctIndex as number;
    const oddDeg = cards[idx];
    cards.forEach((deg, i) => {
      if (i === idx) return;
      expect(deg).not.toBe(oddDeg);
    });
    const common = cards.filter((_, i) => i !== idx);
    expect(new Set(common).size).toBe(1);
  });

  it('sf_discrimination: has ratio and orientation', () => {
    const meta = buildGaborTaskTrialMeta('sf_discrimination', baseConfig, () => 0.2);
    expect(meta.taskMode).toBe('sf_discrimination');
    expect(meta.sfRatio).toBeGreaterThan(1);
    expect(GABOR_ORIENTATIONS_4).toContain(meta.orientationDeg);
  });

  it('delayed_match: same structure as orientation_id', () => {
    const meta = buildGaborTaskTrialMeta('delayed_match', baseConfig, () => 0.9);
    expect(meta.taskMode).toBe('delayed_match');
    expect(meta.targetOrientationDeg).toBe(
      (meta.optionsDeg as number[])[meta.correctIndex as number]
    );
  });
});

describe('getGaborTaskModeFromTrial / isSideBasedMode', () => {
  it('legacy trials without taskMode map to location_2afc', () => {
    expect(getGaborTaskModeFromTrial(trialWithMeta({ phaseRad: 1 }))).toBe('location_2afc');
    expect(getGaborTaskModeFromTrial(null)).toBe('location_2afc');
  });

  it('reads taskMode from meta', () => {
    expect(getGaborTaskModeFromTrial(trialWithMeta({ taskMode: 'odd_one_out' }))).toBe(
      'odd_one_out'
    );
  });

  it('side-based modes are location_2afc and sf_discrimination', () => {
    expect(isSideBasedMode('location_2afc')).toBe(true);
    expect(isSideBasedMode('sf_discrimination')).toBe(true);
    expect(isSideBasedMode('orientation_id')).toBe(false);
    expect(isSideBasedMode('orientation_match')).toBe(false);
  });
});

describe('isVtResponseCorrect', () => {
  it('side response compares against signalSide', () => {
    const trial = trialWithMeta({});
    expect(isVtResponseCorrect(trial, 'left')).toBe(true);
    expect(isVtResponseCorrect(trial, 'right')).toBe(false);
  });

  it('index response compares against meta.correctIndex (coerces string index from JSON)', () => {
    const trial = trialWithMeta({
      taskMode: 'orientation_id',
      correctIndex: 2,
      targetOrientationDeg: 90,
      optionsDeg: GABOR_ORIENTATIONS_4,
    });
    expect(isVtResponseCorrect(trial, { index: 2 })).toBe(true);
    expect(isVtResponseCorrect(trial, { index: 0 })).toBe(false);

    const fromJson = trialWithMeta({
      taskMode: 'orientation_id',
      correctIndex: '3' as unknown as number,
      targetOrientationDeg: '135' as unknown as number,
      optionsDeg: GABOR_ORIENTATIONS_4,
    });
    expect(isVtResponseCorrect(fromJson, { index: 3 })).toBe(true);
    expect(isVtResponseCorrect(fromJson, { index: 3, orientationDeg: 135 })).toBe(true);
    expect(isVtResponseCorrect(fromJson, { index: 1, orientationDeg: 135 })).toBe(true);
  });

  it('indices response is order-insensitive set equality', () => {
    const trial = trialWithMeta({ taskMode: 'orientation_match', targetIndices: [3, 1] });
    expect(isVtResponseCorrect(trial, { indices: [1, 3] })).toBe(true);
    expect(isVtResponseCorrect(trial, { indices: [3, 1] })).toBe(true);
    expect(isVtResponseCorrect(trial, { indices: [1, 2] })).toBe(false);
    expect(isVtResponseCorrect(trial, { indices: [1] })).toBe(false);
  });
});

describe('recordResponse with task-mode responses', () => {
  it('stores responseIndex and scores via correctIndex', () => {
    const trial = createTrial(
      0,
      'gabor',
      0.5,
      { taskMode: 'orientation_id', optionsDeg: GABOR_ORIENTATIONS_4, correctIndex: 1 },
      () => 0.5
    );
    const done = recordResponse(trial, { index: 1 }, 800);
    expect(done.correct).toBe(true);
    expect(done.responseIndex).toBe(1);
    expect(done.response).toBeNull();
  });

  it('stores responseIndices for match cards', () => {
    const trial = createTrial(
      0,
      'gabor',
      0.5,
      { taskMode: 'orientation_match', cardOrientations: [0, 45, 0, 90], targetIndices: [0, 2] },
      () => 0.5
    );
    const wrong = recordResponse(trial, { indices: [0, 1] }, 900);
    expect(wrong.correct).toBe(false);
    expect(wrong.responseIndices).toEqual([0, 1]);

    const right = recordResponse(trial, { indices: [2, 0] }, 900);
    expect(right.correct).toBe(true);
  });

  it('legacy side response still works unchanged', () => {
    const trial = createTrial(0, 'gabor', 0.5, undefined, () => 0.2); // signalSide left
    const done = recordResponse(trial, 'left', 500);
    expect(done.correct).toBe(true);
    expect(done.response).toBe('left');
  });
});

describe('orientationLabel', () => {
  it('labels all 4 canonical orientations', () => {
    expect(orientationLabel(0)).toBe('Dọc');
    expect(orientationLabel(90)).toBe('Ngang');
    expect(orientationLabel(45)).toContain('Chéo');
    expect(orientationLabel(135)).toContain('Chéo');
  });
});

describe('getGaborModeRotation', () => {
  it('preserves configured rotation order', () => {
    expect(
      getGaborModeRotation({
        ...baseConfig,
        taskModesPerSession: ['odd_one_out', 'location_2afc', 'orientation_id'],
      })
    ).toEqual(['odd_one_out', 'location_2afc', 'orientation_id']);
  });

  it('falls back to taskMode when only one mode', () => {
    expect(getGaborModeRotation({ ...baseConfig, taskMode: 'delayed_match' })).toEqual([
      'delayed_match',
    ]);
  });
});

describe('resolveGaborStageEndPolicy', () => {
  it('single mode → unlimited trials, no staircase stage end', () => {
    const policy = resolveGaborStageEndPolicy(
      { trialsPerStage: 10 },
      { ...baseConfig, taskMode: 'orientation_id' }
    );
    expect(policy.trialsPerStage).toBe(VT_UNLIMITED_TRIALS_PER_STAGE);
    expect(policy.endOnStaircase).toBe(false);
  });

  it('multi mode → configured trialsPerStage, no staircase stage end', () => {
    const policy = resolveGaborStageEndPolicy(
      { trialsPerStage: 17 },
      {
        ...baseConfig,
        taskModesPerSession: ['location_2afc', 'orientation_id'],
      }
    );
    expect(policy.trialsPerStage).toBe(17);
    expect(policy.endOnStaircase).toBe(false);
  });
});
