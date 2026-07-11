import { describe, it, expect } from 'vitest';
import {
  buildBaseGameTestVisualOptions,
  getDichopticBalanceConfigWarnings,
  getDichopticBalanceSupport,
} from '../dichopticCapabilities';

describe('dichopticCapabilities', () => {
  it('getDichopticBalanceSupport maps exercise types', () => {
    expect(getDichopticBalanceSupport('2048')).toBe('full');
    expect(getDichopticBalanceSupport('vt-crowding')).toBe('full');
    expect(getDichopticBalanceSupport('vt-quest')).toBe('partial');
    expect(getDichopticBalanceSupport('vt-gabor')).toBe('none');
  });

  it('buildBaseGameTestVisualOptions defaults anaglyph games to redBlue + left eye', () => {
    const opts = buildBaseGameTestVisualOptions('2048');
    expect(opts.eye).toBe('left');
    expect(opts.colorScheme?.preset).toBe('redBlue');
    expect(opts.dichoptic).toBeNull();
  });

  it('getDichopticBalanceConfigWarnings flags eye=both and unsupported types', () => {
    const warnings = getDichopticBalanceConfigWarnings({
      mode: 'balance',
      eye: 'both',
      exerciseType: 'vt-gabor',
      colorScheme: { preset: 'redBlue', textColor: '#f00', backgroundColor: '#00f' },
    });
    expect(warnings.some((w) => w.includes('Cả 2 mắt'))).toBe(true);
    expect(warnings.some((w) => w.includes('Gabor'))).toBe(true);
  });

  it('getDichopticBalanceConfigWarnings empty when mode off', () => {
    expect(
      getDichopticBalanceConfigWarnings({ mode: 'off', eye: 'both', exerciseType: 'vt-gabor' })
    ).toEqual([]);
  });
});
