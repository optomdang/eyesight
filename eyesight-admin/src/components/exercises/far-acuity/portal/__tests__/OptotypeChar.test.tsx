import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import OptotypeChar, {
  OPTOTYPE_CELL_PAD_MIN_PX,
  resolveOptotypeCellPadPx,
  resolveOptotypeFontSizePx,
} from '../OptotypeChar';
import type { ScreenInfo } from 'src/utils/visionUtils';

vi.mock('src/utils/optotypeFonts', () => ({
  ensureOptotypeFontsLoaded: vi.fn().mockResolvedValue(true),
}));

const screen156: ScreenInfo = {
  screenWidth: 1920,
  screenHeight: 1080,
  diagonalInch: 15.6,
};

describe('OptotypeChar (VAC exercise)', () => {
  it('resolveOptotypeFontSizePx returns whole CSS pixels', () => {
    const px = resolveOptotypeFontSizePx(8.73, screen156);
    expect(Number.isInteger(px)).toBe(true);
    expect(px).toBeGreaterThan(0);
  });

  it('pads cells enough for curved strokes without changing clinical font size', () => {
    const fontSizePx = resolveOptotypeFontSizePx(8.73, screen156);
    const cellPadPx = resolveOptotypeCellPadPx(fontSizePx);
    const { getByTestId } = render(
      <OptotypeChar char="O" display="O" sizeMm={8.73} screenInfo={screen156} />
    );
    const el = getByTestId('optotype-char');
    expect(el.getAttribute('data-font-size-px')).toBe(String(fontSizePx));
    expect(el.getAttribute('data-cell-pad-px')).toBe(String(cellPadPx));
    expect(cellPadPx).toBeGreaterThanOrEqual(OPTOTYPE_CELL_PAD_MIN_PX);
  });

  it('scales cell pad with larger clinical font sizes', () => {
    expect(resolveOptotypeCellPadPx(50)).toBeGreaterThanOrEqual(OPTOTYPE_CELL_PAD_MIN_PX);
    expect(resolveOptotypeCellPadPx(200)).toBeGreaterThan(resolveOptotypeCellPadPx(50));
  });
});
