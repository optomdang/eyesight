/**
 * VT Quest — Crowding 2AFC Renderer (Canvas 2D)
 *
 * Crowding: ability to identify a target letter/symbol when surrounded
 * by flanking items. The staircase variable is the spacing ratio:
 *   spacing = spacingRatio × letterHeightPx  (center-to-center)
 *
 * 2AFC layout:
 *   One side: target letter centred, with flankers on both sides at current spacing
 *   Other side: two flankers only (no target) — patient identifies which side has target
 *
 * Letters drawn with OptomDangLatinChart — same font as default far vision exam.
 */

import type { VtResponseSide } from 'src/types/core/vtQuest';
import type { DichopticPresentation } from 'src/types/core/visual-settings';
import { CHAR_POOL_MAP } from 'src/utils/constant';
import { crowdingLetterFont } from '../core/vtOptotypeFont';
import {
  alternatingLetterColors,
  colorAtContrastPercent,
  crowdingReferenceLetterOffsetPx,
  randomAnaglyphLetterColors,
  type VtStimulusColorScheme,
} from '../core/vtStimulusColors';

// Letters from far-vision Latin chart (same pool as portal exam charType 'A')
const TARGET_LETTERS = [...CHAR_POOL_MAP.A];
const FLANKER_LETTERS = [...CHAR_POOL_MAP.A];

