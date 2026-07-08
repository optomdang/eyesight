import { describe, it, expect } from 'vitest';
import {
  resolveVernierTaskMode,
  buildVernierTaskTrialMeta,
  getVernierTaskModeFromTrial,
  isVernierSideBasedMode,
  getVernierModeRotation,
  resolveVernierStageEndPolicy,
  DEFAULT_VERNIER_OFFSET_RATIO,
} from '../core/vernierTaskModes';
import { VT_UNLIMITED_TRIALS_PER_STAGE } from '../core/gaborTaskModes';
import { createTrial, recordResponse } from '../core/trialRunner';
import { isVtResponseCorrect } from '../core/gaborTaskModes';
import type { VtStimulusVernierConfig, VtTrial } from 'src/types/core/vtQuest';

const baseConfig: VtStimulusVernierConfig = {};

function trialWithMeta(meta: Record<string, unknown>, signalSide: 'left' | 'right' = 'left'): VtTrial {
  return {
    trialIndex: 0,
    world: 'vernier',
    signalSide,
    response: null,
    correct: null,
    difficultyValue: 60,
    reactionTimeMs: null,
    meta,
  };
}

describe('resolveVernierTaskMode', () => {
  it('defaults to alignment_2afc without config', () => {
    expect(resolveVernierTaskMode(undefined, 0)).toBe('alignment_2afc');
  });

  it('rotates taskModesPerSession by stage index', () => {
    const config: VtStimulusVernierConfig = {
      taskModesPerSession: ['alignment_2afc', 'offset_direction_mcq', 'odd_line_out'],
    };
    expect(resolveVernierTaskMode(config, 0)).toBe('alignment_2afc');
    expect(resolveVernierTaskMode(config, 1)).toBe('offset_direction_mcq');
    expect(resolveVernierTaskMode(config, 2)).toBe('odd_line_out');
    expect(resolveVernierTaskMode(config, 3)).toBe('alignment_2afc');
  });

  it('boss stage picks random mode from rotation', () => {
    const config: VtStimulusVernierConfig = {
      taskModesPerSession: ['offset_direction_mcq', 'odd_line_out'],
    };
    expect(resolveVernierTaskMode(config, 4, true, () => 0.1)).toBe('offset_direction_mcq');
    expect(resolveVernierTaskMode(config, 4, true, () => 0.9)).toBe('odd_line_out');
  });
});

describe('buildVernierTaskTrialMeta', () => {
  it('returns empty meta for alignment_2afc (legacy)', () => {
    expect(buildVernierTaskTrialMeta('alignment_2afc', baseConfig)).toEqual({});
  });

  it('offset_direction_mcq: correctIndex matches offsetSign', () => {
    const left = buildVernierTaskTrialMeta('offset_direction_mcq', baseConfig, () => 0.1);
    expect(left.offsetSign).toBe(-1);
    expect(left.correctIndex).toBe(0);

    const right = buildVernierTaskTrialMeta('offset_direction_mcq', baseConfig, () => 0.9);
    expect(right.offsetSign).toBe(1);
    expect(right.correctIndex).toBe(1);
  });

  it('greater_offset_2afc: includes distractor ratio from config', () => {
    const meta = buildVernierTaskTrialMeta('greater_offset_2afc', { offsetRatio: 0.4 });
    expect(meta.taskMode).toBe('greater_offset_2afc');
    expect(meta.distractorOffsetRatio).toBe(0.4);
    const defaultMeta = buildVernierTaskTrialMeta('greater_offset_2afc', baseConfig);
    expect(defaultMeta.distractorOffsetRatio).toBe(DEFAULT_VERNIER_OFFSET_RATIO);
  });

  it('odd_line_out: one card differs at correctIndex', () => {
    const meta = buildVernierTaskTrialMeta('odd_line_out', baseConfig, () => 0.75);
    const signs = meta.cardOffsetSigns as number[];
    const idx = meta.correctIndex as number;
    expect(signs).toHaveLength(4);
    const odd = signs[idx];
    signs.forEach((s, i) => {
      if (i !== idx) expect(s).not.toBe(odd);
      else expect(s).toBe(odd);
    });
  });

  it('delayed_direction: same structure as offset_direction_mcq', () => {
    const meta = buildVernierTaskTrialMeta('delayed_direction', baseConfig, () => 0.2);
    expect(meta.taskMode).toBe('delayed_direction');
    expect(meta.correctIndex).toBe(meta.offsetSign === -1 ? 0 : 1);
  });
});

