/**
 * Screen Calibration Service
 *
 * Saves a calibrated PPI value (derived from physical ruler or credit-card) AND
 * the native screen dimensions so that downstream code can build a precise
 * ScreenInfo without asking the user again in every exam/exercise.
 *
 * @locked Do not modify calibration persistence, PPI formulas, or getPreferredScreenInfo()
 * unless the user explicitly requests screen-calibration / physical-sizing changes.
 * See .cursor/rules/screen-calibration-locked.mdc
 */

import type { ScreenInfo } from 'src/utils/visionUtils';
import { getLastScreenConfig, DEFAULT_SCREEN_CONFIG } from 'src/services/deviceProfile.service';

const CALIBRATION_KEY = 'eyesight_screen_calibration';

export interface ScreenCalibration {
  /** Physical PPI measured by the user (pixels per inch). */
  ppi: number;

  // ── Screen dimensions (entered during calibration) ──────────────────────
  /** Native physical pixel width (CSS px × DPR). */
  nativeScreenWidth: number;
  /** Native physical pixel height (CSS px × DPR). */
  nativeScreenHeight: number;
  /** Physical diagonal in inches entered by the user. */
  diagonalInch: number;

  // ── Derived / meta ───────────────────────────────────────────────────────
  /** Effective diagonal in inches derived from calibration (for display/info). */
  calibratedDiagonalInch: number;
  /** Method used: 'card' | 'ruler' */
  method: 'card' | 'ruler';
  /** ISO timestamp */
  calibratedAt: string;
}

/** Credit card ISO 7810 ID-1 dimensions (mm). */
export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 53.98;

export const saveCalibration = (cal: ScreenCalibration): void => {
  localStorage.setItem(CALIBRATION_KEY, JSON.stringify(cal));
};

export const loadCalibration = (): ScreenCalibration | null => {
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ScreenCalibration>;
    if (typeof parsed.ppi !== 'number' || parsed.ppi <= 0) return null;
    return parsed as ScreenCalibration;
  } catch {
    return null;
  }
};

export const clearCalibration = (): void => {
  localStorage.removeItem(CALIBRATION_KEY);
};

/**
 * Returns true only when both PPI *and* screen dimensions have been saved.
 */
export const isCalibrated = (): boolean => {
  const cal = loadCalibration();
  if (!cal) return false;
  return cal.nativeScreenWidth > 0 && cal.nativeScreenHeight > 0 && cal.diagonalInch > 0;
};

/**
 * Build a ScreenInfo from saved calibration data.
 * Returns null when calibration has not been performed yet.
 */
export const getCalibrationScreenInfo = (): ScreenInfo | null => {
  const cal = loadCalibration();
  if (!cal || !cal.nativeScreenWidth || !cal.nativeScreenHeight || !cal.diagonalInch) return null;
  return {
    screenWidth: cal.nativeScreenWidth,
    screenHeight: cal.nativeScreenHeight,
    diagonalInch: cal.diagonalInch,
  };
};

/**
 * Returns the best available ScreenInfo across the whole app:
 *   1. Calibrated screen info (most accurate)
 *   2. Last manually saved screen config
 *   3. Built-in default (15.6" 1920×1080)
 *
 * Use this everywhere a ScreenInfo is needed so all views stay in sync.
 */
export const getPreferredScreenInfo = (): ScreenInfo =>
  getCalibrationScreenInfo() ?? getLastScreenConfig() ?? DEFAULT_SCREEN_CONFIG;

/**
 * Derive calibrated PPI from a drag-to-fit credit card.
 * @param cardWidthPx  Width in CSS px after the user resizes the on-screen card.
 */
export const computePpiFromCard = (cardWidthPx: number): number => {
  const cardWidthInch = CARD_WIDTH_MM / 25.4;
  return cardWidthPx / cardWidthInch;
};

/**
 * Derive calibrated PPI from a physical ruler.
 * @param rulerLengthMm  Physical length the user typed (in mm).
 * @param rulerLengthPx  On-screen length of the ruler bar in CSS px.
 */
export const computePpiFromRuler = (rulerLengthMm: number, rulerLengthPx: number): number => {
  const rulerLengthInch = rulerLengthMm / 25.4;
  return rulerLengthPx / rulerLengthInch;
};

/**
 * Build a full ScreenCalibration record and persist it.
 * @param ppi             Calibrated PPI from card or ruler method.
 * @param method          'card' | 'ruler'
 * @param nativeScreenWidth   Physical pixel width (CSS px × DPR).
 * @param nativeScreenHeight  Physical pixel height (CSS px × DPR).
 * @param diagonalInch    Physical diagonal entered by the user (inches).
 */
export const buildAndSaveCalibration = (
  ppi: number,
  method: 'card' | 'ruler',
  nativeScreenWidth: number,
  nativeScreenHeight: number,
  diagonalInch: number,
): ScreenCalibration => {
  const diagPx = Math.sqrt(nativeScreenWidth * nativeScreenWidth + nativeScreenHeight * nativeScreenHeight);
  const calibratedDiagonalInch = diagPx / ppi;

  const cal: ScreenCalibration = {
    ppi,
    nativeScreenWidth,
    nativeScreenHeight,
    diagonalInch,
    calibratedDiagonalInch,
    method,
    calibratedAt: new Date().toISOString(),
  };
  saveCalibration(cal);
  return cal;
};
