import { describe, expect, it } from 'vitest';
import {
  extractPeakVisionLevelFromResultMetrics,
  resolveExerciseStartVisionLevel,
} from '../exerciseDifficultyBaseline';

const examResults = {
  far: { currentResult: { leftEye: 8, rightEye: 12, bothEye: 8 } },
  near: { currentResult: { leftEye: 2, rightEye: 4, bothEye: 2 } },
  contrast: { currentResult: { leftEye: 5, rightEye: 7, bothEye: 5 } },
};

describe('extractPeakVisionLevelFromResultMetrics', () => {
  it('reads peakFarLevel for far/near', () => {
    expect(
      extractPeakVisionLevelFromResultMetrics({ peakFarLevel: 9 }, 'far')
    ).toBe(9);
    expect(
      extractPeakVisionLevelFromResultMetrics({ peakFarLevel: 4 }, 'near')
    ).toBe(4);
  });

  it('reads peakContrastLevel for contrast', () => {
    expect(
      extractPeakVisionLevelFromResultMetrics({ peakContrastLevel: 6 }, 'contrast')
    ).toBe(6);
  });

  it('falls back to peakVisionLevel for VT / static exercises', () => {
    expect(
      extractPeakVisionLevelFromResultMetrics({ peakVisionLevel: 11 }, 'far')
    ).toBe(11);
  });

  it('returns null for missing or invalid metrics', () => {
    expect(extractPeakVisionLevelFromResultMetrics(null, 'far')).toBeNull();
    expect(extractPeakVisionLevelFromResultMetrics({}, 'far')).toBeNull();
    expect(
      extractPeakVisionLevelFromResultMetrics({ peakFarLevel: 0 }, 'far')
    ).toBeNull();
  });
});

describe('resolveExerciseStartVisionLevel', () => {
  it('levelOverride wins over baseline mode and saved peak', () => {
    expect(
      resolveExerciseStartVisionLevel({
        difficultyBaselineSource: 'latest_achieved',
        levelOverride: true,
        visionLevel: 15,
        visionType: 'far',
        configEye: 'left',
        examResults,
        lastAchievedVisionLevel: 10,
      })
    ).toBe(15);
  });

  it('current_exam uses latest exam for configured vision type and eye', () => {
    expect(
      resolveExerciseStartVisionLevel({
        difficultyBaselineSource: 'current_exam',
        visionType: 'far',
        configEye: 'left',
        examResults,
      })
    ).toBe(8);

    expect(
      resolveExerciseStartVisionLevel({
        difficultyBaselineSource: 'current_exam',
        visionType: 'near',
        configEye: 'both',
        examResults,
      })
    ).toBe(2);

    expect(
      resolveExerciseStartVisionLevel({
        difficultyBaselineSource: 'current_exam',
        visionType: 'contrast',
        configEye: 'both',
        examResults,
      })
    ).toBe(5);
  });

  it('latest_achieved uses saved peak when present', () => {
    expect(
      resolveExerciseStartVisionLevel({
        difficultyBaselineSource: 'latest_achieved',
        visionType: 'far',
        configEye: 'left',
        examResults,
        lastAchievedVisionLevel: 9,
      })
    ).toBe(9);
  });

  it('latest_achieved falls back to exam on first execution (no peak yet)', () => {
    expect(
      resolveExerciseStartVisionLevel({
        difficultyBaselineSource: 'latest_achieved',
        visionType: 'far',
        configEye: 'left',
        examResults,
        lastAchievedVisionLevel: null,
      })
    ).toBe(8);
  });

  it('defaults to current_exam when difficultyBaselineSource is absent', () => {
    expect(
      resolveExerciseStartVisionLevel({
        visionType: 'far',
        configEye: 'left',
        examResults,
        lastAchievedVisionLevel: 12,
      })
    ).toBe(8);
  });

  it('returns null for stereopsis', () => {
    expect(
      resolveExerciseStartVisionLevel({
        visionType: 'stereopsis',
        examResults,
      })
    ).toBeNull();
  });
});
