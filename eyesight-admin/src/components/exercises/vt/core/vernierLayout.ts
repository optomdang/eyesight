/**
 * VT Quest — Vernier stimulus sizing.
 *
 * - Stroke width (lineWidthPx) follows optotype stroke at assigned vision level
 *   (letterHeightPx ∝ Snellen acuity × distance).
 * - Segment height is fixed to fit the exercise viewport (not scaled by distance).
 */

import { arcsecOffsetToPx } from '../stimuli/vernierRenderer';

/** Sloan-style stroke ≈ 1/5 of optotype height */
export const OPTOTYPE_STROKE_RATIO = 0.2;

/** Default vertical segment length (px) — fits typical fullscreen trial area */
export const VERNIER_SEGMENT_HEIGHT_PX = 72;

/** Default gap between inner edges of top/bottom segments (px) */
export const VERNIER_BASE_GAP_PX = 18;

/** Extra gap scale for far / contrast vision (viewing distance ≥ ~3 m). */
export const VERNIER_FAR_GAP_MULTIPLIER = 2;

export const VERNIER_MIN_SEGMENT_HEIGHT_PX = 32;

/** Clinical line width from assigned letter height (same rule as optotype stroke). */
export function computeVernierLineWidthPx(letterHeightPx: number): number {
  return Math.max(Math.round(letterHeightPx * OPTOTYPE_STROKE_RATIO), 1.5);
}

/**
 * Gap between segments. Scales slightly when stroke is thick so two bars stay visually distinct.
 * Overlap is prevented by butt line caps in the renderer, not by capping stroke width.
 */
export function computeVernierGapPx(lineWidthPx: number, gapMultiplier = 1): number {
  const base = Math.max(VERNIER_BASE_GAP_PX, Math.ceil(lineWidthPx + 8));
  return Math.round(base * Math.max(gapMultiplier, 1));
}

export interface VernierStimulusMetrics {
  lineHeightPx: number;
  gapPx: number;
  lineWidthPx: number;
  offsetPx: number;
}

/**
 * @param availableHeight - trial stimulus area height (optional); caps segment length
 */
export function computeVernierStimulusMetrics(input: {
  letterHeightPx: number;
  pixelsPerDeg: number;
  offsetArcsec: number;
  availableHeight?: number;
  /** 1 = default; >1 widens vertical gap between Vernier segments (far/contrast). */
  gapMultiplier?: number;
}): VernierStimulusMetrics {
  const lineWidthPx = computeVernierLineWidthPx(input.letterHeightPx);
  const gapPx = computeVernierGapPx(lineWidthPx, input.gapMultiplier ?? 1);

  let lineHeightPx = VERNIER_SEGMENT_HEIGHT_PX;
  if (input.availableHeight != null && input.availableHeight > 0) {
    const innerH = input.availableHeight - 40;
    const maxSegment = Math.floor((innerH - gapPx - lineWidthPx) / 2);
    if (maxSegment > 0) {
      lineHeightPx = Math.min(VERNIER_SEGMENT_HEIGHT_PX, maxSegment);
    }
  }

  lineHeightPx = Math.max(lineHeightPx, VERNIER_MIN_SEGMENT_HEIGHT_PX);

  return {
    lineHeightPx,
    gapPx,
    lineWidthPx,
    offsetPx: Math.max(arcsecOffsetToPx(input.offsetArcsec, input.pixelsPerDeg), 0.5),
  };
}
