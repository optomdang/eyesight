/**
 * VT Quest — Gabor patch renderer (Canvas 2D).
 *
 * Sinusoidal carrier × flat-top Gaussian envelope:
 * - `patchSizePx` = clinical plateau diameter (= Snellen letter height).
 * - Full contrast inside that circle; fade halo sits outside and is not counted clinically.
 */

import type { VtResponseSide } from 'src/types/core/vtQuest';
import type { VtStimulusGaborConfig } from 'src/types/core/vtQuest';

/** Total fade-halo diameter as a fraction of clinical plateau diameter (outside plateau). */
export const GABOR_FADE_RING_DIAMETER_FRACTION = 0.4;

/**
 * Flat-top Gaussian envelope: 1 inside the plateau radius, then smooth fade outward.
 * Uses isotropic distance in the patch plane (rotated xr/yr).
 */
export function computeGaborEnvelope(
  xr: number,
  yr: number,
  plateauRadiusPx: number,
  fadeSigmaPx: number,
  plateauRadiusOverride?: number
): number {
  const r = Math.sqrt(xr * xr + yr * yr);
  const plateau = plateauRadiusOverride ?? plateauRadiusPx;
  if (r <= plateau) return 1;

  const dr = r - plateau;
  const safeSigma = Math.max(fadeSigmaPx, 1);
  return Math.exp(-(dr * dr) / (2 * safeSigma * safeSigma));
}

/** Clinical plateau radius (= letter height / 2). Full staircase contrast inside. */
export function computeGaborPlateauRadiusPx(patchSizePx: number): number {
  return patchSizePx / 2;
}

/** Fade halo thickness beyond the clinical edge (each side = 20% of clinical diameter). */
export function computeGaborFadeRingRadiusPx(patchSizePx: number): number {
  return (patchSizePx * GABOR_FADE_RING_DIAMETER_FRACTION) / 2;
}

/**
 * σ for the outer fade ring only (after the plateau).
 * Chosen so modulation ≈ 1% at the outer fade edge.
 */
export function computeGaborFadeSigmaPx(patchSizePx: number): number {
  const fadeSpan = Math.max(computeGaborFadeRingRadiusPx(patchSizePx), 1);
  return fadeSpan / 3;
}

/** Pixel radius from centre through the fade halo (+ small Gaussian tail). */
export function computeGaborDrawExtentPx(patchSizePx: number, fadeSigmaPx?: number): number {
  const sigma = fadeSigmaPx ?? computeGaborFadeSigmaPx(patchSizePx);
  return (
    computeGaborPlateauRadiusPx(patchSizePx) +
    computeGaborFadeRingRadiusPx(patchSizePx) +
    2 * sigma
  );
}

/** Total on-screen diameter including fade halo (for canvas / panel layout). */
export function computeGaborStimulusDiameterPx(patchSizePx: number): number {
  return Math.ceil(computeGaborDrawExtentPx(patchSizePx) * 2);
}

export interface GaborDrawOptions {
  /** Canvas element to draw on */
  canvas: HTMLCanvasElement;
  /** Side that receives the Gabor patch */
  signalSide: VtResponseSide;
  /** Contrast 0–1 (Michelson; current staircase value) */
  contrast: number;
  /** Config from vtSettings.stimulus.gabor */
  config: VtStimulusGaborConfig;
  /** Viewing distance in meters (for spatial frequency scaling) */
  distanceM: number;
  /** Pixels per degree (pre-computed from screen + distance) */
  pixelsPerDeg: number;
  /**
   * Clinical plateau diameter in pixels (= Snellen letter height at assigned vision level).
   * Fade halo is drawn outside this and is not counted toward acuity size.
   */
  patchSizePx?: number;
  /** Carrier phase in radians — varies per trial so stripe pattern is not identical. */
  phaseRad?: number;
  /** Background luminance (0–255). Defaults to 128 (mid-grey). */
  backgroundLuminance?: number;
}

/**
 * Compute pixels-per-degree from PPI and viewing distance.
 */
export function computePixelsPerDeg(ppi: number, distanceM: number): number {
  const distancePx = distanceM * 100 * (ppi / 2.54); // distance in cm × ppi/cm
  return 2 * distancePx * Math.tan((0.5 * Math.PI) / 180);
}

/**
 * Draw a circular Gabor patch centred at (cx, cy): full Michelson contrast at the centre,
 * with a continuous Gaussian fade toward the background.
 */
