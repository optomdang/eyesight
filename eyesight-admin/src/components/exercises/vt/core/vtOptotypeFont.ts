/**
 * Clinical optotype font for VT Quest Crowding — matches default far vision exam (Latin chart).
 */
import { FONT_MAP } from 'src/utils/constant';
import { ensureOptotypeFontsLoaded } from 'src/utils/optotypeFonts';

/** Default far-vision chart in portal exam (exam-state charType) */
export const VT_FAR_VISION_CHAR_TYPE = 'A' as const;

export const VT_CROWDING_FONT_FAMILY = FONT_MAP[VT_FAR_VISION_CHAR_TYPE];

export function crowdingLetterFont(fontPx: number): string {
  return `${fontPx}px "${VT_CROWDING_FONT_FAMILY}"`;
}

/** Ensure custom optotype font is loaded before canvas drawText */
export function ensureVtOptotypeFontLoaded(_fontPx = 16): Promise<void> {
  return ensureOptotypeFontsLoaded().then(() => undefined);
}
