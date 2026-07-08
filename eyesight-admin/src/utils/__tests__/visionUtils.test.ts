/**
 * Vision Calculation Utilities — complete test suite
 *
 * Structure (three separate concerns, each verified independently):
 *
 *   LAYER 1 — ISO 8596 mm  (pure geometry, no screen, no DPR)
 *     Verifies that calculateSnellenOptotypeHeightMm / calculateFarFontSize /
 *     calculateNearFontSize produce the exact millimetre heights mandated by
 *     ISO 8596 and the N-notation standard. Golden values are computed from
 *     first-principles trig (offline, in node, completely independent of the
 *     app code) and hard-coded here so any future formula drift fails the build.
 *
 *   LAYER 2 — mm → CSS px  (screen-dependent, DPR-dependent)
 *     Verifies that the pixel pipeline (mmToPixels, mmToCssPixels,
 *     calculateCssFontSizeForTargetHeightMm) converts a clinical mm value to the
 *     correct CSS pixel count for a given screen configuration and DPR.
 *
 *   LAYER 3 — Physical size independence  (DPR-invariance proof)
 *     Verifies that cssPx × DPR = physical device pixels, and therefore that
 *     the physical millimetre size on the glass is identical regardless of OS
 *     display scaling (DPR 1, 1.5, 2, 2.25). This is the formal rebuttal to
 *     the eye-exam comparison: eye-exam never divides by DPR and is therefore
 *     only correct at one specific scaling factor.
 *
 *   Remaining sections cover helper utilities, game scaling, display layout,
 *   exam generation, and stereopsis data — unchanged from the original file.
 */

import { describe, it, expect } from 'vitest';
import {
  formatVisionLevel,
  formatBinocularVision,
  getExamSetupVisionResultSource,
  getVisionExamChartYAxisConfig,
  mapExamResultLevelsForChart,
  toExamChartVisionLevel,
  calculatePPI,
  mmToPixels,
  clinicalMmToLayoutPx,
  mmToCssPixels,
  pixelsToMm,
  calculateFarFontSize,
  calculateSnellenOptotypeHeightMm,
  calculateNearFontSize,
  calculateCssFontSizeForTargetHeightMm,
  calc2048Scale,
  get2048EffectiveScale,
  calculateScaledSizes,
  DEFAULT_GAME_SIZES,
  getResponsiveScaleFactor,
  calculateOptimalCharCount,
  calculateMaxCharsPerBatch,
  getCharSpacing,
  calculateTotalWidth,
  calculateMinDiagonalInchForExamRow,
  countExamCharsFitOnRow,
  getExamRowWidthFactor,
  buildExamDisplayStrategy,
  calculateGameScaleFactor,
  calculateVisualSettings,
  resolveContrastFontFarN,
  CONTRAST_BASELINE_FAR_N,
  generateRandomText,
  generateRandomStereopsisTest,
  getStereopsisImagePath,
  getCorrectStereopsisAnswer,
  type ScreenInfo,
} from '../visionUtils';
import {
  stereopsisImages,
  farVisionLevels,
  nearVisionLevels,
  contrastVisionLevels,
  stereopsisLevels,
} from '../constant';

// ============================================================================
// LAYER 1 — ISO 8596 MILLIMETRE GROUND TRUTH
// ----------------------------------------------------------------------------
// These golden values were computed offline via pure trigonometry in node,
// completely independent of the app implementation:
//
//   isoMm(denominator, distM) =
//     2 · distM · 1000 · tan( (5 · denominator/20) / 60 · π/180 / 2 )
//
// They represent what the ISO 8596 standard *requires* each optotype to
// measure. If any value below changes, it means the standard has changed —
// not that the code was "refactored".
// ============================================================================

/**
 * ISO 8596 golden optotype heights — all 20 Snellen levels at 6 m.
 * Unit: millimetres. Source: first-principles trig (node, not app code).
 */
const ISO_FAR_MM_6M: Record<number, number> = {
  1: 174.54523, // 20/400
  2: 139.63264, // 20/320
  3: 109.08608, // 20/250
  4: 87.268, // 20/200
  5: 69.81396, // 20/160
  6: 54.54191, // 20/125
  7: 43.63342, // 20/100
  8: 34.90668, // 20/80
  9: 27.48898, // 20/63
  10: 21.81664, // 20/50
  11: 17.4533, // 20/40
  12: 13.96264, // 20/32
  13: 10.90831, // 20/25
  14: 8.72665, // 20/20  ← normal-vision anchor (ISO 8596 §4.1)
  15: 6.98132, // 20/16
  16: 5.45415, // 20/12.5
  17: 4.36332, // 20/10
  18: 3.49066, // 20/8
  19: 2.74889, // 20/6.3
  20: 2.18166, // 20/5
};

/**
 * N-notation golden heights at the 40 cm standard distance.
 * The N value IS the letter height in mm at 40 cm — this is the definition
 * of the notation, not a derived quantity.
 */
const ISO_NEAR_MM_40CM: Record<number, number> = {
  1: 5.8, // N64
  2: 4.35, // N32
  3: 2.9, // N24
  4: 2.18, // N16
  5: 1.81, // N12
  6: 1.45, // N8
  7: 0.91, // N5
  8: 0.54, // N3
};

