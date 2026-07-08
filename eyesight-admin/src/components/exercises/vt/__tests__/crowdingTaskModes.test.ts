import { describe, it, expect } from 'vitest';
import {
  resolveCrowdingTaskMode,
  buildCrowdingTaskTrialMeta,
  getCrowdingTaskModeFromTrial,
  isCrowdingSideBasedMode,
  getCrowdingModeRotation,
  resolveCrowdingStageEndPolicy,
} from '../core/crowdingTaskModes';
import { VT_UNLIMITED_TRIALS_PER_STAGE } from '../core/gaborTaskModes';
import { createTrial, recordResponse } from '../core/trialRunner';
import { isVtResponseCorrect } from '../core/gaborTaskModes';
import type { VtCrowdingStageConfig, VtStimulusCrowdingConfig, VtTrial } from 'src/types/core/vtQuest';

const stageConfig: VtCrowdingStageConfig = {
  targetLetter: 'E',
  flankerLetters: ['B', 'H'],
};

function trialWithMeta(meta: Record<string, unknown>, signalSide: 'left' | 'right' = 'left'): VtTrial {
  return {
    trialIndex: 0,
    world: 'crowding',
    signalSide,
    response: null,
    correct: null,
    difficultyValue: 1.2,
    reactionTimeMs: null,
    meta,
  };
}

describe('resolveCrowdingTaskMode', () => {
  it('defaults to location_2afc without config', () => {
    expect(resolveCrowdingTaskMode(undefined, 0)).toBe('location_2afc');
  });

  it('rotates taskModesPerSession by stage index', () => {
    const config: VtStimulusCrowdingConfig = {
      taskModesPerSession: ['location_2afc', 'central_letter_id', 'odd_letter_out'],
    };
    expect(resolveCrowdingTaskMode(config, 0)).toBe('location_2afc');
    expect(resolveCrowdingTaskMode(config, 1)).toBe('central_letter_id');
    expect(resolveCrowdingTaskMode(config, 2)).toBe('odd_letter_out');
    expect(resolveCrowdingTaskMode(config, 3)).toBe('location_2afc');
  });
});

describe('buildCrowdingTaskTrialMeta', () => {
  it('location_2afc returns stage letters only', () => {
    const meta = buildCrowdingTaskTrialMeta('location_2afc', {}, stageConfig);
    expect(meta).toEqual({
      targetLetter: 'E',
      flankerLetters: ['B', 'H'],
    });
    expect(meta.taskMode).toBeUndefined();
  });

  it('central_letter_id builds MCQ options with correct index', () => {
    const meta = buildCrowdingTaskTrialMeta('central_letter_id', {}, stageConfig, () => 0.5);
    expect(meta.taskMode).toBe('central_letter_id');
    expect(meta.targetLetter).toBeTruthy();
    expect(Array.isArray(meta.optionsLetters)).toBe(true);
    expect(meta.optionsLetters).toHaveLength(4);
    const idx = meta.correctIndex as number;
    expect((meta.optionsLetters as string[])[idx]).toBe(meta.targetLetter);
  });

  it('central_letter_id ignores stage-fixed letters', () => {
    const fixedStage = { targetLetter: 'B', flankerLetters: ['V', 'T'] as [string, string] };
    let seq = 0;
    const rnd = () => {
      seq += 0.17;
      return seq % 1;
    };
    const targets = Array.from({ length: 8 }, () =>
      buildCrowdingTaskTrialMeta('central_letter_id', {}, fixedStage, rnd).targetLetter as string
    );
    expect(targets.some((t) => t !== 'B')).toBe(true);
    expect(new Set(targets).size).toBeGreaterThan(1);
  });

  it('location_2afc keeps stage-fixed letters', () => {
    const meta = buildCrowdingTaskTrialMeta('location_2afc', {}, stageConfig);
    expect(meta.targetLetter).toBe('E');
    expect(meta.flankerLetters).toEqual(['B', 'H']);
  });

  it('letter_match_2afc sets matchSide and per-side targets', () => {
    const meta = buildCrowdingTaskTrialMeta('letter_match_2afc', {}, stageConfig, () => 0.1);
    expect(meta.taskMode).toBe('letter_match_2afc');
    expect(meta.matchSide).toBe('left');
    expect(meta.leftTargetLetter).toBe(meta.referenceLetter);
    expect(meta.rightTargetLetter).not.toBe(meta.referenceLetter);
  });

  it('odd_letter_out has one different card target', () => {
    const meta = buildCrowdingTaskTrialMeta('odd_letter_out', {}, stageConfig, () => 0.99);
    const targets = meta.cardTargets as string[];
    const correctIndex = meta.correctIndex as number;
    const common = meta.targetLetter as string;
    expect(targets).toHaveLength(4);
    expect(targets.filter((t) => t !== common)).toHaveLength(1);
    expect(targets[correctIndex]).not.toBe(common);
  });

  it('flanker_same_different encodes match state in correctIndex', () => {
    const matchMeta = buildCrowdingTaskTrialMeta('flanker_same_different', {}, stageConfig, () => 0.1);
    expect(matchMeta.flankersMatchTarget).toBe(true);
    expect(matchMeta.correctIndex).toBe(0);

    const diffMeta = buildCrowdingTaskTrialMeta('flanker_same_different', {}, stageConfig, () => 0.9);
    expect(diffMeta.flankersMatchTarget).toBe(false);
    expect(diffMeta.correctIndex).toBe(1);
  });
});

