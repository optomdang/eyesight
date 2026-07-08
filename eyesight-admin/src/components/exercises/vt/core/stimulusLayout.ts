/**
 * VT Quest — compute 2AFC canvas size so each panel fully contains its stimulus.
 */

import type { VtStimulusGaborConfig, VtWorld } from 'src/types/core/vtQuest';
import { computeGaborStimulusDiameterPx } from '../stimuli/gaborRenderer';
import { lineHeightDegToPx } from '../stimuli/vernierRenderer';
import { VERNIER_MIN_SEGMENT_HEIGHT_PX } from './vernierLayout';
import { crowdingLetterFont } from './vtOptotypeFont';

const PANEL_PADDING = 20;
const DIVIDER_WIDTH = 2;
const MIN_CROWDING_LETTER_DEG = 0.25;

const LETTER_FONT = crowdingLetterFont;

function measureLetterWidth(letter: string, fontPx: number): number {
  if (typeof document === 'undefined') return fontPx * 0.65;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return fontPx * 0.65;
  ctx.font = LETTER_FONT(fontPx);
  return ctx.measureText(letter).width;
}

export interface CrowdingLayoutInput {
  spacingRatio: number;
  letterHeightPx: number;
  targetLetter: string;
  flankerLetters: [string, string];
  /** Clinical minimum — from vision level, not fixed visual angle */
  minLetterHeightPx?: number;
  /** Anaglyph (red/blue): reference letters at ±spacingPx to match signal outer span */
  anaglyphMatchedSpan?: boolean;
  /** letter_match_2afc: extra top row for the uncrowded reference letter */
  referenceRow?: boolean;
}

export function computeCrowdingPanelWidth(input: CrowdingLayoutInput): number {
  const { spacingRatio, letterHeightPx, targetLetter, flankerLetters, anaglyphMatchedSpan } = input;
  const spacingPx = spacingRatio * letterHeightPx;
  const targetW = measureLetterWidth(targetLetter, letterHeightPx);
  const flankerW = Math.max(
    measureLetterWidth(flankerLetters[0], letterHeightPx),
    measureLetterWidth(flankerLetters[1], letterHeightPx)
  );

  const signalHalf = spacingPx + Math.max(targetW, flankerW) / 2;
  const refOffset = anaglyphMatchedSpan ? spacingPx : spacingPx / 2;
  const refHalf = refOffset + flankerW / 2;
  return Math.ceil(Math.max(signalHalf, refHalf) * 2 + PANEL_PADDING * 2);
}

export function computeCrowdingCanvasSize(input: CrowdingLayoutInput): { width: number; height: number } {
  const panelWidth = computeCrowdingPanelWidth(input);
  // Reference row (letter_match_2afc): reference letter + vertical gap above the triplets.
  const rowFactor = input.referenceRow ? 1.1 + 0.8 + 1.35 : 1.35;
  const height = Math.ceil(input.letterHeightPx * rowFactor + PANEL_PADDING * 2);
  return {
    width: panelWidth * 2 + DIVIDER_WIDTH,
    height,
  };
}

export interface GaborLayoutInput {
  config: VtStimulusGaborConfig;
  pixelsPerDeg: number;
  /** Clinical plateau diameter — matches Snellen letter height at assigned vision level */
  patchSizePx: number;
}

export function computeGaborCanvasSize(input: GaborLayoutInput): { width: number; height: number } {
  const patchSizePx = Math.max(Math.round(input.patchSizePx), 10);
  const stimulusDiameter = computeGaborStimulusDiameterPx(patchSizePx);
  const panelSize = stimulusDiameter + PANEL_PADDING * 2;
  return {
    width: panelSize * 2 + DIVIDER_WIDTH,
    height: panelSize,
  };
}

export interface VernierLayoutInput {
  offsetPx: number;
  lineHeightPx: number;
  gapPx: number;
  lineWidthPx: number;
  minLineHeightPx?: number;
}