describe('LAYER 1 — ISO 8596 mm ground truth (no screen, no DPR)', () => {
  describe('Far vision — all 20 Snellen levels', () => {
    it('has exactly 20 levels in the correct order (20/400 → 20/5)', () => {
      expect(farVisionLevels).toHaveLength(20);
      expect(farVisionLevels[0].score).toBe('20/400');
      expect(farVisionLevels[13].score).toBe('20/20');
      expect(farVisionLevels[19].score).toBe('20/5');
    });

    it('ISO 8596 §4.1 anchor: 20/20 at 6 m = 8.73 mm (5 arc-minutes)', () => {
      // This single value is the origin of the entire standard.
      // If it fails, every downstream calculation is invalid.
      expect(calculateFarFontSize(6, 6)).toBeCloseTo(8.73, 2);
      expect(calculateSnellenOptotypeHeightMm(20, 6)).toBeCloseTo(8.73, 2);
    });

    // Exhaustive golden-table: every level must match the independently computed
    // ISO mm height to within 0.005 mm (~0.05% tolerance).
    it.each(farVisionLevels.map((l) => [l.level, l.n, l.score] as const))(
      'Level %i (%s) → mm matches ISO golden value (±0.005 mm)',
      (level, n) => {
        expect(calculateFarFontSize(n, 6)).toBeCloseTo(ISO_FAR_MM_6M[level], 2);
      }
    );

    // Structure validation: ratio of any level to the 20/20 anchor must equal
    // its Snellen denominator ratio to within 0.1%.
    // NOTE: small deviation expected at large optotypes (20/400 ≈ 1.67°) because
    // the exact tan() model is non-linear — this is correct behaviour.
    it.each(farVisionLevels.map((l) => [l.score, l.n] as const))(
      'Snellen ratio structure holds for %s (within 0.1%%)',
      (score, n) => {
        const denom = Number(score.split('/')[1]);
        const expectedRatio = denom / 20;
        const actualRatio = calculateFarFontSize(n, 6) / calculateFarFontSize(6, 6);
        expect(Math.abs(actualRatio - expectedRatio) / expectedRatio).toBeLessThan(0.001);
      }
    );

    it('scales linearly with distance — same visual angle preserved', () => {
      for (const { n } of farVisionLevels) {
        const at6 = calculateFarFontSize(n, 6);
        expect(calculateFarFontSize(n, 3)).toBeCloseTo(at6 / 2, 4);
        expect(calculateFarFontSize(n, 12)).toBeCloseTo(at6 * 2, 4);
      }
    });

    it('is strictly monotone decreasing from Level 1 to Level 20', () => {
      const heights = farVisionLevels.map((l) => calculateFarFontSize(l.n, 6));
      for (let i = 1; i < heights.length; i++) {
        expect(heights[i]).toBeLessThan(heights[i - 1]);
      }
    });

    it('delegates to exact Snellen trig model (calculateSnellenOptotypeHeightMm)', () => {
      for (const { n } of farVisionLevels) {
        expect(calculateFarFontSize(n, 6)).toBeCloseTo(
          calculateSnellenOptotypeHeightMm(n / 0.3, 6),
          6
        );
      }
    });
  });

  describe('Near vision — all 8 N-notation levels', () => {
    it('has exactly 8 levels in the correct order (N64 → N3)', () => {
      expect(nearVisionLevels).toHaveLength(8);
      expect(nearVisionLevels[0].score).toBe('N64');
      expect(nearVisionLevels[7].score).toBe('N3');
    });

    it.each(nearVisionLevels.map((l) => [l.level, l.size, l.score] as const))(
      'Level %i (%s) → at 40 cm = exactly the N value in mm (definition)',
      (level, size) => {
        // At standard distance the N value IS the height — no formula, just identity.
        expect(calculateNearFontSize(size, 0.4)).toBeCloseTo(ISO_NEAR_MM_40CM[level], 4);
      }
    );

    it('scales linearly with distance for every level', () => {
      for (const { size } of nearVisionLevels) {
        const at40 = calculateNearFontSize(size, 0.4);
        expect(calculateNearFontSize(size, 0.8)).toBeCloseTo(at40 * 2, 5);
        expect(calculateNearFontSize(size, 0.2)).toBeCloseTo(at40 / 2, 5);
      }
    });

    it('is strictly monotone decreasing from Level 1 (N64) to Level 8 (N3)', () => {
      const heights = nearVisionLevels.map((l) => calculateNearFontSize(l.size, 0.4));
      for (let i = 1; i < heights.length; i++) {
        expect(heights[i]).toBeLessThan(heights[i - 1]);
      }
    });
  });

  describe('Contrast vision — all 16 Pelli-Robson levels', () => {
    it('has exactly 16 levels from logCS 0.00 to 2.25', () => {
      expect(contrastVisionLevels).toHaveLength(16);
      expect(contrastVisionLevels[0].score).toBe('0.00');
      expect(contrastVisionLevels[15].score).toBe('2.25');
    });

    // Pelli-Robson: contrast% = 100 × 10^(-logCS)
    it.each(contrastVisionLevels.map((l) => [l.level, l.score, l.contrastPercent] as const))(
      'Level %i (logCS %s) → stored contrast% matches 100·10^(-logCS) (±0.05%%)',
      (_level, score, contrastPercent) => {
        const expected = 100 * Math.pow(10, -parseFloat(score));
        expect(contrastPercent).toBeCloseTo(expected, 1);
      }
    );

    it('logCS step is exactly 0.15 per level (standard Pelli-Robson step)', () => {
      for (let i = 1; i < contrastVisionLevels.length; i++) {
        const step =
          parseFloat(contrastVisionLevels[i].score) - parseFloat(contrastVisionLevels[i - 1].score);
        expect(step).toBeCloseTo(0.15, 5);
      }
    });

    it('contrast% is strictly monotone decreasing', () => {
      const pct = contrastVisionLevels.map((l) => l.contrastPercent);
      for (let i = 1; i < pct.length; i++) {
        expect(pct[i]).toBeLessThan(pct[i - 1]);
      }
    });
  });

  describe('resolveContrastFontFarN — contrast exam letter size vs far acuity', () => {
    it('defaults to 20/100 baseline when no far level', () => {
      expect(resolveContrastFontFarN(null)).toBe(CONTRAST_BASELINE_FAR_N);
      expect(CONTRAST_BASELINE_FAR_N).toBe(30);
    });

    it('keeps 20/100 when far acuity is better (20/80)', () => {
      expect(resolveContrastFontFarN(8)).toBe(30); // level 8 = 20/80, n=24 < 30
    });

    it('uses far acuity when worse than 20/100 (20/160)', () => {
      expect(resolveContrastFontFarN(5)).toBe(48); // level 5 = 20/160, n=48
    });
  });

  describe('Stereopsis — arcsec thresholds + legacy PNG assets', () => {
    it('has 11 arcsec threshold entries for Titmus RDS', () => {
      expect(stereopsisLevels).toHaveLength(11);
      expect(stereopsisLevels[0].level).toBe(800);
      expect(stereopsisLevels[stereopsisLevels.length - 1].level).toBe(20);
    });

    it.each(Array.from({ length: 10 }, (_, i) => i + 1))(
      'Level %i → (11 − level) arc-seconds, correct image files',
      (level) => {
        const arcsec = 11 - level;
        const fileNum = String(arcsec).padStart(2, '0');
        const imgs = stereopsisImages.filter((img) => img.level === level);
        expect(imgs.length).toBeGreaterThanOrEqual(2);
        for (const img of imgs) {
          expect(img.display).toMatch(new RegExp(`^(bd|fd)${fileNum}s\\d$`));
        }
        expect(imgs.some((i) => i.display.startsWith('fd'))).toBe(true);
        expect(imgs.some((i) => i.display.startsWith('bd'))).toBe(true);
      }
    );
  });
});

// ============================================================================
// LAYER 2 — mm → CSS PIXEL CONVERSION (screen + DPR dependent)
// ============================================================================
describe('LAYER 2 — mm → CSS pixel conversion (24" 1080p reference screen)', () => {
  // Reference screen. PPI = sqrt(1920²+1080²)/24 ≈ 91.79.
  const SCREEN: ScreenInfo = { screenWidth: 1920, screenHeight: 1080, diagonalInch: 24 };
  const PPI = Math.sqrt(1920 ** 2 + 1080 ** 2) / 24; // ≈ 91.79

  it('PPI of reference screen is ≈ 91.79', () => {
    expect(calculatePPI(SCREEN)).toBeCloseTo(91.79, 1);
  });

  it('1 inch (25.4 mm) converts to exactly PPI CSS pixels at DPR=1', () => {
    expect(mmToPixels(25.4, SCREEN)).toBeCloseTo(PPI, 1);
    expect(mmToCssPixels(25.4, SCREEN, 1)).toBeCloseTo(PPI, 1);
  });

  it('DPR=2 halves CSS pixel count for the same physical mm', () => {
    const px1 = mmToCssPixels(8.73, SCREEN, 1);
    const px2 = mmToCssPixels(8.73, SCREEN, 2);
    expect(px2).toBeCloseTo(px1 / 2, 4);
  });

  it('20/20 anchor (8.727 mm) → ≈ 31.54 CSS px at DPR=1 on 24" 1080p', () => {
    // Concrete golden pixel count: if this changes the screen formula is broken.
    const mm = calculateFarFontSize(6, 6);
    expect(mmToCssPixels(mm, SCREEN, 1)).toBeCloseTo(31.54, 1);
  });

  it('all far levels produce positive, finite, ordered CSS px', () => {
    const pxValues = farVisionLevels.map((l) =>
      mmToCssPixels(calculateFarFontSize(l.n, 6), SCREEN, 1)
    );
    for (let i = 1; i < pxValues.length; i++) {
      expect(pxValues[i]).toBeGreaterThan(0);
      expect(pxValues[i]).toBeLessThan(pxValues[i - 1]); // monotone
    }
  });

  it('cap-height compensation inflates CSS font-size so glyph height = target', () => {
    const targetMm = 11.64;
    const ratio = 0.7;
    const cssFontSize = calculateCssFontSizeForTargetHeightMm(targetMm, SCREEN, {
      devicePixelRatio: 1,
      capHeightRatio: ratio,
    });
    // glyph visual height = cssFontSize × capHeightRatio == target px
    expect(cssFontSize * ratio).toBeCloseTo(mmToCssPixels(targetMm, SCREEN, 1), 4);
    expect(cssFontSize).toBeGreaterThan(mmToCssPixels(targetMm, SCREEN, 1));
  });
});

