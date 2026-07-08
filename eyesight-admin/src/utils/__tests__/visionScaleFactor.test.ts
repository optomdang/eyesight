import { describe, expect, it } from 'vitest';
import { calculateGameScaleFactor } from '../visionUtils';

describe('calculateGameScaleFactor - BUG-04 vision size separation', () => {
  it('provides stronger far-vision separation between severe low vision and normal vision', () => {
    const severeLowVision = calculateGameScaleFactor('far', 1); // 20/400
    const normalVision = calculateGameScaleFactor('far', 14); // 20/20

    expect(normalVision).toBeCloseTo(1, 5);
    expect(severeLowVision).toBeGreaterThan(3.2);
  });

  it('provides stronger near-vision separation between severe low vision and baseline', () => {
    const severeLowVision = calculateGameScaleFactor('near', 1); // N64
    const baselineVision = calculateGameScaleFactor('near', 6); // N8

    expect(baselineVision).toBeCloseTo(1, 5);
    expect(severeLowVision).toBeGreaterThan(1.9);
  });

  it('remains monotonic for far vision', () => {
    const veryPoor = calculateGameScaleFactor('far', 1);
    const medium = calculateGameScaleFactor('far', 10);
    const normal = calculateGameScaleFactor('far', 14);
    const excellent = calculateGameScaleFactor('far', 20);

    expect(veryPoor).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(normal);
    expect(normal).toBeGreaterThan(excellent);
  });
});
