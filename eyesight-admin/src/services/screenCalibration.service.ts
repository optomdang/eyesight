/**
 * Screen Calibration Service
 *
 * Saves a calibrated PPI value (derived from physical ruler or credit-card) AND
 * the native screen dimensions so that downstream code can build a precise
 * ScreenInfo without asking the user again in every exam/exercise.
 *
 * Persistence:
 *   1. localStorage (fast path for the current browser)
 *   2. Server under /me/screen-calibration keyed by device fingerprint
 *      so Safari/Chrome site-data eviction after ~7 days does not force
 *      recalibration on the same machine. A different machine (different
 *      fingerprint) still requires a fresh calibration.
 *
 * @locked Do not modify calibration persistence, PPI formulas, or getPreferredScreenInfo()
 * unless the user explicitly requests screen-calibration / physical-sizing changes.
 * See .cursor/rules/screen-calibration-locked.mdc
 */

import type { ScreenInfo } from 'src/utils/visionUtils';
import { getLastScreenConfig, DEFAULT_SCREEN_CONFIG } from 'src/services/deviceProfile.service';
import { getData, putData } from 'src/utils/request';

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

export interface StoredScreenCalibration extends ScreenCalibration {
  /** Browser-detected screen identity used for same-machine restore. */
  deviceFingerprint: string;
}

/** Credit card ISO 7810 ID-1 dimensions (mm). */
export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 53.98;

export const getDetectedNativeResolution = (): {
  width: number;
  height: number;
  dpr: number;
} => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0, dpr: 1 };
  }
  const dpr = window.devicePixelRatio || 1;
  return {
    width: Math.round(window.screen.width * dpr),
    height: Math.round(window.screen.height * dpr),
    dpr,
  };
};

/**
 * Stable fingerprint for the current display.
 * Dimensions are sorted so landscape/portrait rotation of the same panel still matches.
 */
export const buildDeviceFingerprint = (
  width?: number,
  height?: number,
  dpr?: number
): string => {
  const detected = getDetectedNativeResolution();
  const w = width ?? detected.width;
  const h = height ?? detected.height;
  const ratio = dpr ?? detected.dpr;
  const [a, b] = w <= h ? [w, h] : [h, w];
  return `${a}x${b}@${Number(ratio.toFixed(2))}`;
};

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

const requestPersistentStorage = (): void => {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      void navigator.storage.persist();
    }
  } catch {
    // Best-effort only — Safari may ignore without installed PWA.
  }
};

/**
 * Push local calibration to the server for the current device fingerprint.
 * Failures are swallowed so offline / guest flows still keep local calibration.
 */
export const syncCalibrationToServer = async (cal: ScreenCalibration): Promise<void> => {
  const payload: StoredScreenCalibration = {
    ...cal,
    deviceFingerprint: buildDeviceFingerprint(),
  };
  try {
    await putData<{ calibration: StoredScreenCalibration }, StoredScreenCalibration>(
      '/me/screen-calibration',
      payload
    );
  } catch {
    // Keep local calibration even if sync fails (network / auth race).
  }
};

/**
 * If local calibration is missing, restore from server for this device fingerprint.
 * @returns true when local storage now has a valid calibration.
 */
export const hydrateCalibrationFromServer = async (): Promise<boolean> => {
  if (isCalibrated()) return true;

  const detected = getDetectedNativeResolution();
  if (!(detected.width > 0) || !(detected.height > 0)) {
    return false;
  }
  const deviceFingerprint = buildDeviceFingerprint(detected.width, detected.height, detected.dpr);

  try {
    const { calibration } = await getData<{ calibration: StoredScreenCalibration | null }>(
      `/me/screen-calibration?deviceFingerprint=${encodeURIComponent(deviceFingerprint)}`
    );
    if (
      !calibration ||
      typeof calibration.ppi !== 'number' ||
      calibration.ppi <= 0 ||
      !(calibration.nativeScreenWidth > 0) ||
      !(calibration.nativeScreenHeight > 0) ||
      !(calibration.diagonalInch > 0)
    ) {
      return false;
    }

    const local: ScreenCalibration = {
      ppi: calibration.ppi,
      nativeScreenWidth: calibration.nativeScreenWidth,
      nativeScreenHeight: calibration.nativeScreenHeight,
      diagonalInch: calibration.diagonalInch,
      calibratedDiagonalInch: calibration.calibratedDiagonalInch,
      method: calibration.method === 'ruler' ? 'ruler' : 'card',
      calibratedAt: calibration.calibratedAt,
    };
    saveCalibration(local);
    requestPersistentStorage();
    return isCalibrated();
  } catch {
    return false;
  }
};

/**
 * Build a full ScreenCalibration record and persist it locally (+ best-effort server sync).
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
  diagonalInch: number
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
  requestPersistentStorage();
  void syncCalibrationToServer(cal);
  return cal;
};