// ============================================================================
// LAYER 3 — PHYSICAL SIZE INDEPENDENCE (DPR-invariance proof)
// ============================================================================
describe('LAYER 3 — physical mm on glass is identical across DPR', () => {
  const SCREEN: ScreenInfo = { screenWidth: 1920, screenHeight: 1080, diagonalInch: 24 };
  const PX_PER_MM = calculatePPI(SCREEN) / 25.4;
  const DPRS = [1, 1.25, 1.5, 2, 2.25];

  // physicalMm = cssPx × DPR / physicalPixelsPerMm
  function physMm(cssPx: number, dpr: number) {
    return (cssPx * dpr) / PX_PER_MM;
  }

  it('20/20 anchor: physical mm stays 8.73 across all tested DPRs', () => {
    const mm = calculateFarFontSize(6, 6);
    for (const dpr of DPRS) {
      const cssPx = mmToCssPixels(mm, SCREEN, dpr);
      expect(physMm(cssPx, dpr)).toBeCloseTo(mm, 3);
    }
  });

  it('every far level: physical mm is DPR-independent', () => {
    for (const { n } of farVisionLevels) {
      const targetMm = calculateFarFontSize(n, 6);
      for (const dpr of DPRS) {
        expect(physMm(mmToCssPixels(targetMm, SCREEN, dpr), dpr)).toBeCloseTo(targetMm, 3);
      }
    }
  });

  it('every near level: physical mm is DPR-independent', () => {
    for (const { size } of nearVisionLevels) {
      const targetMm = calculateNearFontSize(size, 0.4);
      for (const dpr of DPRS) {
        expect(physMm(mmToCssPixels(targetMm, SCREEN, dpr), dpr)).toBeCloseTo(targetMm, 4);
      }
    }
  });

  it('eye-exam bug proof: no-DPR-division oversize == DPR factor at DPR=2', () => {
    // Legacy formula (eye-exam): cssPx = mm × physPxPerMm (never divides by DPR)
    // Physical result: legacyPhysMm = mm × physPxPerMm × 2 / physPxPerMm = mm × 2
    const targetMm = calculateFarFontSize(6, 6);
    const legacyCssPx = mmToPixels(targetMm, SCREEN); // ≡ eye-exam (no DPR division)
    const correctCssPx = mmToCssPixels(targetMm, SCREEN, 2);

    expect(physMm(legacyCssPx, 2) / physMm(correctCssPx, 2)).toBeCloseTo(2, 3);
  });
});

describe('Vision Notation Formatting', () => {
  describe('formatVisionLevel', () => {
    it('should format far vision levels correctly', () => {
      expect(formatVisionLevel('far', 14)).toBe('20/20'); // Level 14 = 20/20
      expect(formatVisionLevel('far', 1)).toBe('20/400'); // Level 1 = 20/400
      expect(formatVisionLevel('far', 20)).toBe('20/5'); // Level 20 = 20/5
    });

    it('should format near vision levels correctly', () => {
      // Near vision levels are indexed differently - check actual data
      const result1 = formatVisionLevel('near', 1);
      const result6 = formatVisionLevel('near', 6);

      // Just verify they return valid N notation
      expect(result1).toMatch(/^N\d+$/);
      expect(result6).toMatch(/^N\d+$/);
    });

    it('should format contrast levels correctly', () => {
      expect(formatVisionLevel('contrast', 3)).toBe('0.30');
      expect(formatVisionLevel('contrast', 14)).toBe('1.95');
    });

    it('should format stereopsis as arcsec or legacy Lv', () => {
      expect(formatVisionLevel('stereopsis', 40)).toBe('40″');
      expect(formatVisionLevel('stereopsis', 5)).toBe('Lv 5');
    });

    it('should handle null/undefined values', () => {
      expect(formatVisionLevel('far', null)).toBe('-');
      expect(formatVisionLevel('far', undefined)).toBe('-');
    });

    it('should handle invalid values', () => {
      expect(formatVisionLevel('far', 'invalid')).toBe('-');
    });

    it('should handle unknown exam types', () => {
      expect(formatVisionLevel('unknown', 5)).toBe('Lv 5');
    });
  });

  describe('mapExamResultLevelsForChart', () => {
    it('returns null instead of 0 for missing levels', () => {
      expect(toExamChartVisionLevel(null)).toBeNull();
      expect(toExamChartVisionLevel(0)).toBeNull();
      expect(toExamChartVisionLevel(7)).toBe(7);
      expect(mapExamResultLevelsForChart('far', { leftEyeLevel: null, rightEyeLevel: null })).toBeNull();
      expect(mapExamResultLevelsForChart('far', { leftEyeLevel: 7, rightEyeLevel: null })).toEqual({
        leftEye: 7,
        rightEye: null,
      });
    });
  });

  describe('getExamSetupVisionResultSource', () => {
    it('uses far acuity for contrast exam setup display', () => {
      expect(getExamSetupVisionResultSource('contrast')).toBe('far');
      expect(getExamSetupVisionResultSource('far')).toBe('far');
      expect(getExamSetupVisionResultSource('near')).toBe('near');
    });
  });

  describe('getVisionExamChartYAxisConfig', () => {
    it('uses discrete contrast log scores on Y-axis (no Lv fractions)', () => {
      const config = getVisionExamChartYAxisConfig('contrast', [
        { leftEye: 3, rightEye: 6 },
        { leftEye: 5, rightEye: 8 },
      ]);

      expect(config.ticks.every((t) => Number.isInteger(t))).toBe(true);
      expect(config.tickFormatter(1.5)).toBe('');
      expect(config.tickFormatter(3)).toBe('0.30');
      expect(config.tickFormatter(6)).toBe('0.75');
      expect(config.tickFormatter(8)).toBe('1.05');
      expect(config.reversed).toBe(false);
    });

    it('formats far vision ticks as Snellen notation', () => {
      const config = getVisionExamChartYAxisConfig('far', [{ leftEye: 10, rightEye: 14 }]);
      expect(config.tickFormatter(10)).toBe('20/50');
      expect(config.tickFormatter(14)).toBe('20/20');
      expect(config.tickFormatter(10.5)).toBe('');
    });
  });

  describe('formatBinocularVision', () => {
    it('should format both eyes correctly', () => {
      const result = formatBinocularVision('far', 14, 12);
      expect(result.left).toBe('20/20');
      expect(result.right).toBeDefined();
    });

    it('should handle null values', () => {
      const result = formatBinocularVision('far', null, null);
      expect(result.left).toBe('-');
      expect(result.right).toBe('-');
    });
  });
});

describe('Screen Calculation Utilities', () => {
  const mockScreenInfo: ScreenInfo = {
    screenWidth: 1920,
    screenHeight: 1080,
    diagonalInch: 24,
  };

  describe('calculatePPI', () => {
    it('should calculate PPI correctly', () => {
      const ppi = calculatePPI(mockScreenInfo);

      // Expected: sqrt(1920^2 + 1080^2) / 24 ≈ 91.79
      expect(ppi).toBeCloseTo(91.79, 1);
    });

    it('should throw error for invalid screen info', () => {
      expect(() => calculatePPI({ ...mockScreenInfo, diagonalInch: 0 })).toThrow();
      expect(() => calculatePPI({ ...mockScreenInfo, diagonalInch: -1 })).toThrow();
    });
  });

  describe('mmToPixels', () => {
    it('should convert mm to pixels correctly', () => {
      const pixels = mmToPixels(25.4, mockScreenInfo); // 1 inch in mm
      const ppi = calculatePPI(mockScreenInfo);

      // 25.4mm = 1 inch, so should equal PPI
      expect(pixels).toBeCloseTo(ppi, 1);
    });

    it('should throw error for invalid size', () => {
      expect(() => mmToPixels(0, mockScreenInfo)).toThrow();
      expect(() => mmToPixels(-1, mockScreenInfo)).toThrow();
    });
  });

  describe('mmToCssPixels', () => {
    it('should normalize physical pixels by device pixel ratio', () => {
      const physicalPixels = mmToPixels(25.4, mockScreenInfo);
      const cssPixels = mmToCssPixels(25.4, mockScreenInfo, 2);

      expect(cssPixels).toBeCloseTo(physicalPixels / 2, 1);
    });
  });

  describe('pixelsToMm', () => {
    it('should convert pixels to mm correctly', () => {
      const ppi = calculatePPI(mockScreenInfo);
      const mm = pixelsToMm(ppi, mockScreenInfo);

      // PPI pixels should equal 25.4mm (1 inch)
      expect(mm).toBeCloseTo(25.4, 1);
    });

    it('should be inverse of mmToPixels', () => {
      const originalMm = 10;
      const pixels = mmToPixels(originalMm, mockScreenInfo);
      const backToMm = pixelsToMm(pixels, mockScreenInfo);

      expect(backToMm).toBeCloseTo(originalMm, 5);
    });
  });
});

