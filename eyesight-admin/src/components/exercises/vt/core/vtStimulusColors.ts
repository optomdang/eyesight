/**
 * VT Quest — clinical color + contrast helpers for Vernier / Crowding.
 */

import type { ColorScheme } from 'src/types/core/visual-settings';
import { blendHexAtContrastPercent } from 'src/utils/clinicalContrastColor';

export interface VtStimulusColorScheme {
  color1: string;
  color2: string;
  useColoredPanels: boolean;
}

/** Blend foreground toward background by clinical contrast percent (0–100). */
export function colorAtContrastPercent(
  foregroundHex: string,
  contrastPercent: number,
  backgroundHex = '#000000'
): string {
  return blendHexAtContrastPercent(foregroundHex, contrastPercent, backgroundHex);
}

/** True when exercise config uses a non-default color scheme for games 2 & 3. */
export function isVtColoredStimulusScheme(
  colorScheme?: ColorScheme | null
): colorScheme is ColorScheme {
  if (!colorScheme || typeof colorScheme !== 'object') return false;
  if (colorScheme.preset === 'original') return false;
  if (colorScheme.preset && colorScheme.preset !== 'whiteBlack') return true;
  const text = (colorScheme.textColor || '').toLowerCase();
  const bg = (colorScheme.backgroundColor || '').toLowerCase();
  return text !== '#000000' && text !== '#000' && bg !== '#ffffff' && bg !== '#fff';
}

export function resolveVtStimulusColorScheme(
  colorScheme?: ColorScheme | null
): VtStimulusColorScheme | null {
  if (!isVtColoredStimulusScheme(colorScheme)) return null;
  return {
    color1: colorScheme.textColor || '#ff0000',
    color2: colorScheme.backgroundColor || '#0000ff',
    useColoredPanels: true,
  };
}

/**
 * Alternating color1/color2 for N letters on one crowding side.
 * 3 letters → c1, c2, c1 (or reversed). 2 letters → c1, c2.
 */
export function alternatingLetterColors(
  count: number,
  color1: string,
  color2: string,
  contrastPercent: number,
  startWithColor1 = true
): string[] {
  const c1 = colorAtContrastPercent(color1, contrastPercent);
  const c2 = colorAtContrastPercent(color2, contrastPercent);
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const useFirst = startWithColor1 ? i % 2 === 0 : i % 2 === 1;
    colors.push(useFirst ? c1 : c2);
  }
  return colors;
}

/** redBlue / redGreen presets — anaglyph anti-cue rules apply to Crowding only. */
export function isAnaglyphExerciseColorScheme(colorScheme?: ColorScheme | null): boolean {
  if (!colorScheme) return false;
  return colorScheme.preset === 'redBlue' || colorScheme.preset === 'redGreen';
}

/**
 * Random c1/c2 per letter for anaglyph Crowding — both colours always appear,
 * positions shuffled so neither panel has a fixed pattern (e.g. always c1,c2,c1).
 */
export function randomAnaglyphLetterColors(
  count: number,
  color1: string,
  color2: string,
  contrastPercent: number,
  random: () => number = Math.random
): string[] {
  const c1 = colorAtContrastPercent(color1, contrastPercent);
  const c2 = colorAtContrastPercent(color2, contrastPercent);

  if (count === 2) {
    return random() < 0.5 ? [c1, c2] : [c2, c1];
  }

  if (count === 3) {
    const majority = random() < 0.5 ? c1 : c2;
    const minority = majority === c1 ? c2 : c1;
    const minorityIndex = Math.floor(random() * 3);
    return [0, 1, 2].map((i) => (i === minorityIndex ? minority : majority));
  }

  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(random() < 0.5 ? c1 : c2);
  }
  return colors;
}

/** Centre-to-centre gap between the two reference letters. */
export function crowdingReferenceLetterOffsetPx(
  spacingPx: number,
  anaglyphMatchedSpan: boolean
): number {
  return anaglyphMatchedSpan ? spacingPx : spacingPx / 2;
}
