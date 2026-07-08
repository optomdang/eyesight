import { describe, expect, it } from 'vitest';
import {
  INSTRUCTION_AUDIO_CATEGORIES,
  INSTRUCTION_AUDIO_SAMPLES,
  getSamplesByCategory,
} from '../instructionAudioSamples';

describe('instructionAudioSamples', () => {
  it('every sample belongs to a known category', () => {
    const categoryIds = new Set(INSTRUCTION_AUDIO_CATEGORIES.map((c) => c.id));
    for (const sample of INSTRUCTION_AUDIO_SAMPLES) {
      expect(categoryIds.has(sample.categoryId)).toBe(true);
      expect(sample.text.vi.trim().length).toBeGreaterThan(0);
      expect(sample.text.en.trim().length).toBeGreaterThan(0);
    }
  });

  it('getSamplesByCategory returns only matching samples', () => {
    const gabor = getSamplesByCategory('vt_gabor');
    expect(gabor.length).toBeGreaterThan(0);
    expect(gabor.every((s) => s.categoryId === 'vt_gabor')).toBe(true);
  });
});
