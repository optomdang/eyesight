import { describe, it, expect } from 'vitest';
import {
  createTrial,
  randomGaborPhase,
  randomSignalSide,
  randomVernierOffsetSign,
} from '../trialRunner';

describe('trialRunner randomization', () => {
  it('randomSignalSide alternates with injected RNG', () => {
    expect(randomSignalSide(() => 0.1)).toBe('left');
    expect(randomSignalSide(() => 0.9)).toBe('right');
  });

  it('createTrial assigns random signalSide and gabor phase per trial', () => {
    let call = 0;
    const rnd = () => {
      call += 1;
      if (call === 1) return 0.25; // phase = 0.25 * 2π
      return 0.2; // signalSide = left
    };

    const trial = createTrial(0, 'gabor', 0.4, undefined, rnd);
    expect(trial.meta?.phaseRad).toBeCloseTo(0.25 * 2 * Math.PI);
    expect(trial.signalSide).toBe('left');
  });

  it('createTrial assigns random vernier offset direction per trial', () => {
    let call = 0;
    const rnd = () => {
      call += 1;
      if (call === 1) return 0.6; // offsetSign = -1
      return 0.8; // signalSide = right
    };

    const trial = createTrial(1, 'vernier', 120, undefined, rnd);
    expect(trial.meta?.offsetSign).toBe(-1);
    expect(trial.signalSide).toBe('right');
  });

  it('createTrial preserves crowding meta without gabor/vernier fields', () => {
    const meta = { targetLetter: 'E', flankerLetters: ['B', 'C'] };
    const trial = createTrial(0, 'crowding', 2.5, meta, () => 0.5);
    expect(trial.meta).toEqual(meta);
    expect(trial.meta?.phaseRad).toBeUndefined();
    expect(trial.meta?.offsetSign).toBeUndefined();
  });

  it('randomGaborPhase and randomVernierOffsetSign use full range', () => {
    expect(randomGaborPhase(() => 0)).toBe(0);
    expect(randomGaborPhase(() => 0.999)).toBeCloseTo(0.999 * 2 * Math.PI);
    expect(randomVernierOffsetSign(() => 0)).toBe(1);
    expect(randomVernierOffsetSign(() => 0.99)).toBe(-1);
  });

  it('successive gabor trials get different phases with varied RNG', () => {
    let n = 0;
    const rnd = () => {
      n += 1;
      return (n * 0.17) % 1;
    };
      const phases = new Set(
      [0, 1, 2, 3, 4].map((i) => createTrial(i, 'gabor', 0.4, undefined, rnd).meta?.phaseRad)
    );
    expect(phases.size).toBeGreaterThan(1);
  });
});
