import { describe, it, expect } from 'vitest';
import { buildVtQuestSandboxAssignment, mergeVtSettings } from '../core/vtQuestSandbox';
import { DEFAULT_VT_SETTINGS } from 'src/types/core/vtQuest';

describe('vtQuestSandbox', () => {
  it('buildVtQuestSandboxAssignment applies level override', () => {
    const assignment = buildVtQuestSandboxAssignment({
      visionType: 'far',
      visionLevel: 7,
      distance: 3,
      eye: 'left',
      colorScheme: { preset: 'redBlue', textColor: '#ff0000', backgroundColor: '#0000ff' },
    });
    expect(assignment.levelOverride).toBe(true);
    expect(assignment.visionLevel).toBe(7);
    expect(assignment.exerciseConfig?.visionType).toBe('far');
    expect(assignment.exerciseConfig?.distance).toBe(3);
    expect(assignment.exerciseConfig?.eye).toBe('left');
    expect(assignment.exerciseConfig?.colorScheme?.preset).toBe('redBlue');
  });

  it('passes inactivityThreshold into sandbox exerciseConfig', () => {
    const assignment = buildVtQuestSandboxAssignment({
      visionType: 'far',
      visionLevel: 10,
      distance: 3,
      inactivityThreshold: 10,
    });
    expect(assignment.exerciseConfig?.inactivityThreshold).toBe(10);
  });

  it('mergeVtSettings fills defaults', () => {
    const merged = mergeVtSettings({ trialsPerStage: 12 });
    expect(merged.trialsPerStage).toBe(12);
    expect(merged.modalities).toEqual(DEFAULT_VT_SETTINGS.modalities);
  });

  it('buildVtQuestSandboxAssignment locks modality for vt-gabor', () => {
    const assignment = buildVtQuestSandboxAssignment({
      visionType: 'far',
      visionLevel: 10,
      distance: 3,
      exerciseType: 'vt-gabor',
    });
    expect(assignment.exercise?.exerciseType).toBe('vt-gabor');
    expect(assignment.exerciseConfig?.vtSettings?.modalities).toEqual(['gabor']);
  });
});
