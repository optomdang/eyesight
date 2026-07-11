/**
 * Clinical Weber-style contrast as opaque color blend.
 *
 * Prefer this over CSS `opacity` or `filter: contrast()` — those look like a
 * fog / translucent layer rather than reduced letter–background contrast.
 */

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '').trim();
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Map clinical contrast percent (0–100) to a perceptual blend weight (log-power curve).
 * γ < 1 spreads visible steps across the low range — 5% vs 15% easier to distinguish
 * than with linear mapping. 100% and 0% are unchanged.
 */
export function contrastPercentToPerceptualBlend(
  contrastPercent: number,
  gamma = DICHOPTIC_PERCEPTUAL_GAMMA
): number {
  const p = Math.max(0, Math.min(100, contrastPercent)) / 100;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return Math.pow(p, gamma);
}

/** Default γ for dichoptic anaglyph channel blending (sqrt curve). */
export const DICHOPTIC_PERCEPTUAL_GAMMA = 0.5;

/**
 * Opaque blend using perceptual log-power curve instead of linear percent.
 * Used for dichoptic balance channel colors (blend toward black background).
 */
export function blendHexAtLogContrastPercent(
  foregroundHex: string,
  contrastPercent: number,
  backgroundHex: string,
  gamma = DICHOPTIC_PERCEPTUAL_GAMMA
): string {
  const t = contrastPercentToPerceptualBlend(contrastPercent, gamma);
  const [fr, fg, fb] = parseHex(foregroundHex);
  const [br, bg, bb] = parseHex(backgroundHex);
  return toHex(br + (fr - br) * t, bg + (fg - bg) * t, bb + (fb - bb) * t);
}

/**
 * Blend foreground toward background by clinical contrast percent (0–100).
 * 100 → full foreground; 0 → background. Result is always opaque.
 * Linear mapping — used for exam / Far Acuity vision contrast (not dichoptic channels).
 */
export function blendHexAtContrastPercent(
  foregroundHex: string,
  contrastPercent: number,
  backgroundHex: string
): string {
  const t = Math.max(0, Math.min(100, contrastPercent)) / 100;
  const [fr, fg, fb] = parseHex(foregroundHex);
  const [br, bg, bb] = parseHex(backgroundHex);
  return toHex(br + (fr - br) * t, bg + (fg - bg) * t, bb + (fb - bb) * t);
}

/**
 * Resolve opaque stimulus colors for contrast vision (exam / Far Acuity / games).
 * When contrast is ~100%, returns the base colors unchanged.
 */
export function resolveOpaqueContrastColors(params: {
  contrastPercent: number;
  textColor?: string;
  backgroundColor?: string;
}): { textColor: string; backgroundColor: string } {
  const backgroundColor = params.backgroundColor || '#FFFFFF';
  const textColor = params.textColor || '#000000';
  const contrast =
    typeof params.contrastPercent === 'number' && Number.isFinite(params.contrastPercent)
      ? Math.max(0, Math.min(100, params.contrastPercent))
      : 100;

  if (contrast >= 99.5) {
    return { textColor, backgroundColor };
  }

  return {
    backgroundColor,
    textColor: blendHexAtContrastPercent(textColor, contrast, backgroundColor),
  };
}
