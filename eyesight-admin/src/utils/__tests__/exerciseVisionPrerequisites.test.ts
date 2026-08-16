import { describe, it, expect } from 'vitest';
import {
  EXERCISE_VISION_LEVEL_REQUIRED_MESSAGE,
  hasExerciseVisionLevel,
} from '../exerciseVisionPrerequisites';

describe('exerciseVisionPrerequisites', () => {
  it('blocks when no exam and no override', () => {
    expect(
      hasExerciseVisionLevel({
        levelOverride: false,
        visionType: 'far',
        eye: 'both',
      })
    ).toBe(false);
  });

  it('allows when doctor override is set', () => {
    expect(
      hasExerciseVisionLevel({
        levelOverride: true,
        visionLevel: 10,
        visionType: 'far',
      })
    ).toBe(true);
  });

  it('allows when matching exam result exists', () => {
    expect(
      hasExerciseVisionLevel({
        visionType: 'far',
        eye: 'left',
        examResults: { far: { currentResult: { leftEye: 8, rightEye: 12 } } },
      })
    ).toBe(true);
  });

  it('allows when only initialResult (warranty/clinic baseline) exists', () => {
    expect(
      hasExerciseVisionLevel({
        visionType: 'far',
        eye: 'both',
        examResults: { far: { initialResult: { leftEye: 7, rightEye: 9 } } },
      })
    ).toBe(true);
  });

  it('still blocks when initialResult eyes are empty', () => {
    expect(
      hasExerciseVisionLevel({
        visionType: 'far',
        eye: 'both',
        examResults: { far: { initialResult: { leftEye: null, rightEye: null } } },
      })
    ).toBe(false);
  });

  it('exports a user-facing message', () => {
    expect(EXERCISE_VISION_LEVEL_REQUIRED_MESSAGE.length).toBeGreaterThan(10);
  });
});