describe('stage policy', () => {
  it('single mode → unlimited trials', () => {
    const policy = resolveCrowdingStageEndPolicy({ trialsPerStage: 10 }, { taskMode: 'central_letter_id' });
    expect(policy.trialsPerStage).toBe(VT_UNLIMITED_TRIALS_PER_STAGE);
    expect(policy.endOnStaircase).toBe(false);
  });

  it('multi mode → trialsPerStage cap', () => {
    const policy = resolveCrowdingStageEndPolicy(
      { trialsPerStage: 10 },
      { taskModesPerSession: ['location_2afc', 'central_letter_id'] }
    );
    expect(policy.trialsPerStage).toBe(10);
  });
});

describe('scoring via isVtResponseCorrect', () => {
  it('location_2afc uses signalSide', () => {
    const trial = trialWithMeta({ targetLetter: 'E', flankerLetters: ['B', 'H'] }, 'right');
    expect(isVtResponseCorrect(trial, 'right')).toBe(true);
    expect(isVtResponseCorrect(trial, 'left')).toBe(false);
  });

  it('central_letter_id uses correctIndex', () => {
    const meta = buildCrowdingTaskTrialMeta('central_letter_id', {}, stageConfig, () => 0.5);
    const trial = trialWithMeta(meta);
    const idx = meta.correctIndex as number;
    expect(isVtResponseCorrect(trial, { index: idx })).toBe(true);
    expect(isVtResponseCorrect(trial, { index: (idx + 1) % 4 })).toBe(false);
  });

  it('letter_match_2afc trial uses matchSide as signalSide', () => {
    const meta = buildCrowdingTaskTrialMeta('letter_match_2afc', {}, stageConfig, () => 0.1);
    const trial = createTrial(0, 'crowding', 1.2, meta, () => 0.5);
    expect(trial.signalSide).toBe('left');
    expect(isVtResponseCorrect(trial, 'left')).toBe(true);
    expect(isVtResponseCorrect(trial, 'right')).toBe(false);
  });

  it('getCrowdingTaskModeFromTrial falls back to location_2afc', () => {
    expect(getCrowdingTaskModeFromTrial(trialWithMeta({}))).toBe('location_2afc');
    expect(
      getCrowdingTaskModeFromTrial(trialWithMeta({ taskMode: 'delayed_letter' }))
    ).toBe('delayed_letter');
  });
});

describe('isCrowdingSideBasedMode', () => {
  it('identifies 2AFC modes', () => {
    expect(isCrowdingSideBasedMode('location_2afc')).toBe(true);
    expect(isCrowdingSideBasedMode('letter_match_2afc')).toBe(true);
    expect(isCrowdingSideBasedMode('central_letter_id')).toBe(false);
  });
});

describe('getCrowdingModeRotation', () => {
  it('returns taskMode when no rotation list', () => {
    expect(getCrowdingModeRotation({ taskMode: 'odd_letter_out' })).toEqual(['odd_letter_out']);
  });
});

describe('recordResponse', () => {
  it('records index response for MCQ modes', () => {
    const meta = buildCrowdingTaskTrialMeta('central_letter_id', {}, stageConfig, () => 0.5);
    const trial = createTrial(0, 'crowding', 1.2, meta);
    const idx = meta.correctIndex as number;
    const completed = recordResponse(trial, { index: idx }, 500);
    expect(completed.correct).toBe(true);
    expect(completed.responseIndex).toBe(idx);
  });
});
