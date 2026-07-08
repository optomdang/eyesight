import { describe, it, expect } from 'vitest';
import {
  OPTOTYPE_STROKE_RATIO,
  computeVernierGapPx,
  computeVernierLineWidthPx,
  computeVernierStimulusMetrics,
  VERNIER_BASE_GAP_PX,
} from '../vernierLayout';

describe('vernierLayout', () => {
  it('line width follows clinical optotype stroke ratio (20% letter height)', () => {
    expect(computeVernierLineWidthPx(100)).toBe(20);
    expect(computeVernierLineWidthPx(50)).toBe(10);
    expect(computeVernierLineWidthPx(5)).toBe(1.5);
  });

  it('gap is at least base gap and grows with thick strokes', () => {
    expect(computeVernierGapPx(2)).toBe(VERNIER_BASE_GAP_PX);
    expect(computeVernierGapPx(20)).toBeGreaterThan(VERNIER_BASE_GAP_PX);
  });

  it('gap scales with far/contrast multiplier', () => {
    expect(computeVernierGapPx(2, 2)).toBe(VERNIER_BASE_GAP_PX * 2);
  });

  it('computeVernierStimulusMetrics preserves clinical line width', () => {
    const letterHeightPx = 80;
    const m = computeVernierStimulusMetrics({
      letterHeightPx,
      pixelsPerDeg: 40,
      offsetArcsec: 60,
    });
    expect(m.lineWidthPx).toBe(Math.round(letterHeightPx * OPTOTYPE_STROKE_RATIO));
    expect(m.gapPx).toBeGreaterThan(m.lineWidthPx);
  });
});
