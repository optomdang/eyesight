/**
 * Clinical optotype font for VT Quest Crowding — matches default far vision exam (Latin chart).
 */
import 'src/features/portal/views/exam/components/exam-fonts.css';
import { FONT_MAP } from 'src/utils/constant';

/** Default far-vision chart in portal exam (exam-state charType) */
export const VT_FAR_VISION_CHAR_TYPE = 'A' as const;

export const VT_CROWDING_FONT_FAMILY = FONT_MAP[VT_FAR_VISION_CHAR_TYPE];

export function crowdingLetterFont(fontPx: number): string {
  return `${fontPx}px ${VT_CROWDING_FONT_FAMILY}, sans-serif`;
}

let fontReady: Promise<void> | null = null;

/** Ensure custom optotype font is loaded before canvas drawText */
export function ensureVtOptotypeFontLoaded(fontPx = 16): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (!fontReady) {
    fontReady = document.fonts
      .load(`${fontPx}px ${VT_CROWDING_FONT_FAMILY}`)
      .then(() => {})
      .catch(() => {});
  }
  return fontReady;
}
