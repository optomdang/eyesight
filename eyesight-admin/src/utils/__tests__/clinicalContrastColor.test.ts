import { describe, it, expect } from 'vitest';
import {
  blendHexAtContrastPercent,
  resolveOpaqueContrastColors,
} from '../clinicalContrastColor';

describe('blendHexAtContrastPercent', () => {
  it('returns foreground at 100% contrast', () => {
    expect(blendHexAtContrastPercent('#000000', 100, '#ffffff')).toBe('#000000');
  });

  it('returns background at 0% contrast', () => {
    expect(blendHexAtContrastPercent('#000000', 0, '#ffffff')).toBe('#ffffff');
  });

  it('blends mid-grey at 50%', () => {
    expect(blendHexAtContrastPercent('#000000', 50, '#ffffff')).toBe('#808080');
  });
});

describe('resolveOpaqueContrastColors', () => {
  it('keeps base colors near full contrast', () => {
    expect(
      resolveOpaqueContrastColors({
        contrastPercent: 100,
        textColor: '#000000',
        backgroundColor: '#ffffff',
      })
    ).toEqual({ textColor: '#000000', backgroundColor: '#ffffff' });
  });

  it('blends letter toward background at low contrast', () => {
    const result = resolveOpaqueContrastColors({
      contrastPercent: 1.12,
      textColor: '#000000',
      backgroundColor: '#ffffff',
    });
    expect(result.backgroundColor).toBe('#ffffff');
    expect(result.textColor).toBe(blendHexAtContrastPercent('#000000', 1.12, '#ffffff'));
    expect(result.textColor).not.toBe('#000000');
  });
});
