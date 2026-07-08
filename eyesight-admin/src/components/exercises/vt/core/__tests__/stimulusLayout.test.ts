import { describe, it, expect } from 'vitest';
import { fitStimulusToViewport } from '../stimulusLayout';

describe('fitStimulusToViewport crowding', () => {
  it('reduces spacing ratio when clinical letter size exceeds viewport width', () => {
    const result = fitStimulusToViewport({
      world: 'crowding',
      availableWidth: 900,
      availableHeight: 200,
      pixelsPerDeg: 40,
      crowding: {
        spacingRatio: 3,
        letterHeightPx: 99,
        idealLetterHeightPx: 99,
        minLetterHeightPx: 99,
        targetLetter: 'E',
        flankerLetters: ['B', 'H'],
      },
    });

    expect(result.fits).toBe(true);
    expect(result.crowdingSpacingRatio).toBeDefined();
    expect(result.crowdingSpacingRatio!).toBeLessThan(3);
    expect(result.canvasWidth).toBeLessThanOrEqual(900);
  });
});