export function computeVernierCanvasSize(input: VernierLayoutInput): { width: number; height: number } {
  const panelWidth = Math.ceil(
    Math.max(input.lineHeightPx, input.offsetPx) + input.lineWidthPx + PANEL_PADDING * 2
  );
  const panelHeight = Math.ceil(
    input.lineHeightPx * 2 + input.gapPx + input.lineWidthPx + PANEL_PADDING * 2
  );
  return {
    width: panelWidth * 2 + DIVIDER_WIDTH,
    height: panelHeight,
  };
}

export interface FitStimulusResult {
  fits: boolean;
  canvasWidth: number;
  canvasHeight: number;
  /** Scaled draw params — may differ from ideal when viewport is tight */
  crowdingLetterHeightPx?: number;
  /** Spacing ratio used when viewport required narrowing (≤ staircase value). */
  crowdingSpacingRatio?: number;
  vernier?: VernierLayoutInput;
  gaborPatchSizePx?: number;
  requiredWidth: number;
  requiredHeight: number;
}

export interface FitStimulusParams {
  world: VtWorld;
  availableWidth: number;
  availableHeight: number;
  pixelsPerDeg: number;
  crowding?: CrowdingLayoutInput & { idealLetterHeightPx: number; minLetterHeightPx?: number; anaglyphMatchedSpan?: boolean; referenceRow?: boolean };
  vernier?: VernierLayoutInput & {
    idealLineHeightPx: number;
    idealGapPx: number;
    idealLineWidthPx: number;
    idealOffsetPx: number;
    minLineHeightPx?: number;
    letterHeightPx?: number;
  };
  gabor?: GaborLayoutInput & { idealPatchSizePx: number; minPatchSizePx?: number };
}

/**
 * Fit stimulus canvas into available viewport. Panels always contain content.
 * Returns fits=false when even minimum clinical size cannot fit.
 */
