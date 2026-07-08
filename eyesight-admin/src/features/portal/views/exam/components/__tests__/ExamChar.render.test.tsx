/**
 * ============================================================================
 * REAL-RENDER CERTIFICATION — measures the ACTUAL px the exam screen paints
 * ============================================================================
 *
 * The other certification file (visionSizing.allLevels.test.ts) proves the
 * FORMULAS are correct. This file proves the RENDERED COMPONENT is correct:
 * it mounts the real <ExamChar> optotype the patient sees, reads the actual
 * CSS pixel size from the live DOM (getComputedStyle — resolves MUI/emotion
 * styles in jsdom), and asserts two things for every level:
 *
 *   1. The CSS px written to the DOM equals the clinical formula's output.
 *   2. The PHYSICAL size on screen (px × DPR ÷ pixel-density) equals the
 *      clinical target in millimetres — and stays constant across DPR.
 *
 * (2) is the patient-facing guarantee and the direct rebuttal to the BU report:
 * regardless of OS display scaling (DPR = 1, 1.5 or 2), the optotype is the
 * same physical height on the glass. The legacy eye-exam tool cannot make this
 * claim because it never divides by DPR.
 *
 * ExamChar renders size (mm) via clinicalMmToLayoutPx(size, screenInfo), using
 * window.devicePixelRatio. We drive that ratio directly below.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// Fixed reference screen fed into ExamChar via a mocked exam context.
// 24" 1920×1080 → PPI = sqrt(1920²+1080²)/24 ≈ 91.79, pixel pitch ≈ 0.2768mm.
const { SCREEN } = vi.hoisted(() => ({
  SCREEN: { screenWidth: 1920, screenHeight: 1080, diagonalInch: 24 },
}));

vi.mock('src/contexts/ExamContext', () => ({
  useExamContext: () => ({ screenInfo: SCREEN }),
}));

import ExamChar from '../ExamChar';
import { calculateFarFontSize, calculateNearFontSize, calculatePPI } from 'src/utils/visionUtils';
import { farVisionLevels, nearVisionLevels } from 'src/utils/constant';

const PPI = calculatePPI(SCREEN);
const PX_PER_MM = PPI / 25.4;

/** Force a specific device-pixel-ratio (OS display scaling) for the next render. */
function setDevicePixelRatio(dpr: number) {
  Object.defineProperty(window, 'devicePixelRatio', {
    value: dpr,
    configurable: true,
    writable: true,
  });
}

/** Mount a real ExamChar and read the px the browser would actually apply. */
function renderedFontPx(sizeMm: number): number {
  const { getByTestId } = render(<ExamChar char="S" display="A" size={sizeMm} />);
  const el = getByTestId('exam-char');
  return parseFloat(getComputedStyle(el).fontSize);
}

/** Physical height on glass = cssPx × DPR ÷ pixel-density. */
function physicalMmFromRenderedPx(cssPx: number, dpr: number): number {
  return (cssPx * dpr) / PX_PER_MM;
}

beforeEach(() => setDevicePixelRatio(1));
afterEach(() => {
  cleanup();
  setDevicePixelRatio(1);
});

// ============================================================================
// FAR VISION — real optotype render, all 20 levels
// ============================================================================
describe('ExamChar real render — FAR vision, all 20 levels @6m (DPR=1)', () => {
  it.each(farVisionLevels.map((l) => [l.level, l.n, l.score] as const))(
    'Level %i (%s) paints CSS px == clinical formula AND correct physical mm',
    (_level, n) => {
      const clinicalMm = calculateFarFontSize(n, 6);
      const expectedCssPx = clinicalMm * PX_PER_MM; // DPR=1

      const px = renderedFontPx(clinicalMm);

      // (1) The DOM carries exactly the formula's CSS px.
      expect(px).toBeCloseTo(expectedCssPx, 2);
      // (2) The physical height on screen equals the clinical target.
      expect(physicalMmFromRenderedPx(px, 1)).toBeCloseTo(clinicalMm, 3);
    }
  );

  it('20/20 anchor renders ~31.54px on 24" 1080p at DPR=1 (concrete golden)', () => {
    const px = renderedFontPx(calculateFarFontSize(6, 6)); // 8.727mm
    expect(px).toBeCloseTo(31.54, 1);
  });
});

// ============================================================================
// NEAR VISION — real optotype render, all 8 levels
// ============================================================================
describe('ExamChar real render — NEAR vision, all 8 levels @40cm (DPR=1)', () => {
  it.each(nearVisionLevels.map((l) => [l.level, l.size, l.score] as const))(
    'Level %i (%s) paints CSS px == clinical formula AND correct physical mm',
    (_level, size) => {
      const clinicalMm = calculateNearFontSize(size, 0.4);
      const expectedCssPx = clinicalMm * PX_PER_MM;

      const px = renderedFontPx(clinicalMm);

      expect(px).toBeCloseTo(expectedCssPx, 2);
      expect(physicalMmFromRenderedPx(px, 1)).toBeCloseTo(clinicalMm, 4);
    }
  );
});

// ============================================================================
// DPR INDEPENDENCE — the BU rebuttal, measured on the real rendered element
// ============================================================================
describe('ExamChar real render — physical size is identical across DPR', () => {
  const DPRS = [1, 1.5, 2, 2.25];

  it('20/20 @6m: CSS px shrinks with DPR but physical mm stays ~8.73mm on glass', () => {
    const clinicalMm = calculateFarFontSize(6, 6);

    const measured = DPRS.map((dpr) => {
      setDevicePixelRatio(dpr);
      const px = renderedFontPx(clinicalMm);
      cleanup();
      return { dpr, px, physicalMm: physicalMmFromRenderedPx(px, dpr) };
    });

    // CSS px must HALVE from DPR=1 to DPR=2 (browser packs 2 device px per CSS px)...
    const at1 = measured.find((m) => m.dpr === 1);
    const at2 = measured.find((m) => m.dpr === 2);
    expect(at1).toBeDefined();
    expect(at2).toBeDefined();
    expect(at2?.px).toBeCloseTo((at1?.px ?? 0) / 2, 1);

    // ...yet the PHYSICAL height on the glass is the same clinical 8.73mm for all.
    for (const m of measured) {
      expect(m.physicalMm).toBeCloseTo(clinicalMm, 2);
    }
  });

  it('every far level holds constant physical mm across DPR 1 / 1.5 / 2', () => {
    for (const { n } of farVisionLevels) {
      const clinicalMm = calculateFarFontSize(n, 6);
      for (const dpr of [1, 1.5, 2]) {
        setDevicePixelRatio(dpr);
        const px = renderedFontPx(clinicalMm);
        cleanup();
        expect(physicalMmFromRenderedPx(px, dpr)).toBeCloseTo(clinicalMm, 2);
      }
    }
  });
});
