/**
 * VT Quest — Vernier Acuity 2AFC Renderer (Canvas 2D)
 *
 * Vernier acuity measures the ability to detect misalignment between
 * two short line segments. The test variable (staircase) is the
 * lateral offset in arcseconds → converted to pixels at the given
 * viewing distance.
 *
 * 2AFC layout:
 *   LEFT half:  Either signal (offset lines) or reference (aligned)
 *   RIGHT half: The other alternative
 *   Divider:    1px dark line
 *
 * Signal side has the offset pair; the other side has perfectly aligned lines.
 */

import type { VtResponseSide } from 'src/types/core/vtQuest';
import {
  colorAtContrastPercent,
  type VtStimulusColorScheme,
} from '../core/vtStimulusColors';

export interface VernierDrawOptions {
  canvas: HTMLCanvasElement;
  /** Side that has the offset (misaligned) pair */
  signalSide: VtResponseSide;
  /** Lateral offset in pixels (current staircase value already converted) */
  offsetPx: number;
  /** Height of each line segment in pixels */
  lineHeightPx: number;
  /** Gap between the two segments (center gap) in pixels */
  gapPx: number;
  /** Line stroke width in pixels */
  lineWidthPx: number;
  /** Background luminance (0–255) — used when no color scheme */
  backgroundLuminance?: number;
  /** Color scheme: black panels, top line = color1, bottom = color2 */
  colorScheme?: VtStimulusColorScheme | null;
  /** Clinical contrast % for colored lines on black (games 2 & 3). */
  stimulusContrastPercent?: number;
  /** Horizontal offset direction: 1 = right, -1 = left (randomized per trial). */
  offsetSign?: 1 | -1;
}

interface LineParams {
  cx: number;
  cy: number;
  lineHeightPx: number;
  gapPx: number;
  lineWidthPx: number;
  offsetPx: number;   // 0 = aligned
}

function drawVernierPair(
  ctx: CanvasRenderingContext2D,
  params: LineParams,
  topColor: string,
  bottomColor: string
): void {
  const { cx, cy, lineHeightPx, gapPx, lineWidthPx, offsetPx } = params;

  ctx.save();
  ctx.lineWidth = lineWidthPx;
  ctx.lineCap = 'butt';

  const topCx = cx;
  const topCy = cy - gapPx / 2 - lineHeightPx / 2;
  ctx.strokeStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(topCx, topCy - lineHeightPx / 2);
  ctx.lineTo(topCx, topCy + lineHeightPx / 2);
  ctx.stroke();

  const botCx = cx + offsetPx;
  const botCy = cy + gapPx / 2 + lineHeightPx / 2;
  ctx.strokeStyle = bottomColor;
  ctx.beginPath();
  ctx.moveTo(botCx, botCy - lineHeightPx / 2);
  ctx.lineTo(botCx, botCy + lineHeightPx / 2);
  ctx.stroke();

  ctx.restore();
}

function fillRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string
): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

/**
 * Draw 2AFC Vernier stimulus on canvas.
 * Signal side has the offset pair; reference side is perfectly aligned.
 */
export function drawVernier2AFC(options: VernierDrawOptions): void {
  const {
    canvas,
    signalSide,
    offsetPx,
    lineHeightPx,
    gapPx,
    lineWidthPx,
    backgroundLuminance = 128,
    colorScheme,
    stimulusContrastPercent = 100,
    offsetSign = 1,
  } = options;

  const signedOffsetPx = offsetPx * offsetSign;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const halfW = Math.floor(W / 2);
  const useColors = colorScheme?.useColoredPanels === true;
  const panelFill = useColors ? '#000000' : `rgb(${backgroundLuminance},${backgroundLuminance},${backgroundLuminance})`;
  const foregroundLum = backgroundLuminance > 128 ? 20 : 230;
  const greyColor = `rgb(${foregroundLum},${foregroundLum},${foregroundLum})`;
  const topColor = useColors
    ? colorAtContrastPercent(colorScheme!.color1, stimulusContrastPercent)
    : greyColor;
  const bottomColor = useColors
    ? colorAtContrastPercent(colorScheme!.color2, stimulusContrastPercent)
    : greyColor;

  fillRegion(ctx, 0, 0, W, H, panelFill);

  ctx.fillStyle = useColors ? '#333333' : 'rgb(40,40,40)';
  ctx.fillRect(halfW - 1, 0, 2, H);

  const leftParams: LineParams = {
    cx: halfW / 2,
    cy: H / 2,
    lineHeightPx,
    gapPx,
    lineWidthPx,
    offsetPx: signalSide === 'left' ? signedOffsetPx : 0,
  };

  const rightParams: LineParams = {
    cx: halfW + halfW / 2,
    cy: H / 2,
    lineHeightPx,
    gapPx,
    lineWidthPx,
    offsetPx: signalSide === 'right' ? signedOffsetPx : 0,
  };

  drawVernierPair(ctx, leftParams, topColor, bottomColor);
  drawVernierPair(ctx, rightParams, topColor, bottomColor);
}

