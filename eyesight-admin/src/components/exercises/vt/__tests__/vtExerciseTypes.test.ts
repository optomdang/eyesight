import { describe, it, expect } from 'vitest';
import {
  getVtModalityFromExerciseType,
  isVtQuestFamily,
  isVtSingleModalityExercise,
  resolveVtExerciseTypeFromAssignment,
  resolveVtSettingsForExerciseType,
} from '../core/vtExerciseTypes';

describe('vtExerciseTypes', () => {
  it('isVtQuestFamily matches all Phi hành gia types', () => {
    expect(isVtQuestFamily('vt-quest')).toBe(true);
    expect(isVtQuestFamily('vt-gabor')).toBe(true);
    expect(isVtQuestFamily('VT-VERNIER')).toBe(true);
    expect(isVtQuestFamily('2048')).toBe(false);
  });

  it('getVtModalityFromExerciseType maps single-modality types', () => {
    expect(getVtModalityFromExerciseType('vt-gabor')).toBe('gabor');
    expect(getVtModalityFromExerciseType('vt-vernier')).toBe('vernier');
    expect(getVtModalityFromExerciseType('vt-crowding')).toBe('crowding');
    expect(getVtModalityFromExerciseType('vt-stereopsis')).toBe('stereopsis');
    expect(getVtModalityFromExerciseType('vt-quest')).toBeNull();
  });

  it('resolveVtSettingsForExerciseType locks modalities for single-modality types', () => {
    const gabor = resolveVtSettingsForExerciseType('vt-gabor', { modalities: ['vernier', 'crowding'] });
    expect(gabor.modalities).toEqual(['gabor']);
    expect(isVtSingleModalityExercise('vt-crowding')).toBe(true);
  });

  it('resolveVtExerciseTypeFromAssignment reads exerciseConfig.exercise (portal API shape)', () => {
    expect(
      resolveVtExerciseTypeFromAssignment({
        exerciseConfig: { exercise: { exerciseType: 'vt-gabor' } },
      })
    ).toBe('vt-gabor');
    expect(
      resolveVtExerciseTypeFromAssignment({
        exercise: { exerciseType: 'vt-vernier' },
        exerciseConfig: { exercise: { exerciseType: 'vt-gabor' } },
      })
    ).toBe('vt-vernier');
    expect(resolveVtExerciseTypeFromAssignment(null)).toBeNull();
  });
});