function drawGaborOnImageData(
  data: Uint8ClampedArray,
  width: number,
  cx: number,
  cy: number,
  patchSizePx: number,
  contrast: number,
  sfCyclesPerPx: number,
  fadeSigmaPx: number,
  orientationRad: number,
  phaseRad: number,
  backgroundLum: number
): void {
  const plateauRadiusPx = computeGaborPlateauRadiusPx(patchSizePx);
  const drawExtent = computeGaborDrawExtentPx(patchSizePx, fadeSigmaPx);
  const startX = Math.max(0, Math.floor(cx - drawExtent));
  const endX = Math.min(width, Math.ceil(cx + drawExtent));
  const startY = Math.max(0, Math.floor(cy - drawExtent));
  const endY = Math.min(Math.floor(data.length / (width * 4)), Math.ceil(cy + drawExtent));

  const cosO = Math.cos(orientationRad);
  const sinO = Math.sin(orientationRad);

  for (let py = startY; py < endY; py++) {
    for (let px = startX; px < endX; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const xr = dx * cosO + dy * sinO;
      const yr = -dx * sinO + dy * cosO;

      const envelope = computeGaborEnvelope(
        xr,
        yr,
        plateauRadiusPx,
        fadeSigmaPx,
        plateauRadiusPx
      );
      if (envelope < 0.001) continue;

      const carrier = Math.cos(2 * Math.PI * sfCyclesPerPx * xr + phaseRad);
      const gabor = envelope * carrier;

      const lum = Math.round(backgroundLum + contrast * backgroundLum * gabor);
      const clampedLum = Math.min(255, Math.max(0, lum));

      const idx = (py * width + px) * 4;
      data[idx] = clampedLum;
      data[idx + 1] = clampedLum;
      data[idx + 2] = clampedLum;
      data[idx + 3] = 255;
    }
  }
}

/**
 * Effective cycles-per-pixel: adapt SF upward so the patch shows ≥3 cycles.
 */
function computeSfCyclesPerPx(patchSizePx: number, sfCpD: number, pixelsPerDeg: number): number {
  const MIN_CYCLES_IN_PATCH = 3;
  let effectiveSfCpD = sfCpD;
  const cyclesAtConfig = (patchSizePx * sfCpD) / pixelsPerDeg;
  if (cyclesAtConfig < MIN_CYCLES_IN_PATCH) {
    effectiveSfCpD = (MIN_CYCLES_IN_PATCH * pixelsPerDeg) / patchSizePx;
  }
  return effectiveSfCpD / pixelsPerDeg;
}

/**
 * Fill a canvas region with a uniform grey background.
 */
function fillGrey(
  data: Uint8ClampedArray,
  width: number,
  startX: number,
  endX: number,
  height: number,
  lum: number
): void {
  for (let py = 0; py < height; py++) {
    for (let px = startX; px < endX; px++) {
      const idx = (py * width + px) * 4;
      data[idx] = lum;
      data[idx + 1] = lum;
      data[idx + 2] = lum;
      data[idx + 3] = 255;
    }
  }
}

/**
 * Main entry: draw 2AFC Gabor stimulus on canvas.
 *
 * Canvas is split into left | divider | right.
 * Signal patch drawn on signalSide; other side stays grey.
 */
