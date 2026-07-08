import { describe, it, expect } from 'vitest';
import {
  ALL_STEREOPSIS_TASK_MODES,
  buildStereopsisTaskTrialMeta,
  getStereopsisModeRotation,
  getStereopsisTaskModeFromTrial,
  resolveStereopsisStageEndPolicy,
  resolveStereopsisTaskMode,
} from '../core/stereopsisTaskModes';
import type { VtTrial } from 'src/types/core/vtQuest';
import { VT_UNLIMITED_TRIALS_PER_STAGE } from '../core/gaborTaskModes';

describe('stereopsisTaskModes', () => {
  it('exposes all three task modes', () => {
    expect(ALL_STEREOPSIS_TASK_MODES).toEqual(['shape_id', 'float_position', 'digit_id']);
  });

  it('shape_id pool includes eight intro shapes', async () => {
    const { ALL_INTRO_SHAPE_TYPES } = await import('src/utils/stereopsis/stereopsisEngine');
    expect(ALL_INTRO_SHAPE_TYPES).toEqual([
      'star',
      'triangle',
      'square',
      'circle',
      'diamond',
      'rect',
      'heart',
      'plus',
    ]);
  });

  it('defaults rotation to shape_id', () => {
    expect(getStereopsisModeRotation(undefined)).toEqual(['shape_id']);
  });

  it('uses taskModesPerSession when provided', () => {
    expect(
      getStereopsisModeRotation({
        taskModesPerSession: ['digit_id', 'shape_id'],
      })
    ).toEqual(['digit_id', 'shape_id']);
  });

  it('resolveStereopsisTaskMode rotates by stage index', () => {
    const config = { taskModesPerSession: ['shape_id', 'float_position', 'digit_id'] as const };
    expect(resolveStereopsisTaskMode(config, 0)).toBe('shape_id');
    expect(resolveStereopsisTaskMode(config, 1)).toBe('float_position');
    expect(resolveStereopsisTaskMode(config, 2)).toBe('digit_id');
    expect(resolveStereopsisTaskMode(config, 3)).toBe('shape_id');
  });

  it('single mode stage policy is unlimited trials', () => {
    const policy = resolveStereopsisStageEndPolicy({ trialsPerStage: 10 }, { taskMode: 'digit_id' });
    expect(policy.trialsPerStage).toBe(VT_UNLIMITED_TRIALS_PER_STAGE);
    expect(policy.endOnStaircase).toBe(false);
  });

  it('multi mode stage policy uses trialsPerStage', () => {
    const policy = resolveStereopsisStageEndPolicy(
      { trialsPerStage: 8 },
      { taskModesPerSession: ['shape_id', 'digit_id'] }
    );
    expect(policy.trialsPerStage).toBe(8);
  });

  it('buildStereopsisTaskTrialMeta shape_id has valid correctIndex', () => {
    const meta = buildStereopsisTaskTrialMeta('shape_id', undefined, () => 0.1);
    expect(meta.taskMode).toBe('shape_id');
    expect(meta.rngSeed).toBeGreaterThan(0);
    const options = meta.optionShapeIds as string[];
    expect(options).toHaveLength(8);
    expect(options[meta.correctIndex as number]).toBe(meta.shapeType);
  });

  it('buildStereopsisTaskTrialMeta shape_id respects shapeOptionCount', () => {
    const meta = buildStereopsisTaskTrialMeta('shape_id', { shapeOptionCount: 4 }, () => 0.2);
    const options = meta.optionShapeIds as string[];
    expect(options).toHaveLength(4);
    expect(options).toContain(meta.shapeType);
  });

  it('buildStereopsisTaskTrialMeta float_position sets floatAt in range', () => {
    const meta = buildStereopsisTaskTrialMeta('float_position', {}, () => 0.42);
    expect(meta.floatAt).toBeGreaterThanOrEqual(0);
    expect(meta.floatAt).toBeLessThan(5);
    expect(meta.correctIndex).toBe(meta.floatAt);
    expect(['square', 'circle']).toContain(meta.floatShape);
  });

  it('buildStereopsisTaskTrialMeta digit_id maps digit to correctIndex', () => {
    const meta = buildStereopsisTaskTrialMeta('digit_id', undefined, () => 0.55);
    const digits = meta.optionDigits as number[];
    expect(digits).toHaveLength(10);
    expect(digits[meta.correctIndex as number]).toBe(meta.digit);
  });

  it('getStereopsisTaskModeFromTrial reads meta or defaults', () => {
    const trial: VtTrial = {
      trialIndex: 0,
      world: 'stereopsis',
      signalSide: 'left',
      response: null,
      correct: null,
      difficultyValue: 400,
      reactionTimeMs: null,
      meta: { taskMode: 'digit_id' },
    };
    expect(getStereopsisTaskModeFromTrial(trial)).toBe('digit_id');
    expect(getStereopsisTaskModeFromTrial(null)).toBe('shape_id');
  });
});
