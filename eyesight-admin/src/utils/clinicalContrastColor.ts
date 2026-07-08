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
 * Blend foreground toward background by clinical contrast percent (0–100).
 * 100 → full foreground; 0 → background. Result is always opaque.
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