export function drawGabor2AFC(options: GaborDrawOptions): void {
  const {
    canvas,
    signalSide,
    contrast,
    config,
    pixelsPerDeg,
    patchSizePx: patchSizeOverride,
    phaseRad = 0,
    backgroundLuminance = 128,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const halfW = Math.floor(W / 2);
  const dividerWidth = 2;

  // Flat-top envelope: full contrast in central 60% of radius, narrow Gaussian fade at edge.
  const patchSizePx =
    patchSizeOverride != null
      ? Math.max(Math.round(patchSizeOverride), 10)
      : Math.round(6 * ((config.sigmaDeg * pixelsPerDeg) / 2));
  const fadeSigmaPx = computeGaborFadeSigmaPx(patchSizePx);

  const sfCyclesPerPx = computeSfCyclesPerPx(patchSizePx, config.sfCpD, pixelsPerDeg);

  const orientationRad = config.orientation === 'horizontal' ? Math.PI / 2 : 0;
  const backgroundLum = backgroundLuminance;

  // Draw via ImageData for performance
  const imageData = ctx.createImageData(W, H);
  const { data } = imageData;

  // Fill background
  fillGrey(data, W, 0, W, H, backgroundLum);

  // Draw divider (dark line)
  for (let py = 0; py < H; py++) {
    for (let d = 0; d < dividerWidth; d++) {
      const px = halfW - 1 + d;
      const idx = (py * W + px) * 4;
      data[idx] = 40;
      data[idx + 1] = 40;
      data[idx + 2] = 40;
      data[idx + 3] = 255;
    }
  }

  // Draw Gabor on signal side
  const signalCx = signalSide === 'left' ? halfW / 2 : halfW + halfW / 2;
  const signalCy = H / 2;

  drawGaborOnImageData(
    data,
    W,
    signalCx,
    signalCy,
    patchSizePx,
    contrast,
    sfCyclesPerPx,
    fadeSigmaPx,
    orientationRad,
    phaseRad,
    backgroundLum
  );

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Clear canvas to background grey.
 */
export function clearGaborCanvas(canvas: HTMLCanvasElement, backgroundLuminance = 128): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const lum = backgroundLuminance;
  ctx.fillStyle = `rgb(${lum},${lum},${lum})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ─── Task-mode renderers (orientation / cards / SF) ──────────────────────────

export interface GaborSingleDrawOptions {
  canvas: HTMLCanvasElement;
  /** Contrast 0–1 (Michelson) */
  contrast: number;
  /** Stripe orientation in degrees — 0 = dọc, 90 = ngang, 45/135 = chéo */
  orientationDeg: number;
  /** Spatial frequency in cycles/degree */
  sfCpD: number;
  pixelsPerDeg: number;
  /** Clinical plateau diameter in pixels (= letter height) */
  patchSizePx: number;
  phaseRad?: number;
  backgroundLuminance?: number;
}

/**
 * Draw a single Gabor patch centred in the whole canvas
 * (orientation_id, delayed_match, and per-card rendering for grid modes).
 */
export function drawGaborSingle(options: GaborSingleDrawOptions): void {
  const {
    canvas,
    contrast,
    orientationDeg,
    sfCpD,
    pixelsPerDeg,
    patchSizePx: rawPatch,
    phaseRad = 0,
    backgroundLuminance = 128,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const patchSizePx = Math.max(Math.round(rawPatch), 10);
  const fadeSigmaPx = computeGaborFadeSigmaPx(patchSizePx);
  const sfCyclesPerPx = computeSfCyclesPerPx(patchSizePx, sfCpD, pixelsPerDeg);
  // orientationDeg is the carrier-axis angle; matches labels in canvas coords (y-down).
  const orientationRad = (orientationDeg * Math.PI) / 180;

  const imageData = ctx.createImageData(W, H);
  const { data } = imageData;
  fillGrey(data, W, 0, W, H, backgroundLuminance);

  drawGaborOnImageData(
    data,
    W,
    W / 2,
    H / 2,
    patchSizePx,
    contrast,
    sfCyclesPerPx,
    fadeSigmaPx,
    orientationRad,
    phaseRad,
    backgroundLuminance
  );

  ctx.putImageData(imageData, 0, 0);
}

export interface GaborPairSFDrawOptions {
  canvas: HTMLCanvasElement;
  /** Side whose stripes are thicker (lower spatial frequency) — the correct answer */
  thickSide: VtResponseSide;
  contrast: number;
  /** Base (thick) spatial frequency in cycles/degree */
  sfCpD: number;
  /** Thin side SF = sfCpD × sfRatio */
  sfRatio: number;
  orientationDeg: number;
  pixelsPerDeg: number;
  patchSizePx: number;
  phaseRad?: number;
  backgroundLuminance?: number;
}

/**
 * SF discrimination: patches on BOTH sides, same orientation/contrast,
 * different spatial frequency. Correct answer = side with thicker stripes.
 */
export function drawGaborPairSF(options: GaborPairSFDrawOptions): void {
  const {
    canvas,
    thickSide,
    contrast,
    sfCpD,
    sfRatio,
    orientationDeg,
    pixelsPerDeg,
    patchSizePx: rawPatch,
    phaseRad = 0,
    backgroundLuminance = 128,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const halfW = Math.floor(W / 2);
  const dividerWidth = 2;

  const patchSizePx = Math.max(Math.round(rawPatch), 10);
  const fadeSigmaPx = computeGaborFadeSigmaPx(patchSizePx);
  const orientationRad = (orientationDeg * Math.PI) / 180;

  // Thick side keeps base SF; thin side gets ratio× SF. The thin side skips the
  // min-cycles adaptation floor bump so the visible difference is preserved.
  const thickCpp = computeSfCyclesPerPx(patchSizePx, sfCpD, pixelsPerDeg);
  const thinCpp = thickCpp * Math.max(sfRatio, 1.2);

  const imageData = ctx.createImageData(W, H);
  const { data } = imageData;
  fillGrey(data, W, 0, W, H, backgroundLuminance);

  for (let py = 0; py < H; py++) {
    for (let d = 0; d < dividerWidth; d++) {
      const idx = (py * W + (halfW - 1 + d)) * 4;
      data[idx] = 40;
      data[idx + 1] = 40;
      data[idx + 2] = 40;
      data[idx + 3] = 255;
    }
  }

  const leftCx = halfW / 2;
  const rightCx = halfW + halfW / 2;
  const cy = H / 2;
  const leftCpp = thickSide === 'left' ? thickCpp : thinCpp;
  const rightCpp = thickSide === 'right' ? thickCpp : thinCpp;

  drawGaborOnImageData(
    data,
    W,
    leftCx,
    cy,
    patchSizePx,
    contrast,
    leftCpp,
    fadeSigmaPx,
    orientationRad,
    phaseRad,
    backgroundLuminance
  );
  drawGaborOnImageData(
    data,
    W,
    rightCx,
    cy,
    patchSizePx,
    contrast,
    rightCpp,
    fadeSigmaPx,
    orientationRad,
    phaseRad,
    backgroundLuminance
  );

  ctx.putImageData(imageData, 0, 0);
}