describe('Vision Font Size Calculations', () => {
  describe('Centralized clinical formulas', () => {
    const mockScreenInfo: ScreenInfo = {
      screenWidth: 1920,
      screenHeight: 1080,
      diagonalInch: 24,
    };

    it('should compute 20/32 optotype height at 5m to about 11.64mm', () => {
      const sizeMm = calculateSnellenOptotypeHeightMm(32, 5);
      expect(sizeMm).toBeCloseTo(11.64, 2);
    });

    it('should compensate cap-height ratio when converting target mm to CSS font-size', () => {
      const targetHeightMm = 11.64; // 20/32 at 5m
      const ratio = 0.7;
      const cssFontSize = calculateCssFontSizeForTargetHeightMm(targetHeightMm, mockScreenInfo, {
        devicePixelRatio: 1,
        capHeightRatio: ratio,
      });

      const expectedGlyphHeightCssPx = mmToCssPixels(targetHeightMm, mockScreenInfo, 1);
      expect(cssFontSize * ratio).toBeCloseTo(expectedGlyphHeightCssPx, 4);
      expect(cssFontSize).toBeGreaterThan(expectedGlyphHeightCssPx);
    });

    it('should derive 2048 transform scale from calibrated font-size', () => {
      const fontSize = 66;
      expect(calc2048Scale(fontSize, 55)).toBeCloseTo(1.2, 5);
      expect(calc2048Scale(undefined, 55, 1.8)).toBeCloseTo(1.8, 5);
    });

    it('should resolve effective 2048 scale directly from visual settings', () => {
      expect(get2048EffectiveScale({ fontSize: 66, scaleFactor: 1.1 })).toBeCloseTo(1.2, 5);
      expect(get2048EffectiveScale({ scaleFactor: 1.8 })).toBeCloseTo(1.8, 5);
      expect(get2048EffectiveScale(undefined)).toBeCloseTo(1, 5);
    });
  });

  describe('calculateFarFontSize', () => {
    it('should calculate font size for 20/20 vision at 6m', () => {
      // n=6 for 20/20 vision, distance=6m
      const fontSize = calculateFarFontSize(6, 6);

      // Expected: (6/6) * 8.73 * (6/6) = 8.73mm
      expect(fontSize).toBeCloseTo(8.73, 2);
    });

    it('should scale with distance', () => {
      const fontSize6m = calculateFarFontSize(6, 6);
      const fontSize3m = calculateFarFontSize(6, 3);

      // At half distance, font should be half size
      expect(fontSize3m).toBeCloseTo(fontSize6m / 2, 2);
    });

    it('should scale with n value', () => {
      const fontSizeN6 = calculateFarFontSize(6, 6);
      const fontSizeN12 = calculateFarFontSize(12, 6);

      // Double n should give double font size
      expect(fontSizeN12).toBeCloseTo(fontSizeN6 * 2, 2);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateFarFontSize(0, 6)).toThrow();
      expect(() => calculateFarFontSize(6, 0)).toThrow();
      expect(() => calculateFarFontSize(-1, 6)).toThrow();
    });
  });

  describe('calculateNearFontSize', () => {
    it('should return same size at standard distance (40cm)', () => {
      const sizeMm = 1.45; // N8
      const fontSize = calculateNearFontSize(sizeMm, 0.4);

      // At standard distance, should return same size
      expect(fontSize).toBeCloseTo(sizeMm, 5);
    });

    it('should scale with distance', () => {
      const sizeMm = 1.45; // N8
      const fontSize40cm = calculateNearFontSize(sizeMm, 0.4);
      const fontSize80cm = calculateNearFontSize(sizeMm, 0.8);

      // At double distance, font should be double size
      expect(fontSize80cm).toBeCloseTo(fontSize40cm * 2, 5);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateNearFontSize(0, 0.4)).toThrow();
      expect(() => calculateNearFontSize(1.45, 0)).toThrow();
      expect(() => calculateNearFontSize(-1, 0.4)).toThrow();
    });
  });
});

describe('Game Scaling Functions', () => {
  describe('calculateScaledSizes', () => {
    it('should scale all sizes by scale factor', () => {
      const scaleFactor = 2;
      const scaled = calculateScaledSizes(scaleFactor);

      expect(scaled.fontSize).toBe(DEFAULT_GAME_SIZES.fontSize * scaleFactor);
      expect(scaled.tileSize).toBe(DEFAULT_GAME_SIZES.tileSize * scaleFactor);
      expect(scaled.spacing).toBe(DEFAULT_GAME_SIZES.spacing * scaleFactor);
    });

    it('should clamp scale factor between 0.1 and 5.0', () => {
      const scaledTooSmall = calculateScaledSizes(0.01);
      const scaledTooBig = calculateScaledSizes(10);

      // Should be clamped to 0.1
      expect(scaledTooSmall.fontSize).toBe(Math.round(DEFAULT_GAME_SIZES.fontSize * 0.1));

      // Should be clamped to 5.0
      expect(scaledTooBig.fontSize).toBe(Math.round(DEFAULT_GAME_SIZES.fontSize * 5.0));
    });

    it('should use custom base sizes if provided', () => {
      const customSizes = {
        fontSize: 20,
        tileSize: 80,
        spacing: 10,
        boardSize: 320,
        borderRadius: 8,
        padding: 20,
      };

      const scaled = calculateScaledSizes(2, customSizes);

      expect(scaled.fontSize).toBe(40);
      expect(scaled.tileSize).toBe(160);
    });
  });

  describe('getResponsiveScaleFactor', () => {
    it('should reduce scale factor for mobile screens', () => {
      const baseScale = 1.0;
      const mobileScale = getResponsiveScaleFactor(baseScale, 600);

      expect(mobileScale).toBe(0.8);
    });

    it('should slightly reduce scale factor for tablet screens', () => {
      const baseScale = 1.0;
      const tabletScale = getResponsiveScaleFactor(baseScale, 900);

      expect(tabletScale).toBe(0.9);
    });

    it('should use full scale factor for desktop screens', () => {
      const baseScale = 1.0;
      const desktopScale = getResponsiveScaleFactor(baseScale, 1200);

      expect(desktopScale).toBe(1.0);
    });
  });
});

