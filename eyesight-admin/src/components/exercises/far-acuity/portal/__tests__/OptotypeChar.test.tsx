import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import OptotypeChar, {
  OPTOTYPE_CELL_PAD_PX,
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

  it('keeps clinical font size while padding the cell to avoid stroke clipping', () => {
    const fontSizePx = resolveOptotypeFontSizePx(8.73, screen156);
    const { getByTestId } = render(
      <OptotypeChar char="H" display="H" sizeMm={8.73} screenInfo={screen156} />
    );
    const el = getByTestId('optotype-char');
    expect(el.getAttribute('data-font-size-px')).toBe(String(fontSizePx));
    expect(OPTOTYPE_CELL_PAD_PX).toBeGreaterThan(0);
  });
});
