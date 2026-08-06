/**
 * Breathing room around clinical optotype glyphs.
 * Round letters (O/C/D) and AA often ink past the em-box by several px.
 * Shared by portal exams (ExamChar) and VAC exercise (OptotypeChar).
 */

export const OPTOTYPE_CELL_PAD_MIN_PX = 8;
/** Extra pad as a fraction of clinical font size (each side). */
export const OPTOTYPE_CELL_PAD_RATIO = 0.08;

/** Per-side pad so curved strokes are not clipped by the layout cell / ancestors. */
export function resolveOptotypeCellPadPx(fontSizePx: number): number {
  if (!Number.isFinite(fontSizePx) || fontSizePx <= 0) return OPTOTYPE_CELL_PAD_MIN_PX;
  return Math.max(OPTOTYPE_CELL_PAD_MIN_PX, Math.ceil(fontSizePx * OPTOTYPE_CELL_PAD_RATIO));
}
