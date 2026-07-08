/**
 * VT Quest — Stimulus sizing utilities.
 *
 * Angular / mm → layout pixels via clinicalMmToLayoutPx (same as calculateVisualSettings optotype path).
 *
 * @locked Physical angle→px chain — do not bypass clinicalMmToLayoutPx.
 * See .cursor/rules/screen-calibration-locked.mdc
 */

import { clinicalMmToLayoutPx, type ScreenInfo } from 'src/utils/visionUtils';

/**
 * Convert degrees of visual angle → mm at a given viewing distance.
 *
 * Formula: size_mm = 2 × distance_mm × tan(angle_deg / 2)
 */
export function degToMm(angleDeg: number, distanceM: number): number {
  const distanceMm = distanceM * 1000;
  return 2 * distanceMm * Math.tan((angleDeg * Math.PI) / 180 / 2);
}

/**
 * Convert arcseconds of visual angle → mm at a given viewing distance.
 */
export function arcsecToMm(arcsec: number, distanceM: number): number {
  return degToMm(arcsec / 3600, distanceM);
}

/**
 * Convert arcseconds → canvas layout pixels.
 */
export function arcsecToPx(arcsec: number, distanceM: number, screen: ScreenInfo): number {
  const mm = arcsecToMm(arcsec, distanceM);
  return clinicalMmToLayoutPx(mm, screen);
}

/**
 * Calculate VT stimulus patch size in canvas layout pixels.
 */
export function calculateVtStimulusPx(
  angleDeg: number,
  distanceM: number,
  screen: ScreenInfo
): number {
  const mm = degToMm(angleDeg, distanceM);
  return Math.round(clinicalMmToLayoutPx(mm, screen));
}

/**
 * Ensure patch size is within a sensible range for the display.
 * Clamp between 40 and 300 CSS pixels.
 */
export function clampStimulusPx(px: number): number {
  return Math.min(300, Math.max(40, px));
}
