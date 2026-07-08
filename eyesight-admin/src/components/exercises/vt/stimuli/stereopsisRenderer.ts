/**
 * VT Stereopsis — thin wrapper around exam RDS engine for vt-quest trials.
 */

import type { IntroShapeType } from 'src/utils/stereopsis/stereopsisEngine';
import {
  SeededRng,
  renderShapeSingle,
  renderShapeRow,
  renderDigitPanel,
  type GeoShapeType,
} from 'src/utils/stereopsis';

export const STEREOPSIS_BG = '#0a0c10';
export const STEREOPSIS_SHAPE_CANVAS = 520;
export const STEREOPSIS_ROW_PANEL = 180;
export const STEREOPSIS_DIGIT_CANVAS = 1080;

export function clearStereopsisCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = STEREOPSIS_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawStereopsisShapeSingle(
  canvas: HTMLCanvasElement,
  shapeType: IntroShapeType,
  rngSeed: number
): void {
  canvas.width = STEREOPSIS_SHAPE_CANVAS;
  canvas.height = STEREOPSIS_SHAPE_CANVAS;
  renderShapeSingle(canvas, shapeType, new SeededRng(rngSeed));
}

export function drawStereopsisShapeRow(
  canvases: HTMLCanvasElement[],
  floatShape: GeoShapeType,
  floatAt: number,
  arcsec: number,
  rngSeed: number
): void {
  const rng = new SeededRng(rngSeed);
  const sz = STEREOPSIS_ROW_PANEL;
  for (let i = 0; i < canvases.length; i++) {
    const cv = canvases[i];
    if (!cv) continue;
    cv.width = sz;
    cv.height = sz;
  }
  renderShapeRow(canvases, floatShape, floatAt, arcsec, rng);
}

export function drawStereopsisDigitPanel(
  canvas: HTMLCanvasElement,
  digit: number,
  arcsec: number,
  rngSeed: number
): void {
  canvas.width = STEREOPSIS_DIGIT_CANVAS;
  canvas.height = STEREOPSIS_DIGIT_CANVAS;
  renderDigitPanel(canvas, digit, arcsec, new SeededRng(rngSeed));
}