describe('scoring via isVtResponseCorrect', () => {
  it('alignment_2afc: side response vs signalSide', () => {
    const trial = trialWithMeta({}, 'right');
    expect(isVtResponseCorrect(trial, 'right')).toBe(true);
    expect(isVtResponseCorrect(trial, 'left')).toBe(false);
  });

  it('greater_offset_2afc: side response vs signalSide regardless of offsetSign', () => {
    const trial = trialWithMeta(
      { taskMode: 'greater_offset_2afc', offsetSign: -1, distractorOffsetRatio: 0.5 },
      'left'
    );
    expect(isVtResponseCorrect(trial, 'left')).toBe(true);
    expect(isVtResponseCorrect(trial, 'right')).toBe(false);
  });

  it('offset_direction_mcq: index vs correctIndex', () => {
    const trial = trialWithMeta({ taskMode: 'offset_direction_mcq', offsetSign: 1, correctIndex: 1 });
    expect(isVtResponseCorrect(trial, { index: 1 })).toBe(true);
    expect(isVtResponseCorrect(trial, { index: 0 })).toBe(false);
  });

  it('odd_line_out: index vs correctIndex', () => {
    const trial = trialWithMeta({
      taskMode: 'odd_line_out',
      correctIndex: 2,
      cardOffsetSigns: [1, 1, -1, 1],
    });
    expect(isVtResponseCorrect(trial, { index: 2 })).toBe(true);
    expect(isVtResponseCorrect(trial, { index: 0 })).toBe(false);
  });
});

describe('trialRunner integration', () => {
  it('legacy vernier trial gets offsetSign from runner', () => {
    const trial = createTrial(0, 'vernier', 60, undefined, () => 0.2);
    expect(trial.meta?.offsetSign).toBe(1);
    expect(trial.signalSide).toBe('left');
  });

  it('offset_direction meta keeps preset offsetSign', () => {
    const meta = buildVernierTaskTrialMeta('offset_direction_mcq', baseConfig, () => 0.9);
    const trial = createTrial(0, 'vernier', 60, meta, () => 0.1);
    expect(trial.meta?.offsetSign).toBe(1);
  });

  it('recordResponse scores greater_offset_2afc', () => {
    const meta = buildVernierTaskTrialMeta('greater_offset_2afc', baseConfig);
    const trial = createTrial(0, 'vernier', 60, meta, () => 0.6);
    const done = recordResponse(trial, trial.signalSide, 500);
    expect(done.correct).toBe(true);
  });
});

describe('stage end policy', () => {
  it('single mode → unlimited trials', () => {
    const policy = resolveVernierStageEndPolicy({ trialsPerStage: 10 }, { taskMode: 'alignment_2afc' });
    expect(policy.trialsPerStage).toBe(VT_UNLIMITED_TRIALS_PER_STAGE);
    expect(policy.endOnStaircase).toBe(false);
  });

  it('multi mode → trialsPerStage cap', () => {
    const policy = resolveVernierStageEndPolicy(
      { trialsPerStage: 12 },
      { taskModesPerSession: ['alignment_2afc', 'odd_line_out'] }
    );
    expect(policy.trialsPerStage).toBe(12);
    expect(policy.endOnStaircase).toBe(false);
  });
});

describe('helpers', () => {
  it('getVernierTaskModeFromTrial defaults to alignment_2afc', () => {
    expect(getVernierTaskModeFromTrial(trialWithMeta({}))).toBe('alignment_2afc');
    expect(getVernierTaskModeFromTrial(trialWithMeta({ taskMode: 'odd_line_out' }))).toBe(
      'odd_line_out'
    );
  });

  it('isVernierSideBasedMode', () => {
    expect(isVernierSideBasedMode('alignment_2afc')).toBe(true);
    expect(isVernierSideBasedMode('greater_offset_2afc')).toBe(true);
    expect(isVernierSideBasedMode('offset_direction_mcq')).toBe(false);
  });

  it('getVernierModeRotation', () => {
    expect(getVernierModeRotation(undefined)).toEqual(['alignment_2afc']);
    expect(
      getVernierModeRotation({ taskModesPerSession: ['odd_line_out', 'delayed_direction'] })
    ).toEqual(['odd_line_out', 'delayed_direction']);
  });
});
