import { describe, it, expect } from 'vitest';
import { buildGame2048TileColorCss } from '../game2048Utils';
import { blendHexAtContrastPercent } from '../clinicalContrastColor';

describe('buildGame2048TileColorCss', () => {
  it('keeps native palette at full contrast + original', () => {
    expect(buildGame2048TileColorCss(100, { preset: 'original' })).toBe('');
    expect(buildGame2048TileColorCss(100, null)).toBe('');
  });

  it('uses opaque digit blend at low contrast (no filter)', () => {
    const css = buildGame2048TileColorCss(1.12, {
      preset: 'whiteBlack',
      textColor: '#000000',
      backgroundColor: '#ffffff',
    });
    expect(css).not.toMatch(/filter/);
    expect(css).toMatch(/background: #ffffff/i);
    expect(css).toMatch(/color: #[0-9a-f]{6}/i);
    const colorMatch = css.match(/color:\s*(#[0-9a-f]{6})/i);
    expect(colorMatch).toBeTruthy();
    const hex = colorMatch![1].toLowerCase();
    expect(hex).not.toBe('#000000');
    expect(hex).toBe(blendHexAtContrastPercent('#000000', 1.12, '#ffffff'));
  });
});
