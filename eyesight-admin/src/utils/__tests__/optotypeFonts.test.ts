import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OPTOTYPE_FONT_FAMILIES, ensureOptotypeFontsLoaded } from '../optotypeFonts';

describe('optotypeFonts', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists all chart font families', () => {
    expect(OPTOTYPE_FONT_FAMILIES).toEqual(
      expect.arrayContaining([
        'OptomDangLatinChart',
        'OptomDangELetterChart',
        'OptomDangLandotC',
        'OptomDangNumber',
        'OptomDangLeaChart',
      ])
    );
  });

  it('ensureOptotypeFontsLoaded resolves true after load attempt', async () => {
    const load = vi.fn().mockResolvedValue([]);
    const check = vi.fn().mockReturnValue(false); // flaky check must not force false
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        load,
        check,
        ready: Promise.resolve(),
      },
    });

    const mod = await import('../optotypeFonts');
    const ok = await mod.ensureOptotypeFontsLoaded();
    expect(ok).toBe(true);
    expect(load).toHaveBeenCalled();
  });
});