export interface CrowdingDrawOptions {
  canvas: HTMLCanvasElement;
  /** Side that has the target with flankers */
  signalSide: VtResponseSide;
  /**
   * Spacing ratio: center-to-center distance = spacingRatio × letterHeightPx.
   * Clinical range: ~0.5 (very crowded) to 3.0+ (no crowding)
   */
  spacingRatio: number;
  /** Letter height in CSS pixels (driven by visual settings) */
  letterHeightPx: number;
  /** Target letter (fixed for a session to prevent confusion) */
  targetLetter: string;
  /** Flanker letters pair [left, right] */
  flankerLetters: [string, string];
  /** Background luminance (0–255) — used when no color scheme */
  backgroundLuminance?: number;
  colorScheme?: VtStimulusColorScheme | null;
  stimulusContrastPercent?: number;
  /** When true (anaglyph config): random colours + matched outer letter span. */
  anaglyphAntiCue?: boolean;
  /** Resolved dichoptic presentation — overrides anaglyphAntiCue color logic when mode=balance. */
  dichopticPresentation?: DichopticPresentation | null;
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

function drawLetter(
  ctx: CanvasRenderingContext2D,
  letter: string,
  cx: number,
  cy: number,
  fontPx: number,
  color: string
): void {
  ctx.save();
  ctx.font = crowdingLetterFont(fontPx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(letter, cx, cy);
  ctx.restore();
}

export interface CrowdingTripletDrawParams {
  ctx: CanvasRenderingContext2D;
  cx: number;
  cy: number;
  spacingPx: number;
  letterHeightPx: number;
  target: string;
  flankers: [string, string];
  letterColors: [string, string, string];
}

/** Draw a single crowding triplet: flanker — target — flanker. */
export function drawCrowdingTriplet(params: CrowdingTripletDrawParams): void {
  const { ctx, cx, cy, spacingPx, letterHeightPx, target, flankers, letterColors } = params;
  drawLetter(ctx, flankers[0], cx - spacingPx, cy, letterHeightPx, letterColors[0]);
  drawLetter(ctx, target, cx, cy, letterHeightPx, letterColors[1]);
  drawLetter(ctx, flankers[1], cx + spacingPx, cy, letterHeightPx, letterColors[2]);
}

/**
 * Derive the signal and fellow colors from a DichopticPresentation.
 * signalColor = the channel that carries the target (amblyopic eye).
 * fellowColor = the other channel (dominant eye, reduced contrast).
 */
function dichopticChannelColors(dp: DichopticPresentation): {
  signalColor: string;
  fellowColor: string;
} {
  const signalColor =
    dp.redChannelRole === 'signal' ? dp.redChannelColor : dp.ch2ChannelColor;
  const fellowColor =
    dp.redChannelRole === 'fellow' ? dp.redChannelColor : dp.ch2ChannelColor;
  return { signalColor, fellowColor };
}

/**
 * Resolve letter colors for a crowding triplet [flanker, target, flanker].
 *
 * In balance mode:
 *   - target (centre letter)  → signal channel (amblyopic eye, full contrast)
 *   - flankers               → fellow channel (dominant eye, reduced contrast)
 *
 * In anti-cue mode: random anaglyph colours (existing behaviour).
 * Otherwise: alternating colour scheme or grey.
 */
function resolveTripletColors(
  useColors: boolean,
  anaglyphMode: boolean,
  colorScheme: VtStimulusColorScheme | null | undefined,
  stimulusContrastPercent: number,
  greyColor: string,
  dichoptic?: DichopticPresentation | null
): [string, string, string] {
  if (dichoptic?.enabled && dichoptic.mode === 'balance') {
    const { signalColor, fellowColor } = dichopticChannelColors(dichoptic);
    return [fellowColor, signalColor, fellowColor];
  }
  if (!useColors) return [greyColor, greyColor, greyColor];
  if (anaglyphMode) {
    return randomAnaglyphLetterColors(
      3,
      colorScheme!.color1,
      colorScheme!.color2,
      stimulusContrastPercent
    ) as [string, string, string];
  }
  return alternatingLetterColors(
    3,
    colorScheme!.color1,
    colorScheme!.color2,
    stimulusContrastPercent,
    true
  ) as [string, string, string];
}

/**
 * Resolve colors for the reference pair (2 flankers, no target).
 * In balance mode both flankers use the fellow channel (dominant eye).
 */
function resolveReferencePairColors(
  useColors: boolean,
  anaglyphMode: boolean,
  colorScheme: VtStimulusColorScheme | null | undefined,
  stimulusContrastPercent: number,
  greyColor: string,
  dichoptic?: DichopticPresentation | null
): [string, string] {
  if (dichoptic?.enabled && dichoptic.mode === 'balance') {
    const { fellowColor } = dichopticChannelColors(dichoptic);
    return [fellowColor, fellowColor];
  }
  if (!useColors) return [greyColor, greyColor];
  if (anaglyphMode) {
    return randomAnaglyphLetterColors(
      2,
      colorScheme!.color1,
      colorScheme!.color2,
      stimulusContrastPercent
    ) as [string, string];
  }
  return alternatingLetterColors(
    2,
    colorScheme!.color1,
    colorScheme!.color2,
    stimulusContrastPercent,
    true
  ) as [string, string];
}

export interface CrowdingSingleDrawOptions {
  canvas: HTMLCanvasElement;
  spacingRatio: number;
  letterHeightPx: number;
  targetLetter: string;
  flankerLetters: [string, string];
  backgroundLuminance?: number;
  colorScheme?: VtStimulusColorScheme | null;
  stimulusContrastPercent?: number;
  dichopticPresentation?: DichopticPresentation | null;
}

/** Draw one centered crowding triplet (central_letter_id, delayed_letter, flanker_same_different). */
export function drawCrowdingSingle(options: CrowdingSingleDrawOptions): void {
  const {
    canvas,
    spacingRatio,
    letterHeightPx,
    targetLetter,
    flankerLetters,
    backgroundLuminance = 200,
    colorScheme,
    stimulusContrastPercent = 100,
    dichopticPresentation,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const useColors = colorScheme?.useColoredPanels === true;
  const panelFill = useColors ? '#000000' : `rgb(${backgroundLuminance},${backgroundLuminance},${backgroundLuminance})`;
  const textLum = backgroundLuminance > 128 ? 20 : 230;
  const greyColor = `rgb(${textLum},${textLum},${textLum})`;
  const spacingPx = spacingRatio * letterHeightPx;

  fillRegion(ctx, 0, 0, W, H, panelFill);

  const letterColors = resolveTripletColors(
    useColors,
    false,
    colorScheme,
    stimulusContrastPercent,
    greyColor,
    dichopticPresentation
  );

  drawCrowdingTriplet({
    ctx,
    cx: W / 2,
    cy: H / 2,
    spacingPx,
    letterHeightPx,
    target: targetLetter,
    flankers: flankerLetters,
    letterColors,
  });
}

export interface CrowdingLetterMatchDrawOptions {
  canvas: HTMLCanvasElement;
  signalSide: VtResponseSide;
  spacingRatio: number;
  letterHeightPx: number;
  referenceLetter: string;
  leftTargetLetter: string;
  rightTargetLetter: string;
  flankerLetters: [string, string];
  backgroundLuminance?: number;
  colorScheme?: VtStimulusColorScheme | null;
  stimulusContrastPercent?: number;
  anaglyphAntiCue?: boolean;
  dichopticPresentation?: DichopticPresentation | null;
}

/** Reference letter on top + 2AFC crowding triplets below. */
export function drawCrowdingLetterMatch(options: CrowdingLetterMatchDrawOptions): void {
  const {
    canvas,
    signalSide,
    spacingRatio,
    letterHeightPx,
    referenceLetter,
    leftTargetLetter,
    rightTargetLetter,
    flankerLetters,
    backgroundLuminance = 200,
    colorScheme,
    stimulusContrastPercent = 100,
    anaglyphAntiCue = false,
    dichopticPresentation,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const halfW = Math.floor(W / 2);
  const useColors = colorScheme?.useColoredPanels === true;
  // Anti-cue: active only when NOT in balance mode
  const anaglyphMode =
    anaglyphAntiCue && useColors && !(dichopticPresentation?.mode === 'balance');
  const panelFill = useColors ? '#000000' : `rgb(${backgroundLuminance},${backgroundLuminance},${backgroundLuminance})`;
  const textLum = backgroundLuminance > 128 ? 20 : 230;
  const greyColor = `rgb(${textLum},${textLum},${textLum})`;
  const spacingPx = spacingRatio * letterHeightPx;

  fillRegion(ctx, 0, 0, W, H, panelFill);

  // Vertical layout (top → bottom): padding, reference letter, gap, triplet row.
  const padding = 20;
  const refFontPx = letterHeightPx * 1.1;
  const rowGapPx = letterHeightPx * 0.8;
  const refCy = padding + refFontPx / 2;
  const tripletY = refCy + refFontPx / 2 + rowGapPx + letterHeightPx / 2;

  // Reference letter: use signal channel in balance mode
  const refColor =
    dichopticPresentation?.enabled && dichopticPresentation.mode === 'balance'
      ? dichopticChannelColors(dichopticPresentation).signalColor
      : useColors
        ? colorAtContrastPercent(colorScheme!.color1, stimulusContrastPercent)
        : greyColor;
  drawLetter(ctx, referenceLetter, W / 2, refCy, refFontPx, refColor);

  const dividerTop = refCy + refFontPx / 2 + rowGapPx * 0.35;
  ctx.fillStyle = useColors ? '#333333' : 'rgb(80,80,80)';
  ctx.fillRect(halfW - 1, dividerTop, 2, H - dividerTop);

  const leftCx = halfW / 2;
  const rightCx = halfW + halfW / 2;

  const leftColors = resolveTripletColors(
    useColors,
    anaglyphMode,
    colorScheme,
    stimulusContrastPercent,
    greyColor,
    dichopticPresentation
  );
  const rightColors = resolveTripletColors(
    useColors,
    anaglyphMode,
    colorScheme,
    stimulusContrastPercent,
    greyColor,
    dichopticPresentation
  );

  drawCrowdingTriplet({
    ctx,
    cx: leftCx,
    cy: tripletY,
    spacingPx,
    letterHeightPx,
    target: leftTargetLetter,
    flankers: flankerLetters,
    letterColors: leftColors,
  });
  drawCrowdingTriplet({
    ctx,
    cx: rightCx,
    cy: tripletY,
    spacingPx,
    letterHeightPx,
    target: rightTargetLetter,
    flankers: flankerLetters,
    letterColors: rightColors,
  });

  void signalSide;
}

export interface CrowdingGridDrawOptions {
  canvas: HTMLCanvasElement;
  spacingRatio: number;
  letterHeightPx: number;
  cardTargets: string[];
  flankerLetters: [string, string];
  backgroundLuminance?: number;
  colorScheme?: VtStimulusColorScheme | null;
  stimulusContrastPercent?: number;
  dichopticPresentation?: DichopticPresentation | null;
}

/** Draw a 2×2 grid of crowding triplets (odd_letter_out). */
export function drawCrowdingGrid(options: CrowdingGridDrawOptions): void {
  const {
    canvas,
    spacingRatio,
    letterHeightPx,
    cardTargets,
    flankerLetters,
    backgroundLuminance = 200,
    colorScheme,
    stimulusContrastPercent = 100,
    dichopticPresentation,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const useColors = colorScheme?.useColoredPanels === true;
  const panelFill = useColors ? '#000000' : `rgb(${backgroundLuminance},${backgroundLuminance},${backgroundLuminance})`;
  const textLum = backgroundLuminance > 128 ? 20 : 230;
  const greyColor = `rgb(${textLum},${textLum},${textLum})`;
  const spacingPx = spacingRatio * letterHeightPx;

  fillRegion(ctx, 0, 0, W, H, panelFill);

  const cols = 2;
  const rows = Math.ceil(cardTargets.length / cols);
  const cellW = W / cols;
  const cellH = H / rows;

  cardTargets.forEach((target, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = col * cellW + cellW / 2;
    const cy = row * cellH + cellH / 2;
    const letterColors = resolveTripletColors(
      useColors,
      false,
      colorScheme,
      stimulusContrastPercent,
      greyColor,
      dichopticPresentation
    );
    drawCrowdingTriplet({
      ctx,
      cx,
      cy,
      spacingPx,
      letterHeightPx,
      target,
      flankers: flankerLetters,
      letterColors,
    });
  });
}

/**
 * Draw signal side: target at centre + 2 flankers at spacing.
 * 3 letters alternate color1 / color2.
 */
function drawSignalSide(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spacingPx: number,
  letterHeightPx: number,
  target: string,
  flankers: [string, string],
  letterColors: [string, string, string]
): void {
  drawCrowdingTriplet({
    ctx,
    cx,
    cy,
    spacingPx,
    letterHeightPx,
    target,
    flankers,
    letterColors,
  });
}

/**
 * Draw reference side: two flankers only (no target), same spacing.
 * 2 letters: one color1, one color2.
 */
function drawReferenceSide(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spacingPx: number,
  letterHeightPx: number,
  flankers: [string, string],
  letterColors: [string, string],
  anaglyphMatchedSpan: boolean
): void {
  const offset = crowdingReferenceLetterOffsetPx(spacingPx, anaglyphMatchedSpan);
  drawLetter(ctx, flankers[0], cx - offset, cy, letterHeightPx, letterColors[0]);
  drawLetter(ctx, flankers[1], cx + offset, cy, letterHeightPx, letterColors[1]);
}

/**
 * Main entry: draw 2AFC Crowding stimulus.
 */
export function drawCrowding2AFC(options: CrowdingDrawOptions): void {
  const {
    canvas,
    signalSide,
    spacingRatio,
    letterHeightPx,
    targetLetter,
    flankerLetters,
    backgroundLuminance = 200,
    colorScheme,
    stimulusContrastPercent = 100,
    anaglyphAntiCue = false,
    dichopticPresentation,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const halfW = Math.floor(W / 2);
  const useColors = colorScheme?.useColoredPanels === true;
  // Anti-cue is disabled when balance mode is active (balance handles its own color logic)
  const anaglyphMode =
    anaglyphAntiCue && useColors && !(dichopticPresentation?.mode === 'balance');
  const panelFill = useColors ? '#000000' : `rgb(${backgroundLuminance},${backgroundLuminance},${backgroundLuminance})`;
  const textLum = backgroundLuminance > 128 ? 20 : 230;
  const greyColor = `rgb(${textLum},${textLum},${textLum})`;
  const spacingPx = spacingRatio * letterHeightPx;

  fillRegion(ctx, 0, 0, W, H, panelFill);

  ctx.fillStyle = useColors ? '#333333' : 'rgb(80,80,80)';
  ctx.fillRect(halfW - 1, 0, 2, H);

  const leftCx = halfW / 2;
  const rightCx = halfW + halfW / 2;
  const midY = H / 2;

  const signalColors = resolveTripletColors(
    useColors,
    anaglyphMode,
    colorScheme,
    stimulusContrastPercent,
    greyColor,
    dichopticPresentation
  );

  const referenceColors = resolveReferencePairColors(
    useColors,
    anaglyphMode,
    colorScheme,
    stimulusContrastPercent,
    greyColor,
    dichopticPresentation
  );

  if (signalSide === 'left') {
    drawSignalSide(
      ctx,
      leftCx,
      midY,
      spacingPx,
      letterHeightPx,
      targetLetter,
      flankerLetters,
      signalColors
    );
    drawReferenceSide(
      ctx,
      rightCx,
      midY,
      spacingPx,
      letterHeightPx,
      flankerLetters,
      referenceColors,
      anaglyphMode
    );
  } else {
    drawReferenceSide(
      ctx,
      leftCx,
      midY,
      spacingPx,
      letterHeightPx,
      flankerLetters,
      referenceColors,
      anaglyphMode
    );
    drawSignalSide(
      ctx,
      rightCx,
      midY,
      spacingPx,
      letterHeightPx,
      targetLetter,
      flankerLetters,
      signalColors
    );
  }
}

/**
 * Clear canvas to bright grey or black (colored scheme).
 */
export function clearCrowdingCanvas(
  canvas: HTMLCanvasElement,
  backgroundLuminance = 200,
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
 * Pick a random target letter that isn't in the flanker set.
 */
export function pickTargetLetter(
  exclude: string[] = [],
  random: () => number = Math.random
): string {
  const available = TARGET_LETTERS.filter((l) => !exclude.includes(l));
  return available[Math.floor(random() * available.length)] ?? 'E';
}

/**
 * Pick flanker letters that are different from the target.
 */
export function pickFlankerLetters(
  target: string,
  random: () => number = Math.random
): [string, string] {
  const available = FLANKER_LETTERS.filter((l) => l !== target);
  const a = available[Math.floor(random() * available.length)] ?? 'B';
  const b =
    available.filter((l) => l !== a)[Math.floor(random() * (available.length - 1))] ?? 'C';
  return [a, b];
}