export interface VernierSingleDrawOptions {
  canvas: HTMLCanvasElement;
  offsetPx: number;
  lineHeightPx: number;
  gapPx: number;
  lineWidthPx: number;
  backgroundLuminance?: number;
  colorScheme?: VtStimulusColorScheme | null;
  stimulusContrastPercent?: number;
  offsetSign?: 1 | -1;
}

/** Draw a single centred vernier pair (offset_direction / odd_line_out cards). */
export function drawVernierSingle(options: VernierSingleDrawOptions): void {
  const {
    canvas,
    offsetPx,
    lineHeightPx,
    gapPx,
    lineWidthPx,
    backgroundLuminance = 128,
    colorScheme,
    stimulusContrastPercent = 100,
    offsetSign = 1,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const useColors = colorScheme?.useColoredPanels === true;
  const panelFill = useColors ? '#000000' : `rgb(${backgroundLuminance},${backgroundLuminance},${backgroundLuminance})`;
  const foregroundLum = backgroundLuminance > 128 ? 20 : 230;
  const greyColor = `rgb(${foregroundLum},${foregroundLum},${foregroundLum})`;
  const topColor = useColors
    ? colorAtContrastPercent(colorScheme!.color1, stimulusContrastPercent)
    : greyColor;
  const bottomColor = useColors
    ? colorAtContrastPercent(colorScheme!.color2, stimulusContrastPercent)
    : greyColor;

  fillRegion(ctx, 0, 0, W, H, panelFill);

  drawVernierPair(
    ctx,
    {
      cx: W / 2,
      cy: H / 2,
      lineHeightPx,
      gapPx,
      lineWidthPx,
      offsetPx: offsetPx * offsetSign,
    },
    topColor,
    bottomColor
  );
}

export interface VernierDualOffsetDrawOptions extends VernierDrawOptions {
  /** Fraction of signal offset applied to the distractor side (default 0.5). */
  distractorOffsetRatio?: number;
}

/**
 * Draw 2AFC Vernier where both panels have offset; signal side has the larger offset.
 */
export function drawVernierDualOffset2AFC(options: VernierDualOffsetDrawOptions): void {
  const {
    canvas,
    signalSide,
    offsetPx,
    lineHeightPx,
    gapPx,
    lineWidthPx,
    backgroundLuminance = 128,
    colorScheme,
    stimulusContrastPercent = 100,
    offsetSign = 1,
    distractorOffsetRatio = 0.5,
  } = options;

  const signedOffsetPx = offsetPx * offsetSign;
  const distractorPx = signedOffsetPx * distractorOffsetRatio;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const halfW = Math.floor(W / 2);
  const useColors = colorScheme?.useColoredPanels === true;
  const panelFill = useColors ? '#000000' : `rgb(${backgroundLuminance},${backgroundLuminance},${backgroundLuminance})`;
  const foregroundLum = backgroundLuminance > 128 ? 20 : 230;
  const greyColor = `rgb(${foregroundLum},${foregroundLum},${foregroundLum})`;
  const topColor = useColors
    ? colorAtContrastPercent(colorScheme!.color1, stimulusContrastPercent)
    : greyColor;
  const bottomColor = useColors
    ? colorAtContrastPercent(colorScheme!.color2, stimulusContrastPercent)
    : greyColor;

  fillRegion(ctx, 0, 0, W, H, panelFill);

  ctx.fillStyle = useColors ? '#333333' : 'rgb(40,40,40)';
  ctx.fillRect(halfW - 1, 0, 2, H);

  const leftOffset = signalSide === 'left' ? signedOffsetPx : distractorPx;
  const rightOffset = signalSide === 'right' ? signedOffsetPx : distractorPx;

  drawVernierPair(
    ctx,
    { cx: halfW / 2, cy: H / 2, lineHeightPx, gapPx, lineWidthPx, offsetPx: leftOffset },
    topColor,
    bottomColor
  );
  drawVernierPair(
    ctx,
    { cx: halfW + halfW / 2, cy: H / 2, lineHeightPx, gapPx, lineWidthPx, offsetPx: rightOffset },
    topColor,
    bottomColor
  );
}

/**
 * Clear canvas to grey or black (colored scheme).
 */
export function clearVernierCanvas(
  canvas: HTMLCanvasElement,
  backgroundLuminance = 128,
  colorScheme?: VtStimulusColorScheme | null
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const fill =
    colorScheme?.useColoredPanels === true
      ? '#000000'
      : `rgb(${backgroundLuminance},${backgroundLuminance},${backgroundLuminance})`;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Convert an offset in arcseconds to canvas pixels.
 * @param arcsec offset in arc seconds
 * @param pixelsPerDeg pixels per degree
 */
export function arcsecOffsetToPx(arcsec: number, pixelsPerDeg: number): number {
  return (arcsec / 3600) * pixelsPerDeg;
}

/**
 * Compute line height in pixels from degrees of visual angle.
 */
export function lineHeightDegToPx(deg: number, pixelsPerDeg: number): number {
  return deg * pixelsPerDeg;
}