export function fitStimulusToViewport(params: FitStimulusParams): FitStimulusResult {
  const { world, availableWidth, availableHeight, pixelsPerDeg } = params;
  const maxW = Math.max(availableWidth, 0);
  const maxH = Math.max(availableHeight, 0);

  if (world === 'crowding' && params.crowding) {
    const { targetLetter, flankerLetters, idealLetterHeightPx } = params.crowding;
    const idealSpacingRatio = params.crowding.spacingRatio;
    const anaglyphMatchedSpan = params.crowding.anaglyphMatchedSpan === true;
    const referenceRow = params.crowding.referenceRow === true;
    const minLetterPx =
      params.crowding.minLetterHeightPx ??
      Math.max(lineHeightDegToPx(MIN_CROWDING_LETTER_DEG, pixelsPerDeg), 12);

    let letterHeightPx = idealLetterHeightPx;
    let spacingRatio = idealSpacingRatio;
    let size = computeCrowdingCanvasSize({
      spacingRatio,
      letterHeightPx,
      targetLetter,
      flankerLetters,
      anaglyphMatchedSpan,
      referenceRow,
    });

    while ((size.width > maxW || size.height > maxH) && letterHeightPx > minLetterPx) {
      const scale = Math.min(maxW / size.width, maxH / size.height, 0.92);
      letterHeightPx = Math.max(minLetterPx, Math.floor(letterHeightPx * scale));
      size = computeCrowdingCanvasSize({
        spacingRatio,
        letterHeightPx,
        targetLetter,
        flankerLetters,
        anaglyphMatchedSpan,
        referenceRow,
      });
    }

    // Keep clinical letter size — reduce flanker spacing until the canvas fits.
    while ((size.width > maxW || size.height > maxH) && spacingRatio > 0.4) {
      spacingRatio = Math.max(0.4, Math.round((spacingRatio - 0.25) * 100) / 100);
      size = computeCrowdingCanvasSize({
        spacingRatio,
        letterHeightPx: Math.max(minLetterPx, letterHeightPx),
        targetLetter,
        flankerLetters,
        anaglyphMatchedSpan,
        referenceRow,
      });
    }

    const required = computeCrowdingCanvasSize({
      spacingRatio: idealSpacingRatio,
      letterHeightPx: minLetterPx,
      targetLetter,
      flankerLetters,
      anaglyphMatchedSpan,
      referenceRow,
    });

    if (size.width > maxW || size.height > maxH) {
      return {
        fits: false,
        canvasWidth: required.width,
        canvasHeight: required.height,
        requiredWidth: required.width,
        requiredHeight: required.height,
      };
    }

    return {
      fits: true,
      canvasWidth: size.width,
      canvasHeight: size.height,
      crowdingLetterHeightPx: letterHeightPx,
      crowdingSpacingRatio: spacingRatio,
      requiredWidth: required.width,
      requiredHeight: required.height,
    };
  }

  if (world === 'vernier' && params.vernier) {
    const {
      idealLineHeightPx,
      idealGapPx,
      idealLineWidthPx,
      idealOffsetPx,
    } = params.vernier;

    const minLineHeight =
      params.vernier.minLineHeightPx ?? idealLineHeightPx;
    let lineHeightPx = idealLineHeightPx;
    let gapPx = idealGapPx;
    const lineWidthPx = idealLineWidthPx;
    let offsetPx = idealOffsetPx;

    let size = computeVernierCanvasSize({ offsetPx, lineHeightPx, gapPx, lineWidthPx });

    while ((size.width > maxW || size.height > maxH) && lineHeightPx > VERNIER_MIN_SEGMENT_HEIGHT_PX) {
      const scale = Math.min(maxW / size.width, maxH / size.height, 0.92);
      lineHeightPx = Math.max(VERNIER_MIN_SEGMENT_HEIGHT_PX, Math.floor(lineHeightPx * scale));
      gapPx = Math.max(12, Math.floor(idealGapPx * scale));
      offsetPx = Math.max(0.5, idealOffsetPx * scale);
      size = computeVernierCanvasSize({ offsetPx, lineHeightPx, gapPx, lineWidthPx });
    }

    const required = computeVernierCanvasSize({
      offsetPx: idealOffsetPx,
      lineHeightPx: minLineHeight,
      gapPx: idealGapPx,
      lineWidthPx: idealLineWidthPx,
    });

    if (required.width > maxW || required.height > maxH) {
      return {
        fits: false,
        canvasWidth: required.width,
        canvasHeight: required.height,
        requiredWidth: required.width,
        requiredHeight: required.height,
      };
    }

    return {
      fits: true,
      canvasWidth: size.width,
      canvasHeight: size.height,
      vernier: { offsetPx, lineHeightPx, gapPx, lineWidthPx },
      requiredWidth: required.width,
      requiredHeight: required.height,
    };
  }

  if (world === 'gabor' && params.gabor) {
    const { config, idealPatchSizePx } = params.gabor;
    const minPatchSizePx = params.gabor.minPatchSizePx ?? idealPatchSizePx;

    let patchSizePx = idealPatchSizePx;
    let size = computeGaborCanvasSize({ config, pixelsPerDeg, patchSizePx });

    while ((size.width > maxW || size.height > maxH) && patchSizePx > minPatchSizePx) {
      const scale = Math.min(maxW / size.width, maxH / size.height, 0.92);
      patchSizePx = Math.max(minPatchSizePx, Math.floor(patchSizePx * scale));
      size = computeGaborCanvasSize({ config, pixelsPerDeg, patchSizePx });
    }

    const required = computeGaborCanvasSize({
      config,
      pixelsPerDeg,
      patchSizePx: minPatchSizePx,
    });

    if (required.width > maxW || required.height > maxH) {
      return {
        fits: false,
        canvasWidth: required.width,
        canvasHeight: required.height,
        requiredWidth: required.width,
        requiredHeight: required.height,
      };
    }

    return {
      fits: true,
      canvasWidth: size.width,
      canvasHeight: size.height,
      gaborPatchSizePx: patchSizePx,
      requiredWidth: required.width,
      requiredHeight: required.height,
    };
  }

  return {
    fits: true,
    canvasWidth: 480,
    canvasHeight: 240,
    requiredWidth: 480,
    requiredHeight: 240,
  };
}
