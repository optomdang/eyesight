import { describe, it, expect } from 'vitest';
import { SeededRng } from '../stereopsisEngine';
import {
  computeAchievedArcsec,
  computeStereopsisAccuracy,
  formatStereopsisLevel,
  generateStereopsisSteps,
  isLegacyStereopsisLevel,
  shouldReverseStereopsisChartYAxis,
} from '../stereopsisSteps';

describe('stereopsisSteps', () => {
  it('generates 12 steps in Titmus order', () => {
    const steps = generateStereopsisSteps(new SeededRng(42));
    expect(steps).toHaveLength(12);
    expect(steps[0]).toMatchObject({ type: 'shape-single', arcsec: 800, label: 'Mục 1' });
    expect(steps[1]).toMatchObject({ type: 'shape-row', arcsec: 400, label: 'Hàng A', answer: 'square' });
    expect(steps[2]).toMatchObject({ type: 'shape-row', arcsec: 200, label: 'Hàng B', answer: 'circle' });
    expect(steps[3].type).toBe('digit');
    expect(steps[11].arcsec).toBe(20);
  });

  it('is deterministic per seed and varies across seeds', () => {
    const a = generateStereopsisSteps(new SeededRng(1));
    const b = generateStereopsisSteps(new SeededRng(1));
    const c = generateStereopsisSteps(new SeededRng(424242));
    expect(a.map((s) => s.answer)).toEqual(b.map((s) => s.answer));
    expect(a.map((s) => s.answer)).not.toEqual(c.map((s) => s.answer));
  });

  it('computeAchievedArcsec returns last passed threshold', () => {
    const steps = generateStereopsisSteps(new SeededRng(99));
    expect(computeAchievedArcsec(steps, 0)).toBeNull();
    expect(computeAchievedArcsec(steps, 1)).toBe(800);
    expect(computeAchievedArcsec(steps, 4)).toBe(200);
    expect(computeAchievedArcsec(steps, steps.length)).toBe(20);
  });

  it('formatStereopsisLevel shows arcsec or legacy Lv', () => {
    expect(formatStereopsisLevel(40)).toBe('40″');
    expect(formatStereopsisLevel(5)).toBe('Lv 5');
    expect(isLegacyStereopsisLevel(5)).toBe(true);
    expect(isLegacyStereopsisLevel(40)).toBe(false);
  });

  it('shouldReverseStereopsisChartYAxis for arcsec, not legacy Lv', () => {
    expect(shouldReverseStereopsisChartYAxis([400, 200])).toBe(true);
    expect(shouldReverseStereopsisChartYAxis([5, 7])).toBe(false);
    expect(shouldReverseStereopsisChartYAxis([7, 40])).toBe(true);
  });

  it('computeStereopsisAccuracy', () => {
    const acc = computeStereopsisAccuracy(
      [
        { stepIndex: 0, label: 'Mục 1', arcsec: 800, userAnswer: 'star', correct: true },
        { stepIndex: 1, label: 'Hàng A', arcsec: 400, userAnswer: 'square', correct: false },
      ],
      12
    );
    expect(acc).toBeCloseTo(1 / 12);
  });
});