describe('Display Utilities', () => {
  describe('calculateOptimalCharCount', () => {
    it('should return 1 for very large fonts', () => {
      const count = calculateOptimalCharCount(500, 800, 'A');
      expect(count).toBe(1);
    });

    it('should return more chars for smaller fonts', () => {
      const countSmall = calculateOptimalCharCount(16, 800, 'A');
      const countLarge = calculateOptimalCharCount(200, 800, 'A');

      // Smaller font should allow more or equal chars (both capped at 5)
      expect(countSmall).toBeGreaterThanOrEqual(countLarge);
    });

    it('should be capped at 5', () => {
      const count = calculateOptimalCharCount(8, 2000, 'A');
      expect(count).toBeLessThanOrEqual(5);
    });

    it('should be at least 1', () => {
      const count = calculateOptimalCharCount(1000, 100, 'A');
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateMaxCharsPerBatch', () => {
    it('should align with total char capacity when both use same width model', () => {
      const fontSizePx = 24;
      const screenWidth = 120;
      const charType = 'A';

      const totalChars = calculateOptimalCharCount(fontSizePx, screenWidth, charType);
      const maxPerBatch = calculateMaxCharsPerBatch(fontSizePx, screenWidth, charType, totalChars);

      // ISO 8596 spacing = 1.0× fontSizePx (gap between optotypes = 1 letter height).
      // Total width for N chars = N × fontSizePx + (N-1) × fontSizePx = (2N-1) × fontSizePx.
      // 3 chars: (2×3-1) × 24 = 5 × 24 = 120px ≤ 120px ✓
      // 4 chars: (2×4-1) × 24 = 7 × 24 = 168px > 120px ✗
      expect(totalChars).toBe(3);
      expect(maxPerBatch).toBe(totalChars);
    });

    it('should never exceed totalChars', () => {
      const maxPerBatch = calculateMaxCharsPerBatch(16, 300, 'A', 3);
      expect(maxPerBatch).toBeLessThanOrEqual(3);
      expect(maxPerBatch).toBeGreaterThanOrEqual(1);
    });

    // BUG-01: calculateOptimalCharCount and calculateMaxCharsPerBatch must use the same
    // character-width model. When the two diverged (spacing formula mismatch), chars were
    // truncated mid-row. These tests lock the contract at realistic vision-level font sizes.
    describe('BUG-01: char count consistency across vision levels', () => {
      const screenWidth = 800; // common tablet/desktop width in pixels

      it('large font (far vision level 1, ~120px): both functions agree on row capacity', () => {
        const fontSizePx = 120;
        const charType = 'E';
        const totalChars = calculateOptimalCharCount(fontSizePx, screenWidth, charType);
        const maxPerBatch = calculateMaxCharsPerBatch(
          fontSizePx,
          screenWidth,
          charType,
          totalChars
        );

        // maxPerBatch must equal totalChars — truncation means they diverged
        expect(maxPerBatch).toBe(totalChars);
        // At 120px font on 800px screen, at most a handful of chars fit
        expect(totalChars).toBeGreaterThanOrEqual(1);
        expect(totalChars).toBeLessThanOrEqual(8);
      });

      it('medium font (far vision level 7, ~48px): both functions agree on row capacity', () => {
        const fontSizePx = 48; // reported bug level in user screenshot
        const charType = 'E';
        const totalChars = calculateOptimalCharCount(fontSizePx, screenWidth, charType);
        const maxPerBatch = calculateMaxCharsPerBatch(
          fontSizePx,
          screenWidth,
          charType,
          totalChars
        );

        expect(maxPerBatch).toBe(totalChars);
        expect(totalChars).toBeGreaterThanOrEqual(1);
      });

      it('small font (far vision level 20, ~12px): both functions agree on row capacity', () => {
        const fontSizePx = 12;
        const charType = 'E';
        const totalChars = calculateOptimalCharCount(fontSizePx, screenWidth, charType);
        const maxPerBatch = calculateMaxCharsPerBatch(
          fontSizePx,
          screenWidth,
          charType,
          totalChars
        );

        expect(maxPerBatch).toBe(totalChars);
        // At least 1 char must fit on even the smallest practical font size
        expect(totalChars).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('calculateTotalWidth', () => {
    it('should calculate total width including spacing', () => {
      const fontSize = 16;
      const charCount = 3;
      const charType = 'A';

      const totalWidth = calculateTotalWidth(fontSize, charCount, charType);
      const spacing = getCharSpacing(fontSize, charCount);

      // calculateTotalWidth uses actual box width (fontSizePx), not glyph estimate,
      // so that calculateOptimalCharCount correctly predicts viewport overflow.
      const expected = fontSize * charCount + spacing * (charCount - 1);
      expect(totalWidth).toBe(expected);
    });
  });

  describe('exam screen recommendation (layout-aligned)', () => {
    it('row width factor matches calculateTotalWidth for 5 chars', () => {
      expect(getExamRowWidthFactor(5)).toBe(9);
      expect(calculateTotalWidth(100, 5, 'A') / 100).toBe(9);
    });

    it('15.6" 1920×1080 fits ~3 chars at 20/200 / 5m — not 5 (matches live exam)', () => {
      const charHeightMm = calculateFarFontSize(farVisionLevels[3].n, 5);
      const screen156 = { diagonalInch: 15.6, screenWidth: 1920, screenHeight: 1080 };
      const fit = countExamCharsFitOnRow(charHeightMm, screen156, { charType: 'A' });
      expect(fit).toBeGreaterThanOrEqual(2);
      expect(fit).toBeLessThan(5);
    });

    it('min diagonal for 5×20/200 exceeds legacy 5.8×h formula and 15.6" laptop', () => {
      const charHeightMm = calculateFarFontSize(farVisionLevels[3].n, 5);
      const minDiag = calculateMinDiagonalInchForExamRow(charHeightMm);

      const diagPx = Math.sqrt(1920 ** 2 + 1080 ** 2);
      const legacyMinDiag =
        Math.round((diagPx / ((1920 * 25.4) / (5.8 * charHeightMm))) * 10) / 10;

      expect(minDiag).toBeGreaterThan(legacyMinDiag);
      expect(minDiag).toBeGreaterThan(15.6);
    });
  });

  describe('buildExamDisplayStrategy (live exam batch layout)', () => {
    const wideScreen: ScreenInfo = { diagonalInch: 15.6, screenWidth: 3024, screenHeight: 1964 };
    const viewportCss = 1512;

    it('near N64 @ 0.4m on wide screen shows all 5 chars in one batch', () => {
      const fontSizeMm = calculateNearFontSize(nearVisionLevels[0].size, 0.4);
      const strategy = buildExamDisplayStrategy({
        fontSizeMm,
        screenInfo: wideScreen,
        charType: 'A',
        viewportWidthPx: viewportCss,
      });
      expect(strategy.maxCharsPerBatch).toBe(5);
      expect(strategy.batches).toEqual([5]);
    });

    it('near N64 @ 5m (wrong default) splits into smaller batches — regression guard', () => {
      const fontSizeMm = calculateNearFontSize(nearVisionLevels[0].size, 5);
      const strategy = buildExamDisplayStrategy({
        fontSizeMm,
        screenInfo: wideScreen,
        charType: 'A',
        viewportWidthPx: viewportCss,
      });
      expect(strategy.maxCharsPerBatch).toBeLessThan(5);
      expect(strategy.batches.reduce((a, b) => a + b, 0)).toBe(5);
    });

    it('uses viewport width, not monitor pixel width, for batch capacity', () => {
      const fontSizeMm = calculateNearFontSize(nearVisionLevels[0].size, 0.4);
      const narrow = buildExamDisplayStrategy({
        fontSizeMm,
        screenInfo: wideScreen,
        charType: 'A',
        viewportWidthPx: 600,
      });
      const wide = buildExamDisplayStrategy({
        fontSizeMm,
        screenInfo: wideScreen,
        charType: 'A',
        viewportWidthPx: 1512,
      });
      expect(wide.maxCharsPerBatch).toBeGreaterThan(narrow.maxCharsPerBatch);
    });
  });
});

describe('Exam Utilities', () => {
  describe('generateRandomText', () => {
    it('should generate correct number of characters', () => {
      const result = generateRandomText(5, 'E');
      expect(result).toHaveLength(5);
    });

    it('should not repeat consecutive characters', () => {
      // Run multiple times to test randomness
      for (let i = 0; i < 10; i++) {
        const result = generateRandomText(5, 'A');

        for (let j = 0; j < result.length - 1; j++) {
          expect(result[j].display).not.toBe(result[j + 1].display);
        }
      }
    });

    it('should set correct char type', () => {
      const result = generateRandomText(3, 'E');

      result.forEach((item) => {
        expect(item.char).toBe('E');
      });
    });

    it('should work for all character types', () => {
      const charTypes: ('E' | 'C' | 'A' | 'N' | 'S')[] = ['E', 'C', 'A', 'N', 'S'];

      charTypes.forEach((charType) => {
        const result = generateRandomText(3, charType);
        expect(result).toHaveLength(3);
        expect(result[0].char).toBe(charType);
      });
    });
  });

  describe('generateRandomStereopsisTest', () => {
    it('should generate correct number of test items', () => {
      const result = generateRandomStereopsisTest(1, 2);
      expect(result).toHaveLength(2);
    });

    it('should generate items for valid level', () => {
      // Test all 10 levels
      for (let level = 1; level <= 10; level++) {
        const result = generateRandomStereopsisTest(level, 2);
        expect(result.length).toBeGreaterThan(0);
        expect(result.length).toBeLessThanOrEqual(2);
      }
    });

    it('should return empty array for invalid level', () => {
      const result = generateRandomStereopsisTest(99, 2);
      expect(result).toHaveLength(0);
    });

    it('should set char to I for Image', () => {
      const result = generateRandomStereopsisTest(1, 2);
      result.forEach((item) => {
        expect(item.char).toBe('I');
      });
    });

    it('should have display property from stereopsisImages', () => {
      const result = generateRandomStereopsisTest(1, 2);
      result.forEach((item) => {
        expect(item.display).toBeDefined();
        expect(typeof item.display).toBe('string');
        // Should match pattern: bd10s0, fd10s1, etc.
        expect(item.display).toMatch(/^(bd|fd)\d{2}s\d$/);
      });
    });

    it('should randomize selection from available images', () => {
      // Level 1 has 4 images (bd10s0, bd10s1, fd10s0, fd10s1)
      const results = new Set();

      // Generate multiple times to test randomness
      for (let i = 0; i < 20; i++) {
        const result = generateRandomStereopsisTest(1, 1);
        if (result.length > 0) {
          results.add(result[0].display);
        }
      }

      // Should have selected different images (at least 2 different ones)
      expect(results.size).toBeGreaterThan(1);
    });

    it('should not exceed available images for level', () => {
      // Level 1 has 4 images
      const result = generateRandomStereopsisTest(1, 10);
      expect(result.length).toBeLessThanOrEqual(4);
    });
  });

  describe('getStereopsisImagePath', () => {
    it('should generate correct path for bd10s0 (Level 1)', () => {
      const path = getStereopsisImagePath('bd10s0');
      expect(path).toBe('/stereopsis/10/bd10s0.png');
    });

    it('should generate correct path for bd01s0 (Level 10)', () => {
      const path = getStereopsisImagePath('bd01s0');
      expect(path).toBe('/stereopsis/1/bd01s0.png');
    });

    it('should generate correct path for fd05s1 (Level 6)', () => {
      const path = getStereopsisImagePath('fd05s1');
      expect(path).toBe('/stereopsis/5/fd05s1.png');
    });

    it('should extract level correctly from filename', () => {
      // Test all levels
      const testCases = [
        { filename: 'bd10s0', expectedLevel: '10' },
        { filename: 'bd09s0', expectedLevel: '9' },
        { filename: 'bd08s0', expectedLevel: '8' },
        { filename: 'bd07s0', expectedLevel: '7' },
        { filename: 'bd06s0', expectedLevel: '6' },
        { filename: 'bd05s0', expectedLevel: '5' },
        { filename: 'bd04s0', expectedLevel: '4' },
        { filename: 'bd03s0', expectedLevel: '3' },
        { filename: 'bd02s0', expectedLevel: '2' },
        { filename: 'bd01s0', expectedLevel: '1' },
      ];

      testCases.forEach(({ filename, expectedLevel }) => {
        const path = getStereopsisImagePath(filename);
        expect(path).toBe(`/stereopsis/${expectedLevel}/${filename}.png`);
      });
    });

    it('should work for both bd and fd prefixes', () => {
      const pathBd = getStereopsisImagePath('bd05s0');
      const pathFd = getStereopsisImagePath('fd05s0');

      expect(pathBd).toBe('/stereopsis/5/bd05s0.png');
      expect(pathFd).toBe('/stereopsis/5/fd05s0.png');
    });

    it('should handle leading zeros correctly', () => {
      // bd01 should extract as "1" not "01"
      const path = getStereopsisImagePath('bd01s0');
      expect(path).toBe('/stereopsis/1/bd01s0.png');
    });
  });

  describe('getCorrectStereopsisAnswer', () => {
    it('should return front for fd prefix', () => {
      expect(getCorrectStereopsisAnswer('fd10s0')).toBe('front');
      expect(getCorrectStereopsisAnswer('fd05s1')).toBe('front');
      expect(getCorrectStereopsisAnswer('fd01s0')).toBe('front');
    });

    it('should return back for bd prefix', () => {
      expect(getCorrectStereopsisAnswer('bd10s0')).toBe('back');
      expect(getCorrectStereopsisAnswer('bd05s1')).toBe('back');
      expect(getCorrectStereopsisAnswer('bd01s0')).toBe('back');
    });

    it('should return none for unknown prefix', () => {
      expect(getCorrectStereopsisAnswer('xx10s0')).toBe('none');
      expect(getCorrectStereopsisAnswer('invalid')).toBe('none');
      expect(getCorrectStereopsisAnswer('')).toBe('none');
    });

    it('should work regardless of suffix', () => {
      expect(getCorrectStereopsisAnswer('fd10s0')).toBe('front');
      expect(getCorrectStereopsisAnswer('fd10s1')).toBe('front');
      expect(getCorrectStereopsisAnswer('fd10s2')).toBe('front');
      expect(getCorrectStereopsisAnswer('fd10s3')).toBe('front');
    });
  });
});

describe('Stereopsis Data Integrity', () => {
  it('should have 10 levels defined', () => {
    const levels = new Set(stereopsisImages.map((img) => img.level));
    expect(levels.size).toBe(10);

    // Check all levels from 1 to 10 exist
    for (let i = 1; i <= 10; i++) {
      expect(levels.has(i)).toBe(true);
    }
  });

  it('should have at least 2 images per level', () => {
    for (let level = 1; level <= 10; level++) {
      const levelImages = stereopsisImages.filter((img) => img.level === level);
      expect(levelImages.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('should have correct filename format for all images', () => {
    stereopsisImages.forEach((img) => {
      // Format: (bd|fd)(01-10)s(0-3)
      expect(img.display).toMatch(/^(bd|fd)(0[1-9]|10)s[0-3]$/);
    });
  });

  it('should map levels correctly to disparity values', () => {
    // Level 1 should use bd10/fd10 (10 arc seconds - easiest)
    const level1Images = stereopsisImages.filter((img) => img.level === 1);
    level1Images.forEach((img) => {
      expect(img.display).toMatch(/^(bd|fd)10s\d$/);
    });

    // Level 10 should use bd01/fd01 (1 arc second - hardest)
    const level10Images = stereopsisImages.filter((img) => img.level === 10);
    level10Images.forEach((img) => {
      expect(img.display).toMatch(/^(bd|fd)01s\d$/);
    });
  });

  it('should have both front and back images for each level', () => {
    for (let level = 1; level <= 10; level++) {
      const levelImages = stereopsisImages.filter((img) => img.level === level);

      const hasFront = levelImages.some((img) => img.display.startsWith('fd'));
      const hasBack = levelImages.some((img) => img.display.startsWith('bd'));

      expect(hasFront).toBe(true);
      expect(hasBack).toBe(true);
    }
  });
});

describe('Vision Calculation Integration', () => {
  /**
   * These tests verify the complete vision calculation pipeline
   * used in Game2048Board and PortalExercise
   */

  it('should calculate consistent font sizes for far vision', () => {
    // Test multiple levels to ensure consistency
    const levels = [1, 5, 10, 14, 20];
    const distance = 6; // Standard 6m

    levels.forEach((level) => {
      // Level 14 = 20/20 = n=6
      // Each level has different n value
      const n = level; // Simplified - actual n comes from farVisionLevels
      const fontSize = calculateFarFontSize(n, distance);

      expect(fontSize).toBeGreaterThan(0);
      expect(fontSize).toBeLessThan(1000); // Sanity check
    });
  });

  it('should calculate consistent font sizes for near vision', () => {
    const sizes = [0.54, 0.72, 1.09, 1.45, 2.18, 2.91]; // N3 to N64
    const distance = 0.4; // Standard 40cm

    sizes.forEach((size) => {
      const fontSize = calculateNearFontSize(size, distance);

      expect(fontSize).toBeGreaterThan(0);
      expect(fontSize).toBe(size); // At standard distance, should equal input
    });
  });

  it('should maintain angular size when distance changes', () => {
    // For near vision: doubling distance should double font size
    const sizeMm = 1.45; // N8

    const fontSize40cm = calculateNearFontSize(sizeMm, 0.4);
    const fontSize80cm = calculateNearFontSize(sizeMm, 0.8);
    const fontSize20cm = calculateNearFontSize(sizeMm, 0.2);

    expect(fontSize80cm / fontSize40cm).toBeCloseTo(2, 5);
    expect(fontSize40cm / fontSize20cm).toBeCloseTo(2, 5);
  });
});

// ============================================================================
// Screenshot-driven clinical accuracy tests
// Screenshot 1 (17.21.17): Level 7 = 20/100, 3 chars shown when 5 would fit
// Screenshot 2 (17.36.47): 2048 tile sizes look the same for 20/400 and 20/100
// Screenshot 3 (14.02.14): Level 12 = 20/32, char size too small for 3m distance
// ============================================================================

describe('ISO 8596 far vision formula accuracy (screenshots 1 & 3)', () => {
  // ISO 8596 standard: 20/20 at 6m = 5 arcmin = 8.73mm letter height
  // Formula: fontSizeMm = (n / 6) * 8.73 * (distance / 6)
  // where n comes from farVisionLevels[level-1].n

  it('20/20 at 6m (Level 14, n=6): exactly 8.73mm — ISO 8596 anchor point', () => {
    // (6/6) * 8.73 * (6/6) = 8.73mm
    expect(calculateFarFontSize(6, 6)).toBeCloseTo(8.73, 2);
  });

  it('20/100 at 5m (Level 7, n=30): ~36.36mm with exact trig model', () => {
    // Exact Snellen-angle model gives ~36.361mm (linear approximation gives 36.375mm).
    expect(calculateFarFontSize(30, 5)).toBeCloseTo(36.361, 2);
  });

  it('20/32 at 3m (Level 12, n=9.6): 6.984mm — screenshot 3 reference point', () => {
    // (9.6/6) * 8.73 * (3/6) = 1.6 * 8.73 * 0.5 = 6.984mm
    expect(calculateFarFontSize(9.6, 3)).toBeCloseTo(6.984, 2);
  });

  it('20/400 at 6m (Level 1, n=120): ~174.55mm with exact trig model', () => {
    // Exact Snellen-angle model gives ~174.545mm (linear approximation gives 174.6mm).
    expect(calculateFarFontSize(120, 6)).toBeCloseTo(174.545, 2);
  });

  it('halving distance halves letter height — same visual angle preserved', () => {
    // This is the clinically correct relationship: closer screen = smaller letter
    // so the angular subtense at the patient's eye stays constant
    const n = 30; // Level 7
    expect(calculateFarFontSize(n, 3)).toBeCloseTo(calculateFarFontSize(n, 6) / 2, 4);
    expect(calculateFarFontSize(n, 1.5)).toBeCloseTo(calculateFarFontSize(n, 6) / 4, 4);
  });

  it('letter height keeps clinical ordering and near-linear ratios', () => {
    // Exact trig model is monotone and very close to linear ratio at clinical angles.
    const d = 6;
    const l1 = calculateFarFontSize(120, d);
    const l7 = calculateFarFontSize(30, d);
    const l12 = calculateFarFontSize(9.6, d);
    const l14 = calculateFarFontSize(6, d);

    expect(l1).toBeGreaterThan(l7);
    expect(l7).toBeGreaterThan(l12);
    expect(l12).toBeGreaterThan(l14);

    expect(l1 / l14).toBeCloseTo(20, 1);
    expect(l7 / l14).toBeCloseTo(5, 2);
    expect(l12 / l14).toBeCloseTo(1.6, 2);
  });
});

describe('mm→CSS-pixel pipeline accuracy (screenshot 3)', () => {
  // Standard reference screen: 24" 1920×1080 at DPR=1
  // PPI = sqrt(1920² + 1080²) / 24 = 91.79
  const screen24in1080p: ScreenInfo = { screenWidth: 1920, screenHeight: 1080, diagonalInch: 24 };

  it('Level 12 (20/32) at 3m on 24" 1920×1080 (DPR=1): renders ~25px CSS', () => {
    // fontSizeMm = 6.984mm, PPI = 91.79 → 6.984 * (91.79/25.4) = 25.24px CSS
    const fontSizeMm = calculateFarFontSize(9.6, 3);
    const cssPx = mmToCssPixels(fontSizeMm, screen24in1080p, 1);
    expect(cssPx).toBeCloseTo(25.24, 0); // within 1px
  });

  it('Level 7 (20/100) at 5m on 24" 1920×1080 (DPR=1): renders ~131px CSS', () => {
    // fontSizeMm = 36.375mm → 36.375 * (91.79/25.4) = 131.45px CSS
    const fontSizeMm = calculateFarFontSize(30, 5);
    const cssPx = mmToCssPixels(fontSizeMm, screen24in1080p, 1);
    expect(cssPx).toBeCloseTo(131.45, 0);
  });

  it('DPR=2 gives exactly half the CSS pixels as DPR=1 for the same screen', () => {
    // On a HiDPI screen, CSS pixels are halved — the formula must reflect this
    const mm = calculateFarFontSize(30, 5);
    const px1 = mmToCssPixels(mm, screen24in1080p, 1);
    const px2 = mmToCssPixels(mm, screen24in1080p, 2);
    expect(px2).toBeCloseTo(px1 / 2, 4);
  });

  it('3m and 6m give proportionally different CSS pixel sizes (0.5 ratio)', () => {
    // Verifies the full mm→px pipeline preserves the distance scaling
    const n = 9.6; // Level 12
    const px3 = mmToCssPixels(calculateFarFontSize(n, 3), screen24in1080p, 1);
    const px6 = mmToCssPixels(calculateFarFontSize(n, 6), screen24in1080p, 1);
    expect(px3 / px6).toBeCloseTo(0.5, 4);
  });
});

describe('BUG-01: char count geometry for realistic exam scenarios (screenshot 1)', () => {
  // Level 7 (20/100, n=30) at 5m default distance, 24" 1920×1080, DPR=1
  // fontSizeMm = 36.375mm → fontSizePx ≈ 131.45 CSS px
  // Available screen = 1920 - 100*2 = 1720px
  // calculateTotalWidth(131.45, 5, 'S') = 131.45*5 + 13.145*4 = 657.25 + 52.58 = 709.83 ≤ 1720
  // → all 5 chars MUST fit on screen

  const screen24: ScreenInfo = { screenWidth: 1920, screenHeight: 1080, diagonalInch: 24 };

  it('Level 7 (20/100, n=30) at 5m: 5 chars fit for all character types on standard screen', () => {
    const fontSizeMm = calculateFarFontSize(30, 5); // 36.375mm
    const fontSizePx = mmToCssPixels(fontSizeMm, screen24, 1); // ≈131.45px
    const available = 1720; // 1920 - 100 reserved per side

    // Widest char type 'S' (multiplier 1.0) is the hardest to fit — must still return 5
    expect(calculateOptimalCharCount(fontSizePx, available, 'S')).toBe(5);
    // Narrowest char type 'E' (multiplier 0.6) — obviously fits
    expect(calculateOptimalCharCount(fontSizePx, available, 'E')).toBe(5);
  });

  it('Level 7: calculateMaxCharsPerBatch == totalChars — no mid-row truncation', () => {
    // BUG-01: before fix, these two functions used different spacing formulas
    // causing batchSize < totalChars even when all chars fit on one row
    const fontSizePx = mmToCssPixels(calculateFarFontSize(30, 5), screen24, 1);
    const available = 1720;
    const total = calculateOptimalCharCount(fontSizePx, available, 'S');
    const batchSize = calculateMaxCharsPerBatch(fontSizePx, available, 'S', total);

    expect(total).toBe(5);
    expect(batchSize).toBe(total); // Must show all 5 in one batch — no pagination
  });

  it('Level 12 (20/32, n=9.6) at 5m: 5 chars fit (font is smaller → easier to fit)', () => {
    const fontSizeMm = calculateFarFontSize(9.6, 5); // (9.6/6)*8.73*(5/6) = 11.64mm
    const fontSizePx = mmToCssPixels(fontSizeMm, screen24, 1);
    const available = 1720;

    expect(calculateOptimalCharCount(fontSizePx, available, 'S')).toBe(5);
  });

  it('geometry invariant: if 5 chars fit in width, calculateOptimalCharCount returns 5', () => {
    // If calculateTotalWidth(fontSizePx, 5, type) <= screenWidth,
    // then calculateOptimalCharCount MUST return 5 — no other outcome is acceptable
    const fontSizePx = 100;
    const screenWidth = 900; // > totalWidth(100, 5, 'S') = 100*5 + 10*4 = 540
    // Verify the geometry precondition
    const w5S = calculateTotalWidth(fontSizePx, 5, 'S');
    expect(w5S).toBeLessThanOrEqual(screenWidth);
    // Then the function MUST return 5
    expect(calculateOptimalCharCount(fontSizePx, screenWidth, 'S')).toBe(5);
  });
});

describe('calculateGameScaleFactor exact clinical values (screenshot 2)', () => {
  // FAR_EXPONENT=0.5, FAR_MIN_SCALE=0.55, FAR_MAX_SCALE=4.0
  // scale = clamp(0.55, 4.0, (n/6)^0.5) where n from farVisionLevels

  it('Level 1 (20/400, n=120): ratio=20, scale capped at 4.0 (maximum)', () => {
    // sqrt(20) = 4.47 > 4.0 → capped at 4.0
    expect(calculateGameScaleFactor('far', 1)).toBeCloseTo(4.0, 4);
  });

  it('Level 7 (20/100, n=30): ratio=5, scale = sqrt(5) ≈ 2.236', () => {
    // sqrt(5) = 2.2361, within [0.55, 4.0]
    expect(calculateGameScaleFactor('far', 7)).toBeCloseTo(Math.sqrt(5), 4);
  });

  it('Level 14 (20/20, n=6): ratio=1, scale = 1.0 (normal vision baseline)', () => {
    // sqrt(1) = 1.0 — no scaling for normal vision
    expect(calculateGameScaleFactor('far', 14)).toBeCloseTo(1.0, 5);
  });

  it('Level 20 (20/5, n=1.5): ratio=0.25, scale clamped at 0.55 (minimum)', () => {
    // sqrt(0.25) = 0.5 < 0.55 → clamped at 0.55
    expect(calculateGameScaleFactor('far', 20)).toBeCloseTo(0.55, 4);
  });

  it('Level 1 vs Level 7 differ by ≥1.7x — reported as "looking the same" before fix', () => {
    // 4.0 / 2.236 = 1.789 — tiles MUST look clearly different between these levels
    const s1 = calculateGameScaleFactor('far', 1);
    const s7 = calculateGameScaleFactor('far', 7);
    expect(s1 / s7).toBeGreaterThan(1.7);
    expect(s1).not.toBeCloseTo(s7, 0); // differ by more than 1.0 in scale
  });

  it('Level 7 vs Level 14 differ by >2x — impaired vs normal must be clearly distinct', () => {
    // 2.236 / 1.0 = 2.236
    const s7 = calculateGameScaleFactor('far', 7);
    const s14 = calculateGameScaleFactor('far', 14);
    expect(s7 / s14).toBeGreaterThan(2.0);
  });

  it('scale is strictly monotone: lower vision level → larger scale', () => {
    // Confirms the entire far vision range is correctly ordered
    const s1 = calculateGameScaleFactor('far', 1);
    const s7 = calculateGameScaleFactor('far', 7);
    const s10 = calculateGameScaleFactor('far', 10);
    const s14 = calculateGameScaleFactor('far', 14);
    const s20 = calculateGameScaleFactor('far', 20);

    expect(s1).toBeGreaterThan(s7);
    expect(s7).toBeGreaterThan(s10);
    expect(s10).toBeGreaterThan(s14);
    expect(s14).toBeGreaterThan(s20);
  });
});

describe('Game2048Board screen diagonal estimation bug (screenshot 2)', () => {
  // Game2048Board.tsx computes diagonalInch as:
  //   Math.sqrt(window.screen.width ** 2 + window.screen.height ** 2) / 96
  // This gives the correct result only for standard DPR=1 monitors where
  // physical PPI ≈ 96. On HiDPI screens (DPR=2) it reports 2× the actual
  // diagonal, producing a PPI ≈ 96 instead of the true physical PPI.
  // Consequence: font sizes are rendered at half the clinically correct size.

  it('diagonal estimate is ~2.4× too large for MacBook 13.3" Retina (2560×1600 physical)', () => {
    const physW = 2560,
      physH = 1600;
    const actualDiagonal = 13.3;
    // Game2048Board formula
    const estimatedDiagonal = Math.sqrt(physW ** 2 + physH ** 2) / 96;

    // Bug: 31.4" is reported for a 13.3" display
    expect(estimatedDiagonal).toBeCloseTo(31.45, 0);
    expect(estimatedDiagonal / actualDiagonal).toBeGreaterThan(2.3);
  });

  it('bug produces PPI ≈ 96 (CSS reference) instead of true physical PPI ≈ 227', () => {
    const physW = 2560,
      physH = 1600;
    const bugDiagonal = Math.sqrt(physW ** 2 + physH ** 2) / 96;
    const correctDiagonal = 13.3;

    const bugPPI = calculatePPI({
      screenWidth: physW,
      screenHeight: physH,
      diagonalInch: bugDiagonal,
    });
    const correctPPI = calculatePPI({
      screenWidth: physW,
      screenHeight: physH,
      diagonalInch: correctDiagonal,
    });

    // Bug settles at CSS-reference PPI (96) — not the physical screen PPI
    expect(bugPPI).toBeCloseTo(96, 0);
    // Correct physical PPI: sqrt(2560²+1600²) / 13.3 = 227
    expect(correctPPI).toBeCloseTo(227, 0);
  });

  it('BUG: font rendered at 42% of correct CSS size on DPR=2 HiDPI (Level 7 at 5m)', () => {
    // On MacBook 13.3" Retina (DPR=2), Game2048Board emits:
    //   fontSize ≈ 68.7px CSS  (bug)
    // Correct value should be:
    //   fontSize ≈ 162.5px CSS
    // Ratio: 162.5 / 68.7 = 2.36 → font is more than 2× too small
    const physW = 2560,
      physH = 1600;
    const DPR = 2;
    const fontSizeMm = calculateFarFontSize(30, 5); // Level 7 at 5m = 36.375mm

    const bugDiagonal = Math.sqrt(physW ** 2 + physH ** 2) / 96;
    const cssBug = mmToCssPixels(
      fontSizeMm,
      { screenWidth: physW, screenHeight: physH, diagonalInch: bugDiagonal },
      DPR
    );
    const cssCorrect = mmToCssPixels(
      fontSizeMm,
      { screenWidth: physW, screenHeight: physH, diagonalInch: 13.3 },
      DPR
    );

    expect(cssCorrect).toBeCloseTo(162.5, 0);
    expect(cssBug).toBeCloseTo(68.7, 0);
    expect(cssCorrect / cssBug).toBeGreaterThan(2.0);
  });

  it('correct fix: using CSS pixel dimensions (window.innerWidth) avoids the DPR error', () => {
    // If screenInfo uses CSS pixel dimensions directly (innerWidth × innerHeight),
    // the diagonalInch from the real diagonal gives the correct CSS PPI,
    // and mmToCssPixels should NOT divide by DPR again.
    // Proof: CSS viewport for MacBook 13.3" Retina = 1280×800 CSS pixels
    // CSS PPI = sqrt(1280²+800²) / 13.3 = 113.4  (= physical PPI / DPR = 226.8 / 2)
    const cssDims: ScreenInfo = { screenWidth: 1280, screenHeight: 800, diagonalInch: 13.3 };
    const cssPPI = calculatePPI(cssDims);

    // CSS PPI should be approx 113 (physical 226.8 / DPR 2)
    expect(cssPPI).toBeCloseTo(113.5, 0);

    // With CSS dims, mmToPixels gives CSS pixels directly — DPR=1 for this path
    const fontSizeMm = calculateFarFontSize(30, 5);
    const cssFromCssDims = mmToCssPixels(fontSizeMm, cssDims, 1); // no DPR division

    // Should match the correct physical path: 36.375 × (226.8/25.4) / 2 ≈ 162.5px
    // Via CSS path: 36.375 × (113.4/25.4) = 162.4px ✓
    expect(cssFromCssDims).toBeCloseTo(162.4, 0);
  });
});

describe('calculateVisualSettings (unified exercise display pipeline)', () => {
  const screen: ScreenInfo = { diagonalInch: 15.6, screenWidth: 1920, screenHeight: 1080 };

  it('optotype renderMode: fontSize equals letterHeightPx (layout px from mm)', () => {
    const result = calculateVisualSettings({
      visionType: 'far',
      visionLevel: 11,
      distance: 3,
      screenInfo: screen,
      renderMode: 'optotype',
    });
    expect(result.fontSize).toBe(result.letterHeightPx);
    expect(result.fontSize).toBe(
      Math.round(clinicalMmToLayoutPx(result.fontSizeMm, screen, 1))
    );
  });

  it('game renderMode (default): fontSize includes Clear Sans cap-height compensation', () => {
    const result = calculateVisualSettings({
      visionType: 'far',
      visionLevel: 11,
      distance: 3,
      screenInfo: screen,
    });
    expect(result.letterHeightPx).toBe(
      Math.round(clinicalMmToLayoutPx(result.fontSizeMm, screen, 1))
    );
    expect(result.fontSize).toBeGreaterThan(result.letterHeightPx);
  });

  it('clinicalMmToLayoutPx is an alias of mmToCssPixels', () => {
    const mm = calculateFarFontSize(12, 3);
    expect(clinicalMmToLayoutPx(mm, screen, 2)).toBe(mmToCssPixels(mm, screen, 2));
  });
});
