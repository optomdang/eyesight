import { describe, it, expect } from 'vitest';
import { calculateVisualSettings } from 'src/utils/visionUtils';
import {
  computeVtVisionSizing,
  checkVtQuestScreenRequirements,
  oneLevelLargerFar,
  resolveGaborStartContrast,
  resolveStimulusStartContrastPercent,
  resolveVernierGapMultiplier,
  resolveVtExerciseVision,
} from '../core/vtVisionSizing';
import { computeVernierStimulusMetrics } from '../core/vernierLayout';

const screen = { diagonalInch: 15.6, screenWidth: 1920, screenHeight: 1080 };

describe('vtVisionSizing', () => {
  it('computeVtVisionSizing letter height uses calculateVisualSettings (optotype mode)', () => {
    const sizing = computeVtVisionSizing({
      screenInfo: screen,
      distanceM: 3,
      visionType: 'far',
      visionLevel: 11,
    });
    const { fontSize } = calculateVisualSettings({
      visionType: 'far',
      visionLevel: 11,
      distance: 3,
      screenInfo: screen,
      renderMode: 'optotype',
    });
    expect(sizing.letterHeightPx).toBe(fontSize);
  });

  it('computeVtVisionSizing does not throw for 20/100 @ 3m', () => {
    const sizing = computeVtVisionSizing({
      screenInfo: screen,
      distanceM: 3,
      visionType: 'far',
      visionLevel: 7,
    });
    const { fontSize } = calculateVisualSettings({
      visionType: 'far',
      visionLevel: 7,
      distance: 3,
      screenInfo: screen,
      renderMode: 'optotype',
    });
    expect(sizing.letterHeightPx).toBe(fontSize);
    expect(sizing.stimulusContrastPercent).toBe(100);
    expect(sizing.gaborStartContrast).toBe(1);
    expect(sizing.vernierGapMultiplier).toBe(2);
  });

  it('checkVtQuestScreenRequirements only checks configured modalities', () => {
    const result = checkVtQuestScreenRequirements({
      screenInfo: screen,
      distanceM: 3,
      visionType: 'far',
      visionLevel: 7,
      vtSettings: { modalities: ['gabor'] },
    });
    expect(result.fits).toBe(true);
    expect(result.limitingWorld).toBe('gabor');
  });

  it('oneLevelLargerFar decrements level index (bigger letters)', () => {
    expect(oneLevelLargerFar(10)).toBe(9);
    expect(oneLevelLargerFar(1)).toBe(1);
  });

  it('resolveVtExerciseVision: trainingEye right overrides config both (not worse eye)', () => {
    const resolved = resolveVtExerciseVision({
      visionType: 'far',
      trainingEye: 'right',
      configEye: 'both',
      examResults: {
        far: { currentResult: { leftEye: 3, rightEye: 10 } },
      },
    });
    expect(resolved?.sizeVisionLevel).toBe(10);
  });

  it('resolveVtExerciseVision: far uses exam level directly', () => {
    const resolved = resolveVtExerciseVision({
      visionType: 'far',
      eye: 'right',
      examResults: {
        far: { currentResult: { rightEye: 10 } },
      },
    });
    expect(resolved?.sizeVisionLevel).toBe(10);
    expect(resolved?.sizeVisionType).toBe('far');
    expect(resolved?.stimulusContrastPercent).toBe(100);
  });

  it('resolveVtExerciseVision: contrast sizes one step larger than far exam', () => {
    const resolved = resolveVtExerciseVision({
      visionType: 'contrast',
      eye: 'right',
      examResults: {
        far: { currentResult: { rightEye: 10 } },
        contrast: { currentResult: { rightEye: 5 } },
      },
    });
    expect(resolved?.sizeVisionLevel).toBe(9);
    expect(resolved?.sizeVisionType).toBe('far');
    expect(resolved?.contrastLevel).toBe(5);
    expect(resolved?.stimulusContrastPercent).toBe(25.12);
  });

  it('resolveVtExerciseVision: contrast override only changes contrast, size from far exam', () => {
    const resolved = resolveVtExerciseVision({
      visionType: 'contrast',
      levelOverride: true,
      visionLevel: 10,
      eye: 'right',
      examResults: {
        far: { currentResult: { rightEye: 14 } },
      },
    });
    expect(resolved?.sizeVisionLevel).toBe(13);
    expect(resolved?.contrastLevel).toBe(10);
    expect(resolved?.stimulusContrastPercent).toBe(4.47);
  });

  it('resolveVtExerciseVision: contrast override with different levels keeps stable size', () => {
    const base = {
      visionType: 'contrast' as const,
      levelOverride: true,
      eye: 'right' as const,
      examResults: {
        far: { currentResult: { rightEye: 14 } },
      },
    };
    const lowContrast = resolveVtExerciseVision({ ...base, visionLevel: 3 });
    const highContrast = resolveVtExerciseVision({ ...base, visionLevel: 14 });
    expect(lowContrast?.sizeVisionLevel).toBe(13);
    expect(highContrast?.sizeVisionLevel).toBe(13);
    expect(lowContrast?.stimulusContrastPercent).not.toBe(highContrast?.stimulusContrastPercent);
  });

  it('resolveVtExerciseVision: contrast uses right eye far acuity, not worse eye', () => {
    const examResults = {
      far: { currentResult: { leftEye: 7, rightEye: 11 } },
      contrast: { currentResult: { leftEye: 5, rightEye: 8 } },
    };
    const worseEye = resolveVtExerciseVision({
      visionType: 'contrast',
      eye: 'both',
      examResults,
    });
    const rightEye = resolveVtExerciseVision({
      visionType: 'contrast',
      eye: 'right',
      examResults,
    });
    expect(worseEye?.sizeVisionLevel).toBe(6);
    expect(rightEye?.sizeVisionLevel).toBe(10);
    expect(rightEye!.sizeVisionLevel).toBeGreaterThan(worseEye!.sizeVisionLevel);
  });

  it('resolveGaborStartContrast: far/near → 100% Michelson', () => {
    expect(resolveGaborStartContrast({ visionType: 'far' })).toBe(1);
    expect(resolveGaborStartContrast({ visionType: 'near' })).toBe(1);
  });

  it('resolveGaborStartContrast: contrast type starts at exam contrast level', () => {
    const start = resolveGaborStartContrast({
      visionType: 'contrast',
      eye: 'right',
      examResults: {
        far: { currentResult: { rightEye: 10 } },
        contrast: { currentResult: { rightEye: 5 } },
      },
    });
    expect(start).toBeCloseTo(0.2512, 3);
  });

  it('resolveStimulusStartContrastPercent: far/near → 100%', () => {
    expect(resolveStimulusStartContrastPercent({ visionType: 'far' })).toBe(100);
    expect(resolveStimulusStartContrastPercent({ visionType: 'near' })).toBe(100);
  });

  it('resolveStimulusStartContrastPercent: contrast type uses assigned level', () => {
    expect(
      resolveStimulusStartContrastPercent({
        visionType: 'contrast',
        levelOverride: true,
        visionLevel: 5,
        eye: 'right',
        examResults: {
          far: { currentResult: { rightEye: 10 } },
        },
      })
    ).toBe(25.12);
  });

  it('resolveStimulusStartContrastPercent: contrast type uses latest exam for configured eye', () => {
    expect(
      resolveStimulusStartContrastPercent({
        visionType: 'contrast',
        eye: 'right',
        examResults: {
          far: { currentResult: { leftEye: 7, rightEye: 10 } },
          contrast: { currentResult: { leftEye: 3, rightEye: 5 } },
        },
      })
    ).toBe(25.12);
  });

  it('resolveStimulusStartContrastPercent: accepts contrast score 0.15 (level 2) from exam', () => {
    expect(
      resolveStimulusStartContrastPercent({
        visionType: 'contrast',
        trainingEye: 'right',
        examResults: {
          far: { currentResult: { rightEye: 10 } },
          contrast: { currentResult: { rightEye: 0.15 } },
        },
      })
    ).toBe(70.79);
    expect(
      resolveGaborStartContrast({
        visionType: 'contrast',
        trainingEye: 'right',
        examResults: {
          far: { currentResult: { rightEye: 10 } },
          contrast: { currentResult: { rightEye: '0.15' } },
        },
      })
    ).toBeCloseTo(0.7079, 3);
  });

  it('resolveStimulusStartContrastPercent: contrast type without level falls back to 100%', () => {
    expect(
      resolveStimulusStartContrastPercent({
        visionType: 'contrast',
        eye: 'right',
        examResults: {
          far: { currentResult: { rightEye: 10 } },
        },
      })
    ).toBe(100);
  });

  it('computeVtVisionSizing passes start contrast through to display and gabor', () => {
    const sizing = computeVtVisionSizing({
      screenInfo: screen,
      distanceM: 3,
      visionType: 'far',
      visionLevel: 9,
      stimulusContrastPercent: 25.12,
      exerciseVisionType: 'contrast',
    });
    expect(sizing.stimulusContrastPercent).toBe(25.12);
    expect(sizing.gaborStartContrast).toBeCloseTo(0.2512, 3);
  });

  it('resolveVernierGapMultiplier: wider gap for far and contrast', () => {
    expect(resolveVernierGapMultiplier('far')).toBe(2);
    expect(resolveVernierGapMultiplier('contrast')).toBe(2);
    expect(resolveVernierGapMultiplier('near')).toBe(1);
  });

  it('vernier gap doubles for far vision sizing', () => {
    const nearGap = computeVernierStimulusMetrics({
      letterHeightPx: 80,
      pixelsPerDeg: 40,
      offsetArcsec: 60,
      gapMultiplier: 1,
    }).gapPx;
    const farGap = computeVernierStimulusMetrics({
      letterHeightPx: 80,
      pixelsPerDeg: 40,
      offsetArcsec: 60,
      gapMultiplier: 2,
    }).gapPx;
    expect(farGap).toBe(nearGap * 2);
  });
});
