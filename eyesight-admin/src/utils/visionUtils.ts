/**
 * Vision Calculation and Scaling Utilities
 * Complete vision-based calculation and scaling system
 */

import { TestItem, VisualSettings } from 'src/types/core';
import {
  CHAR_POOL_MAP,
  farVisionLevels,
  nearVisionLevels,
  contrastVisionLevels,
  stereopsisLevels,
  stereopsisImages,
} from './constant';
import {
  formatStereopsisLevel,
  shouldReverseStereopsisChartYAxis,
} from './stereopsis/stereopsisSteps';

// ==================== CLINICAL CONSTANTS (SINGLE SOURCE OF TRUTH) ====================
// @locked — Snellen/mm→px sizing chain. Do not change without explicit user request.
// See .cursor/rules/screen-calibration-locked.mdc

export const SNELLEN_REFERENCE_DISTANCE_M = 6;
export const SNELLEN_REFERENCE_DENOMINATOR = 20;
export const SNELLEN_OPTOTYPE_ARC_MINUTES = 5;

// Clear Sans digits render lower than CSS font-size (cap-height ratio < 1).
// Compensate so physical glyph height matches clinical target height.
export const CLEAR_SANS_DIGIT_CAP_HEIGHT_RATIO = 0.72;

// Base 2048 tile font-size in original stylesheet (public/2048/style/main.css).
export const BASE_2048_FONT_PX = 55;

// ==================== VISION NOTATION FORMATTING ====================

/**
 * Format vision level to standard medical notation
 * @param examType - Type of exam (far, near, contrast, stereopsis)
 * @param level - Vision level (number or string)
 * @returns Formatted vision notation (e.g., "20/20", "N8", "0.30", "Lv 5")
 */
export const formatVisionLevel = (
  examType: string,
  level: number | string | null | undefined
): string => {
  if (!level) return '-';

  const levelNum = typeof level === 'string' ? parseInt(level, 10) : level;
  if (isNaN(levelNum)) return '-';

  switch (examType) {
    case 'far': {
      const visionData = farVisionLevels.find((v) => v.level === levelNum);
      return visionData ? visionData.score : `Lv ${levelNum}`;
    }
    case 'near': {
      const visionData = nearVisionLevels.find((v) => v.level === levelNum);
      return visionData ? visionData.score : `Lv ${levelNum}`;
    }
    case 'contrast': {
      const visionData = contrastVisionLevels.find((v) => v.level === levelNum);
      return visionData ? visionData.score : `Lv ${levelNum}`;
    }
    case 'stereopsis':
      return formatStereopsisLevel(levelNum);
    default:
      return `Lv ${levelNum}`;
  }
};

/**
 * Format vision result for display with left and right eye
 * @param examType - Type of exam
 * @param leftEyeLevel - Left eye vision level
 * @param rightEyeLevel - Right eye vision level
 * @returns Object with formatted left and right values
 */
export const formatBinocularVision = (
  examType: string,
  leftEyeLevel: number | string | null | undefined,
  rightEyeLevel: number | string | null | undefined
): { left: string; right: string } => {
  return {
    left: formatVisionLevel(examType, leftEyeLevel),
    right: formatVisionLevel(examType, rightEyeLevel),
  };
};

/**
 * Exam setup screen: which cached examResults bucket to show as "current vision".
 * Contrast tests size letters from far acuity (≥20/100), so show far — not contrast levels.
 */
export function getExamSetupVisionResultSource(
  examType: string
): 'far' | 'near' | 'contrast' | 'stereopsis' {
  if (examType === 'contrast') return 'far';
  if (examType === 'near' || examType === 'far' || examType === 'stereopsis') {
    return examType;
  }
  return 'far';
}

/** Map stored exam level to chart Y value; null = no data (do not plot as 0). */
export function toExamChartVisionLevel(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Build per-eye chart values for one exam result row.
 * Returns null when the result has no plottable levels (skip date on chart).
 */
export function mapExamResultLevelsForChart(
  examType: string,
  result: { leftEyeLevel?: unknown; rightEyeLevel?: unknown; bothEyeLevel?: unknown }
): { leftEye?: number | null; rightEye?: number | null; bothEye?: number | null } | null {
  if (examType === 'stereopsis') {
    const bothEye = toExamChartVisionLevel(result.bothEyeLevel);
    return bothEye === null ? null : { bothEye };
  }
  const leftEye = toExamChartVisionLevel(result.leftEyeLevel);
  const rightEye = toExamChartVisionLevel(result.rightEyeLevel);
  if (leftEye === null && rightEye === null) return null;
  return { leftEye, rightEye };
}

// ==================== EXAM CHART Y-AXIS ====================

export type VisionExamChartRow = {
  leftEye?: number;
  rightEye?: number;
  bothEye?: number;
};

export interface VisionExamChartYAxisConfig {
  ticks: number[];
  domain: [number, number];
  tickFormatter: (value: number) => string;
  reversed: boolean;
  allowDecimals: boolean;
}

function collectChartLevelValues(data: VisionExamChartRow[]): number[] {
  const values: number[] = [];
  data.forEach((row) => {
    for (const key of ['leftEye', 'rightEye', 'bothEye'] as const) {
      const v = row[key];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        values.push(v);
      }
    }
  });
  return values;
}

function filterDiscreteTicks(allTicks: number[], min: number, max: number, pad = 1): number[] {
  if (allTicks.length === 0) return [];
  const low = Math.max(allTicks[0], min - pad);
  const high = Math.min(allTicks[allTicks.length - 1], max + pad);
  const ticks = allTicks.filter((t) => t >= low && t <= high);
  return ticks.length > 0 ? ticks : [min, max];
}

/**
 * Discrete Y-axis for exam history charts.
 * Recharts auto ticks produce fractional values (e.g. 1.5) that format as "Lv 1.5"
 * instead of clinical contrast / vision notation.
 */
export function getVisionExamChartYAxisConfig(
  examType: string,
  data: VisionExamChartRow[]
): VisionExamChartYAxisConfig {
  const values = collectChartLevelValues(data);
  const minVal = values.length ? Math.min(...values) : 1;
  const maxVal = values.length ? Math.max(...values) : 1;

  const integerLevelFormatter = (v: number) => {
    const rounded = Math.round(v);
    if (!Number.isFinite(v) || Math.abs(v - rounded) > 1e-6) return '';
    return formatVisionLevel(examType, rounded);
  };

  switch (examType) {
    case 'contrast': {
      const allTicks = contrastVisionLevels.map((l) => l.level);
      const ticks = filterDiscreteTicks(allTicks, minVal, maxVal);
      return {
        ticks,
        domain: [ticks[0], ticks[ticks.length - 1]],
        tickFormatter: integerLevelFormatter,
        reversed: false,
        allowDecimals: false,
      };
    }
    case 'near': {
      const allTicks = nearVisionLevels.map((l) => l.level);
      const ticks = filterDiscreteTicks(allTicks, minVal, maxVal);
      return {
        ticks,
        domain: [ticks[0], ticks[ticks.length - 1]],
        tickFormatter: integerLevelFormatter,
        reversed: false,
        allowDecimals: false,
      };
    }
    case 'far': {
      const allTicks = farVisionLevels.map((l) => l.level);
      const ticks = filterDiscreteTicks(allTicks, minVal, maxVal);
      return {
        ticks,
        domain: [ticks[0], ticks[ticks.length - 1]],
        tickFormatter: integerLevelFormatter,
        reversed: false,
        allowDecimals: false,
      };
    }
    case 'stereopsis': {
      const reversed = shouldReverseStereopsisChartYAxis(values);
      if (reversed) {
        const allTicks = stereopsisLevels.map((l) => l.level).sort((a, b) => a - b);
        const ticks = allTicks.filter((t) => t >= minVal - 40 && t <= maxVal + 40);
        const resolvedTicks = ticks.length > 0 ? ticks : allTicks;
        return {
          ticks: resolvedTicks,
          domain: [resolvedTicks[0], resolvedTicks[resolvedTicks.length - 1]],
          tickFormatter: (v) => formatVisionLevel('stereopsis', v),
          reversed: true,
          allowDecimals: false,
        };
      }
      const allTicks = Array.from({ length: 10 }, (_, i) => i + 1);
      const ticks = filterDiscreteTicks(allTicks, minVal, maxVal);
      return {
        ticks,
        domain: [ticks[0], ticks[ticks.length - 1]],
        tickFormatter: integerLevelFormatter,
        reversed: false,
        allowDecimals: false,
      };
    }
    default: {
      const ticks = filterDiscreteTicks([minVal, maxVal], minVal, maxVal, 0);
      return {
        ticks,
        domain: [ticks[0], ticks[ticks.length - 1]],
        tickFormatter: integerLevelFormatter,
        reversed: false,
        allowDecimals: false,
      };
    }
  }
}

// ==================== INTERFACES ====================

// Vision Level Interface
export interface VisionLevel {
  level: string; // e.g., "2/10", "20/200"
  distance: number; // meters
}

// Patient Vision Data Interface
export interface PatientVisionData {
  farVisionLevel?: number; // Level 1-20 (not "20/200")
  nearVisionLevel?: number; // Level 1-6 (not "N3")
  contrastLevel?: number; // Level 1-16 (not "100%")
  distance?: number; // meters
}

// Vision Type
export type VisionType = 'far' | 'near' | 'contrast' | 'stereopsis';

// Vision Scaling Configuration
export interface VisionScalingConfig {
  visionType: VisionType;
  visionLevel?: string; // Override from admin config
  levelOverride?: boolean; // Admin override flag
  patientVision: PatientVisionData;
}

// ==================== VISION DISPLAY HELPERS ====================

/**
 * Get current vision level for a patient, respecting eye config
 * @param examResults - Patient's exam results
 * @param visionType - Type of vision test
 * @param eye - Which eye: 'left' | 'right' (defaults to 'left')
 * @returns Formatted vision level string or 'N/A' if not available
 */
export const getCurrentVisionLevel = (
  examResults: any, // Using any to avoid circular dependency with Patient type
  visionType: VisionType,
  eye?: 'left' | 'right' | 'both' | null
): string => {
  const currentResult = examResults?.[visionType]?.currentResult;
  if (!currentResult) return 'N/A';

  // Pick level based on eye config
  let level: number | null | undefined;
  if (eye === 'right') {
    level = currentResult.rightEye;
  } else if (eye === 'left') {
    level = currentResult.leftEye;
  } else if (eye === 'both') {
    level = resolveExerciseVisionLevel(currentResult, 'both');
  } else {
    level = currentResult.leftEye;
  }

  return level ? formatVisionLevel(visionType, level) : 'N/A';
};

export type TrainingEye = 'left' | 'right' | 'both';

/** Effective training eye: assignment override → config template → null. */
export const resolveAssignmentTrainingEye = (params: {
  trainingEye?: TrainingEye | string | null;
  configEye?: TrainingEye | string | null;
}): TrainingEye | null => {
  const normalize = (v: unknown): TrainingEye | null => {
    if (v === 'left' || v === 'right' || v === 'both') return v;
    return null;
  };
  return normalize(params.trainingEye) ?? normalize(params.configEye);
};

/**
 * Resolve numeric vision level cho EXERCISE theo eye config.
 * - 'left'  → leftEye
 * - 'right' → rightEye
 * - 'both'  → MẮT KÉM HƠN = Math.min(leftEye, rightEye), loại mắt thiếu dữ liệu
 * Trả null khi không có giá trị dùng được (caller tự áp fallback).
 *
 * Áp dụng cho far/near/contrast. Với cả 3 loại, level càng cao = thị lực càng tốt,
 * nên "mắt kém hơn" = level nhỏ hơn = Math.min. KHÔNG dùng cho exam/stereopsis.
 */
export const resolveExerciseVisionLevel = (
  result:
    | { leftEye?: number | string | null; rightEye?: number | string | null }
    | undefined
    | null,
  eye: 'left' | 'right' | 'both' | string | undefined | null
): number | null => {
  if (!result) return null;

  const toLevel = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const left = toLevel(result.leftEye);
  const right = toLevel(result.rightEye);

  if (eye === 'left') return left;
  if (eye === 'right') return right;
  if (eye === 'both') {
    const candidates = [left, right].filter((x): x is number => x !== null);
    return candidates.length ? Math.min(...candidates) : null;
  }
  return null; // eye undefined/unknown → null (caller áp fallback)
};

/**
 * Resolve contrast exam value → level index (1–16).
 * Accepts level index (2) or clinical log score ("0.15", 0.15) from examResults.
 */
export function resolveContrastExamLevel(
  result:
    | { leftEye?: number | string | null; rightEye?: number | string | null }
    | undefined
    | null,
  eye: 'left' | 'right' | 'both' | string | undefined | null
): number | null {
  if (!result) return null;

  const toLevel = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;

    const maxLevel = contrastVisionLevels.length;

    if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= maxLevel) {
      return value;
    }

    const str = String(value).trim();
    const asInt = parseInt(str, 10);
    if (str === String(asInt) && asInt >= 1 && asInt <= maxLevel) {
      return asInt;
    }

    const byScore = contrastVisionLevels.find((l) => l.score === str);
    if (byScore) return byScore.level;

    const asFloat = parseFloat(str);
    if (Number.isFinite(asFloat)) {
      const byFloat = contrastVisionLevels.find(
        (l) => Math.abs(parseFloat(l.score) - asFloat) < 0.0001
      );
      if (byFloat) return byFloat.level;
    }

    return null;
  };

  const left = toLevel(result.leftEye);
  const right = toLevel(result.rightEye);

  if (eye === 'left') return left;
  if (eye === 'right') return right;
  if (eye === 'both') {
    const candidates = [left, right].filter((x): x is number => x !== null);
    return candidates.length ? Math.min(...candidates) : null;
  }
  return null;
};

export interface ExercisePatientVision {
  farVisionLevel: number | null;
  nearVisionLevel: number | null;
  contrastLevel: number | null;
}

type EyeResult = {
  leftEye?: number | string | null;
  rightEye?: number | string | null;
  bothEye?: number | string | null;
};

export type ExerciseExamResults =
  | {
      far?: { currentResult?: EyeResult };
      near?: { currentResult?: EyeResult };
      contrast?: { currentResult?: EyeResult };
      stereopsis?: { currentResult?: EyeResult };
    }
  | null
  | undefined;

export type ExerciseAssignmentVisionParams = {
  levelOverride?: boolean | null;
  visionLevel?: number | null;
  visionType?: string | null;
  /** Effective or config eye (legacy). Prefer trainingEye + configEye. */
  eye?: string | null;
  /** Per-patient training eye override on assignment. */
  trainingEye?: TrainingEye | string | null;
  /** Template eye from exercise config. */
  configEye?: TrainingEye | string | null;
  examResults?: ExerciseExamResults;
};

const effectiveTrainingEye = (params: ExerciseAssignmentVisionParams): TrainingEye | null =>
  resolveAssignmentTrainingEye({
    trainingEye: params.trainingEye,
    configEye: params.configEye ?? params.eye,
  });

const parsePositiveVisionLevel = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Resolve độ khó thị lực cho một bài tập cụ thể.
 * Trả về null khi không có override bác sĩ và không có kết quả khám phù hợp.
 */
export const resolveExerciseAssignmentVisionLevel = (
  params: ExerciseAssignmentVisionParams
): number | null => {
  const { levelOverride, visionLevel, visionType, examResults } = params;
  const eye = effectiveTrainingEye(params);
  const vt = visionType || 'far';

  if (levelOverride) {
    const overrideLevel = parsePositiveVisionLevel(visionLevel);
    if (overrideLevel !== null) {
      return overrideLevel;
    }
  }

  if (vt === 'stereopsis') {
    return parsePositiveVisionLevel(examResults?.stereopsis?.currentResult?.bothEye);
  }

  const currentResult = examResults?.[vt as 'far' | 'near' | 'contrast']?.currentResult;
  if (vt === 'contrast') {
    return resolveContrastExamLevel(currentResult, eye);
  }
  return resolveExerciseVisionLevel(currentResult, eye);
};

/**
 * Tính vision level (far/near/contrast) cho 1 lượt tập, dùng cho cả màn preview
 * (ExerciseSetup) và game runtime (PortalExercise) để hai nơi luôn khớp nhau.
 *
 * - Nếu bác sĩ bật override (levelOverride + visionLevel) → dùng visionLevel cho
 *   đúng loại thị lực đang tập. Với contrast, override chỉ áp dụng mức tương phản;
 *   cỡ chữ vẫn lấy từ kết quả khám xa/gần. `eye` bị bỏ qua khi override far/near.
 * - Ngược lại → lấy từ exam của bệnh nhân theo eye (xem resolveExerciseVisionLevel:
 *   'both' = mắt kém hơn). Thiếu dữ liệu → null (caller phải chặn vào bài tập).
 */
export const computeExercisePatientVision = (
  params: ExerciseAssignmentVisionParams
): ExercisePatientVision => {
  const { levelOverride, visionLevel, visionType, examResults } = params;
  const eye = effectiveTrainingEye(params);

  if (levelOverride) {
    const overrideLevel = parsePositiveVisionLevel(visionLevel);
    if (overrideLevel !== null) {
      // Contrast override sets sensitivity only — letter size still comes from far/near exam.
      if (visionType === 'contrast') {
        return {
          farVisionLevel: resolveExerciseVisionLevel(examResults?.far?.currentResult, eye),
          nearVisionLevel: resolveExerciseVisionLevel(examResults?.near?.currentResult, eye),
          contrastLevel: overrideLevel,
        };
      }
      return {
        farVisionLevel: visionType === 'far' ? overrideLevel : null,
        nearVisionLevel: visionType === 'near' ? overrideLevel : null,
        contrastLevel: null,
      };
    }
  }

  return {
    farVisionLevel: resolveExerciseVisionLevel(examResults?.far?.currentResult, eye),
    nearVisionLevel: resolveExerciseVisionLevel(examResults?.near?.currentResult, eye),
    contrastLevel: resolveContrastExamLevel(examResults?.contrast?.currentResult, eye),
  };
};

// ==================== DPI & SCREEN CALCULATION UTILITIES ====================

/**
 * Interface for screen information
 */
export interface ScreenInfo {
  screenWidth: number;
  screenHeight: number;
  diagonalInch: number;
}

/**
 * Calculate accurate PPI (Pixels Per Inch) from screen information
 * @param screenInfo - Screen configuration from user input
 * @returns PPI value
 */
export const calculatePPI = (screenInfo: ScreenInfo): number => {
  if (!screenInfo || screenInfo.diagonalInch <= 0) {
    throw new Error('Invalid screen information for PPI calculation');
  }

  return (
    Math.sqrt(screenInfo.screenWidth ** 2 + screenInfo.screenHeight ** 2) / screenInfo.diagonalInch
  );
};

/** Resolve DPR for layout-pixel conversion (1 on standard displays, 2+ on HiDPI). */
export function resolveDevicePixelRatio(devicePixelRatio?: number): number {
  if (
    devicePixelRatio != null &&
    Number.isFinite(devicePixelRatio) &&
    devicePixelRatio > 0
  ) {
    return devicePixelRatio;
  }
  if (
    typeof window !== 'undefined' &&
    Number.isFinite(window.devicePixelRatio) &&
    window.devicePixelRatio > 0
  ) {
    return window.devicePixelRatio;
  }
  return 1;
}

/**
 * PPI-based device pixel count — unit tests and internal math only.
 * Do not use for CSS font-size or canvas layout coordinates.
 */
export const mmToPixels = (sizeMm: number, screenInfo: ScreenInfo): number => {
  if (sizeMm <= 0) {
    throw new Error('Size in mm must be greater than 0');
  }

  const ppi = calculatePPI(screenInfo);
  return sizeMm * (ppi / 25.4);
};

/**
 * Clinical target height (mm) → browser layout pixels (CSS / canvas 1:1).
 * Single display conversion for exam optotypes, VT canvas, and exercise previews.
 *
 * If the user has performed a screen calibration the calibrated PPI is used
 * instead of the formula-derived PPI so that the physical size is accurate.
 *
 * @locked Core physical sizing entry point — do not alter PPI resolution or mm→px math here.
 */
export function clinicalMmToLayoutPx(
  sizeMm: number,
  screenInfo: ScreenInfo,
  devicePixelRatio?: number
): number {
  // Lazily import calibration at runtime to avoid circular deps and SSR issues.
  let ppi: number;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { loadCalibration } = require('src/services/screenCalibration.service') as {
      loadCalibration: () => { ppi: number } | null;
    };
    const cal = loadCalibration();
    ppi = cal ? cal.ppi : calculatePPI(screenInfo);
  } catch {
    ppi = calculatePPI(screenInfo);
  }
  const layoutPx = sizeMm * (ppi / 25.4);
  return layoutPx / resolveDevicePixelRatio(devicePixelRatio);
}

/** @deprecated Use clinicalMmToLayoutPx */
export const mmToCssPixels = clinicalMmToLayoutPx;

/**
 * Calculate exact Snellen optotype height in millimeters.
 *
 * Standard basis:
 * - A full Snellen optotype subtends 5 arc minutes.
 * - 20/20 is the reference visual acuity.
 *
 * Formula:
 * 1) MAR = denominator / 20 (in arc minutes)
 * 2) optotypeAngle = 5 * MAR (in arc minutes)
 * 3) physicalHeight = 2 * distance * tan(optotypeAngle / 2)
 */
export const calculateSnellenOptotypeHeightMm = (denominator: number, distance: number): number => {
  if (denominator <= 0 || distance <= 0) {
    throw new Error('denominator and distance must be greater than 0');
  }

  const marArcMinutes = denominator / SNELLEN_REFERENCE_DENOMINATOR;
  const optotypeArcMinutes = SNELLEN_OPTOTYPE_ARC_MINUTES * marArcMinutes;
  const optotypeRadians = (optotypeArcMinutes / 60) * (Math.PI / 180);

  // Distance is in meters -> convert to mm.
  return 2 * distance * 1000 * Math.tan(optotypeRadians / 2);
};

interface CssFontSizeOptions {
  devicePixelRatio?: number;
  capHeightRatio?: number;
}

/**
 * Convert target physical glyph height (mm) to CSS font-size (px), with cap-height compensation.
 */
export const calculateCssFontSizeForTargetHeightMm = (
  targetHeightMm: number,
  screenInfo: ScreenInfo,
  options: CssFontSizeOptions = {}
): number => {
  if (targetHeightMm <= 0) {
    throw new Error('targetHeightMm must be greater than 0');
  }

  const capHeightRatio = options.capHeightRatio ?? 1;
  if (capHeightRatio <= 0 || capHeightRatio > 1) {
    throw new Error('capHeightRatio must be in (0, 1]');
  }

  const glyphHeightCssPx = clinicalMmToLayoutPx(
    targetHeightMm,
    screenInfo,
    options.devicePixelRatio
  );
  return glyphHeightCssPx / capHeightRatio;
};

/**
 * Derive 2048 transform scale from calibrated CSS font-size.
 */
export const calc2048Scale = (
  fontSize?: number,
  baseFontSize: number = BASE_2048_FONT_PX,
  fallbackScaleFactor: number = 1
): number => {
  if (Number.isFinite(fontSize) && (fontSize as number) > 0 && baseFontSize > 0) {
    return (fontSize as number) / baseFontSize;
  }

  return fallbackScaleFactor;
};

/**
 * Resolve effective 2048 board scale from visual settings.
 * Uses calibrated fontSize when available, otherwise falls back to scaleFactor.
 */
export const get2048EffectiveScale = (
  visualSettings?: Pick<VisualSettings, 'fontSize' | 'scaleFactor'>
): number => {
  const fallbackScale = visualSettings?.scaleFactor ?? 1;
  return calc2048Scale(visualSettings?.fontSize, BASE_2048_FONT_PX, fallbackScale);
};

/**
 * Convert pixels to millimeters using accurate PPI
 * @param sizePixels - Size in pixels
 * @param screenInfo - Screen configuration
 * @returns Size in millimeters
 */
export const pixelsToMm = (sizePixels: number, screenInfo: ScreenInfo): number => {
  if (sizePixels <= 0) {
    throw new Error('Size in pixels must be greater than 0');
  }

  const ppi = calculatePPI(screenInfo);
  return sizePixels * (25.4 / ppi);
};

/**
 * Validate vision level format
 * @param visionLevel - Vision level string
 * @returns True if valid
 */
export const isValidVisionLevel = (visionLevel: string): boolean => {
  const regex = /^\d+\/\d+$/;
  return regex.test(visionLevel);
};

/**
 * Get default vision levels for different exercise types
 * Maps from constant arrays to ensure consistency
 */
export const getDefaultVisionLevels = () => ({
  far: farVisionLevels.map((level) => level.score), // 20 levels: 20/400 to 20/5
  near: nearVisionLevels.map((level) => level.score), // 8 levels: N3 to N64
  contrast: ['100%', '70%', '50%', '35%', '25%', '18%', '13%', '9%', '6%', '4%'], // 10 levels
});

// ==================== VISION SCALING FUNCTIONS ====================

/**
 * Get vision level based on exercise type and patient data
 * @param config - Vision scaling configuration
 * @returns Vision level string
 */
export const getVisionLevelForExercise = (config: VisionScalingConfig): string => {
  const { visionType, visionLevel, levelOverride, patientVision } = config;

  // If admin override is enabled, use override vision level
  if (levelOverride && visionLevel) {
    return visionLevel;
  }

  // Get vision level from patient based on vision type
  switch (visionType) {
    case 'far':
      return patientVision.farVisionLevel?.toString() || '20/20';
    case 'near':
      return patientVision.nearVisionLevel?.toString() || 'N3';
    case 'contrast':
      return patientVision.contrastLevel?.toString() || '100%';
    default:
      return '20/20';
  }
};

/**
 * Get distance for exercise
 * @param config - Vision scaling configuration
 * @returns Distance in meters
 */
export const getDistanceForExercise = (config: VisionScalingConfig): number => {
  const { visionType, patientVision } = config;

  // Use patient input distance or default based on exercise type
  if (patientVision.distance) {
    return patientVision.distance;
  }

  // Default distances based on vision type
  switch (visionType) {
    case 'far':
      return 6.0; // 6 meters for far vision
    case 'near':
      return 0.4; // 40cm for near vision
    case 'contrast':
      return 6.0; // 6 meters for contrast vision
    default:
      return 6.0;
  }
};

/**
 * Get responsive scale factor based on screen size
 * @param baseScaleFactor - Base scale factor from vision calculation
 * @param screenWidth - Screen width in pixels
 * @returns Responsive scale factor
 */
export const getResponsiveScaleFactor = (baseScaleFactor: number, screenWidth: number): number => {
  // Adjust scale factor based on screen size
  if (screenWidth < 768) {
    // Mobile: reduce scale factor
    return baseScaleFactor * 0.8;
  } else if (screenWidth < 1024) {
    // Tablet: slightly reduce scale factor
    return baseScaleFactor * 0.9;
  } else {
    // Desktop: use full scale factor
    return baseScaleFactor;
  }
};

/**
 * Apply vision scaling to game
 * @param config - Vision scaling configuration
 * @param gameContainer - Game container element (optional)
 * @returns Scale factor applied
 */
export const applyVisionScalingToGame = (
  config: VisionScalingConfig,
  gameContainer?: HTMLElement
): number => {
  try {
    // Get vision level for exercise
    const visionLevel = getVisionLevelForExercise(config);

    // Validate vision level format
    if (!isValidVisionLevel(visionLevel)) {
      return 1.0;
    }

    // Calculate scale factor using the canonical game scale function
    const numLevel = parseInt(String(visionLevel), 10) || 1;
    const vt =
      config.visionType === 'far' ||
      config.visionType === 'near' ||
      config.visionType === 'contrast'
        ? config.visionType
        : 'far';
    const baseScaleFactor = calculateGameScaleFactor(vt, numLevel);

    // Get responsive scale factor
    const screenWidth = window.screen.width;
    const responsiveScaleFactor = getResponsiveScaleFactor(baseScaleFactor, screenWidth);

    // Apply scaling to game elements
    applyVisionScaling(responsiveScaleFactor, gameContainer);

    return responsiveScaleFactor;
  } catch (error) {
    console.error('Error applying vision scaling:', error);
    return 1.0;
  }
};

/**
 * Remove vision scaling from game
 * @param gameContainer - Game container element (optional)
 */
export const removeVisionScalingFromGame = (gameContainer?: HTMLElement): void => {
  try {
    removeVisionScaling(gameContainer);
  } catch (error) {
    console.error('Error removing vision scaling:', error);
  }
};

/**
 * Get vision scaling info for display
 * @param config - Vision scaling configuration
 * @returns Vision scaling information
 */
export const getVisionScalingInfo = (config: VisionScalingConfig) => {
  const visionLevel = getVisionLevelForExercise(config);
  const distance = getDistanceForExercise(config);

  return {
    visionLevel,
    distance,
    visionType: config.visionType,
    isOverride: config.levelOverride && !!config.visionLevel,
  };
};

/**
 * Initialize vision scaling for game
 * @param visionType - Type of vision exercise
 * @param patientVision - Patient vision data
 * @param adminConfig - Admin configuration (optional)
 * @param gameContainer - Game container element (optional)
 * @returns Scale factor and info
 */
export const initializeVisionScaling = (
  visionType: VisionType,
  patientVision: PatientVisionData,
  adminConfig?: {
    visionLevel?: string;
    levelOverride?: boolean;
  },
  gameContainer?: HTMLElement
) => {
  const config: VisionScalingConfig = {
    visionType,
    visionLevel: adminConfig?.visionLevel,
    levelOverride: adminConfig?.levelOverride,
    patientVision,
  };

  const scaleFactor = applyVisionScalingToGame(config, gameContainer);
  const scalingInfo = getVisionScalingInfo(config);

  return {
    scaleFactor,
    scalingInfo,
    config,
  };
};

// ==================== GAME SCALING FUNCTIONS ====================

// Game Element Sizes Interface
export interface GameElementSizes {
  fontSize: number;
  tileSize: number;
  spacing: number;
  boardSize: number;
  borderRadius: number;
  padding: number;
}

// Default Game Element Sizes
export const DEFAULT_GAME_SIZES: GameElementSizes = {
  fontSize: 16,
  tileSize: 64,
  spacing: 8,
  boardSize: 280,
  borderRadius: 4,
  padding: 16,
};

/**
 * Calculate scaled game element sizes
 * @param scaleFactor - Scale factor from vision calculation
 * @param baseSizes - Base game element sizes
 * @returns Scaled game element sizes
 */
export const calculateScaledSizes = (
  scaleFactor: number,
  baseSizes: GameElementSizes = DEFAULT_GAME_SIZES
): GameElementSizes => {
  // Clamp scale factor between 0.1 and 5.0
  const clampedScaleFactor = Math.max(0.1, Math.min(5.0, scaleFactor));

  return {
    fontSize: Math.round(baseSizes.fontSize * clampedScaleFactor),
    tileSize: Math.round(baseSizes.tileSize * clampedScaleFactor),
    spacing: Math.round(baseSizes.spacing * clampedScaleFactor),
    boardSize: Math.round(baseSizes.boardSize * clampedScaleFactor),
    borderRadius: Math.round(baseSizes.borderRadius * clampedScaleFactor),
    padding: Math.round(baseSizes.padding * clampedScaleFactor),
  };
};

/**
 * Apply scaling to game CSS styles
 * @param scaleFactor - Scale factor
 * @param baseSizes - Base game element sizes
 * @returns CSS styles object
 */
export const getScaledGameStyles = (
  scaleFactor: number,
  baseSizes: GameElementSizes = DEFAULT_GAME_SIZES
): Record<string, any> => {
  const scaledSizes = calculateScaledSizes(scaleFactor, baseSizes);

  return {
    // Game board styles
    '.game-container': {
      width: `${scaledSizes.boardSize}px`,
      height: `${scaledSizes.boardSize}px`,
      padding: `${scaledSizes.padding}px`,
      borderRadius: `${scaledSizes.borderRadius}px`,
    },

    // Tile styles
    '.tile': {
      width: `${scaledSizes.tileSize}px`,
      height: `${scaledSizes.tileSize}px`,
      fontSize: `${scaledSizes.fontSize}px`,
      borderRadius: `${scaledSizes.borderRadius}px`,
      margin: `${scaledSizes.spacing}px`,
    },

    // Grid styles
    '.grid-container': {
      gap: `${scaledSizes.spacing}px`,
    },

    // Text styles
    '.tile-inner': {
      fontSize: `${scaledSizes.fontSize}px`,
    },
  };
};

/**
 * Apply vision scaling to game elements
 * @param scaleFactor - Scale factor from vision calculation
 * @param gameContainer - Game container element
 */
export const applyVisionScaling = (scaleFactor: number, gameContainer?: HTMLElement): void => {
  const scaledSizes = calculateScaledSizes(scaleFactor);

  if (gameContainer) {
    // Apply styles to specific game container
    gameContainer.style.setProperty('--game-font-size', `${scaledSizes.fontSize}px`);
    gameContainer.style.setProperty('--game-tile-size', `${scaledSizes.tileSize}px`);
    gameContainer.style.setProperty('--game-spacing', `${scaledSizes.spacing}px`);
    gameContainer.style.setProperty('--game-board-size', `${scaledSizes.boardSize}px`);
    gameContainer.style.setProperty('--game-border-radius', `${scaledSizes.borderRadius}px`);
    gameContainer.style.setProperty('--game-padding', `${scaledSizes.padding}px`);
  } else {
    // Apply styles globally
    const root = document.documentElement;
    root.style.setProperty('--game-font-size', `${scaledSizes.fontSize}px`);
    root.style.setProperty('--game-tile-size', `${scaledSizes.tileSize}px`);
    root.style.setProperty('--game-spacing', `${scaledSizes.spacing}px`);
    root.style.setProperty('--game-board-size', `${scaledSizes.boardSize}px`);
    root.style.setProperty('--game-border-radius', `${scaledSizes.borderRadius}px`);
    root.style.setProperty('--game-padding', `${scaledSizes.padding}px`);
  }
};

/**
 * Remove vision scaling
 * @param gameContainer - Game container element
 */
export const removeVisionScaling = (gameContainer?: HTMLElement): void => {
  if (gameContainer) {
    // Remove styles from specific game container
    gameContainer.style.removeProperty('--game-font-size');
    gameContainer.style.removeProperty('--game-tile-size');
    gameContainer.style.removeProperty('--game-spacing');
    gameContainer.style.removeProperty('--game-board-size');
    gameContainer.style.removeProperty('--game-border-radius');
    gameContainer.style.removeProperty('--game-padding');
  } else {
    // Remove styles globally
    const root = document.documentElement;
    root.style.removeProperty('--game-font-size');
    root.style.removeProperty('--game-tile-size');
    root.style.removeProperty('--game-spacing');
    root.style.removeProperty('--game-board-size');
    root.style.removeProperty('--game-border-radius');
    root.style.removeProperty('--game-padding');
  }
};

// ==================== DISPLAY UTILITIES ====================

/**
 * Calculate optimal character count for display based on screen width and font size
 * @param fontSizePx - Font size in pixels
 * @param screenWidth - Available screen width in pixels
 * @param charType - Character type (E, C, A, N, S)
 * @returns Optimal character count (min: 1, max: 5)
 */
export const calculateOptimalCharCount = (
  fontSizePx: number,
  screenWidth: number,
  charType: string
): number => {
  if (
    !Number.isFinite(fontSizePx) ||
    fontSizePx <= 0 ||
    !Number.isFinite(screenWidth) ||
    screenWidth <= 0
  ) {
    return 1;
  }

  return findMaxFittingCharCount(fontSizePx, screenWidth, charType, 5);
};

const findMaxFittingCharCount = (
  fontSizePx: number,
  screenWidth: number,
  charType: string,
  maxChars: number
): number => {
  for (let charCount = maxChars; charCount >= 1; charCount -= 1) {
    if (calculateTotalWidth(fontSizePx, charCount, charType) <= screenWidth) {
      return charCount;
    }
  }

  return 1;
};

/**
 * Calculate max characters per batch using the same width model as calculateOptimalCharCount.
 * This prevents mismatches between capacity estimation and actual rendered layout.
 */
export const calculateMaxCharsPerBatch = (
  fontSizePx: number,
  screenWidth: number,
  charType: string,
  totalChars: number
): number => {
  if (
    !Number.isFinite(fontSizePx) ||
    fontSizePx <= 0 ||
    !Number.isFinite(screenWidth) ||
    screenWidth <= 0 ||
    !Number.isFinite(totalChars) ||
    totalChars <= 0
  ) {
    return 1;
  }

  const cappedTotal = Math.max(1, Math.floor(totalChars));

  return findMaxFittingCharCount(fontSizePx, screenWidth, charType, cappedTotal);
};

/**
 * Get screen information for responsive calculations
 * @returns Screen width, height, and DPI information
 */
export const getScreenInfo = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpi: window.devicePixelRatio,
    availableWidth: window.innerWidth - 40, // Trừ padding
  };
};

/**
 * Calculate character spacing based on font size and character count
 * @param fontSizePx - Font size in pixels
 * @param charCount - Number of characters to display
 * @returns Spacing between characters in pixels
 */
export const getCharSpacing = (fontSizePx: number, charCount: number): number => {
  if (charCount === 1) return 0;
  // ISO 8596 / ETDRS / Bailey-Lovie standard:
  // The gap between optotypes must equal 1× the letter height (= 1× fontSizePx for square Sloan letters).
  // Reference: Bailey IL & Lovie JE (1976), ETDRS protocol, ISO 8596.
  return fontSizePx;
};

/**
 * Calculate total width needed for displaying characters.
 * @param fontSizePx - Font size in pixels
 * @param charCount - Number of characters to display
 * @param _charType - Reserved for future per-glyph width variants; currently unused
 * @returns Total width needed in pixels
 */
export const calculateTotalWidth = (
  fontSizePx: number,
  charCount: number,
  _charType: string
): number => {
  // Each ExamChar renders a box that is fontSizePx wide (not the glyph estimate).
  // Using the actual box width prevents calculateOptimalCharCount from underestimating
  // total layout width and causing edge characters to overflow the viewport.
  const spacing = getCharSpacing(fontSizePx, charCount);

  return fontSizePx * charCount + spacing * (charCount - 1);
};

/** Số ký tự chuẩn mỗi hàng thị lực (ISO/ETDRS). */
export const EXAM_ROW_CHAR_COUNT = 5;

export interface ExamDisplayStrategy {
  totalChars: number;
  maxCharsPerBatch: number;
  batches: number[];
  numberOfBatches: number;
}

/**
 * Compute how many optotypes fit per exam row/batch from viewport geometry.
 * Always targets EXAM_ROW_CHAR_COUNT (5) total; splits into batches only when
 * the current font size cannot fit all 5 side-by-side at once.
 */
export const buildExamDisplayStrategy = (params: {
  fontSizeMm: number;
  screenInfo: ScreenInfo;
  charType: string;
  viewportWidthPx: number;
  horizontalPaddingPx?: number;
  totalChars?: number;
}): ExamDisplayStrategy => {
  const {
    fontSizeMm,
    screenInfo,
    charType,
    viewportWidthPx,
    horizontalPaddingPx = EXAM_HORIZONTAL_PADDING_PX,
    totalChars = EXAM_ROW_CHAR_COUNT,
  } = params;

  const fallback: ExamDisplayStrategy = {
    totalChars,
    maxCharsPerBatch: totalChars,
    batches: [totalChars],
    numberOfBatches: 1,
  };

  if (!Number.isFinite(fontSizeMm) || fontSizeMm <= 0) {
    return fallback;
  }

  let fontSizePx: number;
  try {
    fontSizePx = clinicalMmToLayoutPx(fontSizeMm, screenInfo);
  } catch {
    return fallback;
  }

  if (!Number.isFinite(fontSizePx) || fontSizePx <= 0) {
    return fallback;
  }

  const availableScreenWidth = Math.max(0, viewportWidthPx - horizontalPaddingPx * 2);
  const maxCharsPerBatch = Math.max(
    1,
    calculateMaxCharsPerBatch(fontSizePx, availableScreenWidth, charType, totalChars)
  );

  const batches: number[] = [];
  let remainingChars = totalChars;
  while (remainingChars > 0) {
    const charsInThisBatch = Math.min(maxCharsPerBatch, remainingChars);
    batches.push(charsInThisBatch);
    remainingChars -= charsInThisBatch;
  }

  return {
    totalChars,
    maxCharsPerBatch,
    batches,
    numberOfBatches: batches.length,
  };
};

/**
 * Padding ngang mỗi bên vùng hiển thị ký tự trong bài test.
 * Phải khớp EXAM_CHAR_PADDING_PX trong exam-state.ts.
 */
export const EXAM_HORIZONTAL_PADDING_PX = 100;

/**
 * Hệ số chiều rộng hàng = calculateTotalWidth / fontSizePx.
 * Với spacing ISO (1× chiều cao chữ): 2N − 1.
 */
export const getExamRowWidthFactor = (charCount: number): number => {
  if (charCount <= 0) return 0;
  return 2 * charCount - 1;
};

/**
 * Ước lượng số ký tự hiển thị được trên một hàng, dùng cùng mô hình layout
 * với exam-state.getDisplayStrategy và TestStep/ExamChar.
 */
export const countExamCharsFitOnRow = (
  charHeightMm: number,
  screenInfo: ScreenInfo,
  options?: {
    charType?: string;
    charCount?: number;
    devicePixelRatio?: number;
    horizontalPaddingPx?: number;
  }
): number => {
  const {
    charType = 'A',
    charCount = EXAM_ROW_CHAR_COUNT,
    devicePixelRatio =
      typeof window !== 'undefined' && window.devicePixelRatio > 0
        ? window.devicePixelRatio
        : 1,
    horizontalPaddingPx = EXAM_HORIZONTAL_PADDING_PX,
  } = options ?? {};

  if (!Number.isFinite(charHeightMm) || charHeightMm <= 0) return 0;

  let fontSizePx: number;
  try {
    fontSizePx = clinicalMmToLayoutPx(charHeightMm, screenInfo, devicePixelRatio);
  } catch {
    return 0;
  }

  if (!Number.isFinite(fontSizePx) || fontSizePx <= 0) return 0;

  // Fullscreen exam: viewport CSS width ≈ physical width / DPR.
  const cssViewportWidth = screenInfo.screenWidth / devicePixelRatio;
  const availableWidth = Math.max(0, cssViewportWidth - horizontalPaddingPx * 2);

  return calculateMaxCharsPerBatch(fontSizePx, availableWidth, charType, charCount);
};

/**
 * Tìm kích thước chéo tối thiểu (inch) để hiển thị đủ charCount ký tự trên một hàng.
 * Dùng cùng công thức bố cục thực tế (ExamChar box + spacing ISO), không dùng hệ số Snellen 5.8.
 */
export const calculateMinDiagonalInchForExamRow = (
  charHeightMm: number,
  options?: {
    screenWidth?: number;
    screenHeight?: number;
    charType?: string;
    charCount?: number;
    devicePixelRatio?: number;
    horizontalPaddingPx?: number;
  }
): number => {
  const {
    screenWidth = 1920,
    screenHeight = 1080,
    charType = 'A',
    charCount = EXAM_ROW_CHAR_COUNT,
    devicePixelRatio = 1,
    horizontalPaddingPx = EXAM_HORIZONTAL_PADDING_PX,
  } = options ?? {};

  if (!Number.isFinite(charHeightMm) || charHeightMm <= 0) return 0;

  for (let diagonalInch = 7; diagonalInch <= 48; diagonalInch += 0.1) {
    const screenInfo: ScreenInfo = { screenWidth, screenHeight, diagonalInch };
    const fits = countExamCharsFitOnRow(charHeightMm, screenInfo, {
      charType,
      charCount,
      devicePixelRatio,
      horizontalPaddingPx,
    });
    if (fits >= charCount) {
      return Math.round(diagonalInch * 10) / 10;
    }
  }

  return 48;
};

// ==================== EXAM UTILITIES ====================

/**
 * Generate random text for exam testing
 * @param charCount - Number of characters to generate
 * @param char - Character type (E, C, A, N, S)
 * @returns Array of test items
 */
export const generateRandomText = (
  charCount: number,
  char: 'E' | 'C' | 'A' | 'N' | 'S'
): TestItem => {
  const pool = CHAR_POOL_MAP[char] || CHAR_POOL_MAP['A'];
  const randomItems: TestItem = [];

  let lastChar: string | null = null;

  for (let i = 0; i < charCount; i++) {
    let availableChars = pool;

    if (lastChar !== null && pool.length > 1) {
      availableChars = pool.filter((c) => c !== lastChar);
    }

    const randomChar = availableChars[Math.floor(Math.random() * availableChars.length)];
    randomItems.push({
      char: char, // Store the character type for font rendering
      display: randomChar, // Store the direction code for comparison and display
    });

    lastChar = randomChar;
  }

  return randomItems;
};

/**
 * Calculate font size for far vision test
 *
 * Based on International Standard (ISO 8596):
 * - 20/20 vision = 5 arc minutes = 8.73mm at 6 meters
 *
 * Formula: fontSize = (n / 6) × 8.73mm × (distance / 6m)
 * where n = Snellen denominator × 0.3 (from farVisionLevels)
 *
 * Note: This formula is mathematically equivalent to:
 *   fontSize = 8.73 × (denominator/20) × (distance/6)
 * but uses pre-calculated 'n' values for consistency with existing data.
 *
 * @param n - Vision level multiplier from farVisionLevels (e.g., 6 for 20/20)
 * @param distance - Viewing distance in meters
 * @returns Letter height in millimeters
 */
export const calculateFarFontSize = (n: number, distance: number): number => {
  // Validation
  if (n <= 0 || distance <= 0) {
    throw new Error('n and distance must be greater than 0');
  }

  // Convert legacy n-factor back to Snellen denominator, then use exact angular formula.
  // n = denominator * 0.3  => denominator = n / 0.3
  const denominator = n / 0.3;
  return calculateSnellenOptotypeHeightMm(denominator, distance);
};

/**
 * Calculate font size for near vision test
 *
 * Near Vision N Notation Standard:
 * - N notation = actual letter height (mm) at standard reading distance (40cm)
 * - Example: N8 = 1.45mm letter height at 40cm
 * - If distance changes, scale proportionally to maintain angular size
 *
 * Formula: fontSizeMm = sizeMm * (actualDistance / standardDistance)
 *
 * @param sizeMm - Letter height in mm from nearVisionLevels[].size (e.g., 1.45 for N8)
 * @param distance - Actual viewing distance in meters
 * @returns Font size in millimeters
 *
 * @example
 * // N8 (1.45mm) at standard 40cm distance
 * calculateNearFontSize(1.45, 0.4) // Returns 1.45mm
 *
 * @example
 * // N8 (1.45mm) at 80cm (double distance)
 * calculateNearFontSize(1.45, 0.8) // Returns 2.90mm (doubles to maintain angular size)
 */
export const calculateNearFontSize = (sizeMm: number, distance: number): number => {
  // Validation
  if (sizeMm <= 0 || distance <= 0) {
    throw new Error('sizeMm và distance phải lớn hơn 0 cho near vision test');
  }

  // Standard near vision test distance per British Standards
  const STANDARD_NEAR_DISTANCE = 0.4; // 40cm = 0.4m

  // Near vision N notation is ALREADY the actual size in mm at 40cm
  // Scale proportionally if viewing distance differs from standard
  // Example: N8 = 1.45mm at 40cm
  //          At 80cm (2x distance) → 2.90mm (2x size to maintain angular size)
  return sizeMm * (distance / STANDARD_NEAR_DISTANCE);
};

/**
 * Get stereopsis image path from filename
 * @param filename - Image filename
 * @returns Image path
 */
export const getStereopsisImagePath = (filename: string) => {
  // Extract the level from the filename (e.g., "bd01s0" -> "1")
  const level = filename.substring(2, 4).replace(/^0+/, '');
  return `/stereopsis/${level}/${filename}.png`;
};

/**
 * Get correct stereopsis answer based on filename
 * @param display - Filename or display string
 * @returns Correct answer
 */
export const getCorrectStereopsisAnswer = (display: string) => {
  if (display.startsWith('fd')) return 'front';
  if (display.startsWith('bd')) return 'back';
  return 'none';
};

/**
 * Generate random stereopsis test items
 * @param level - Stereopsis level
 * @param count - Number of test items to generate
 * @returns Array of test items
 */
export const generateRandomStereopsisTest = (level: number, count: number = 2): TestItem => {
  // Lọc các hình ảnh theo cấp độ
  const levelImages = stereopsisImages.filter((item) => item.level === level);
  if (!levelImages.length) return [];

  // Trộn mảng hình ảnh
  const shuffledImages = [...levelImages].sort(() => Math.random() - 0.5);

  // Chọn số lượng hình ảnh theo yêu cầu
  return shuffledImages.slice(0, count).map((img) => ({
    char: 'I', // I cho Image
    display: img.display,
  }));
};

/** Suprathreshold baseline for contrast tests: 20/100 (n = 30). */
export const CONTRAST_BASELINE_FAR_N = 30;

/**
 * Far-vision n for contrast letter size: at least 20/100, or larger if far acuity is worse.
 * @param patientFarLevel1Based — 1-based far level (1 = 20/400 … 20 = 20/5)
 */
export const resolveContrastFontFarN = (patientFarLevel1Based?: number | null): number => {
  if (patientFarLevel1Based == null || patientFarLevel1Based < 1) {
    return CONTRAST_BASELINE_FAR_N;
  }
  const patientN = farVisionLevels[patientFarLevel1Based - 1]?.n;
  if (patientN == null) return CONTRAST_BASELINE_FAR_N;
  return Math.max(CONTRAST_BASELINE_FAR_N, patientN);
};

// ==================== CONSOLIDATED VISION CALCULATION ====================

/**
 * Input for consolidated vision calculation
 * Used by: PreviewDialog, ExerciseSetup, PortalExercise
 */
/** How fontSize is derived from clinical mm — game digits vs Snellen/canvas optotypes. */
export type VisualDisplayRenderMode = 'optotype' | 'game';

export interface VisionCalculationInput {
  visionType: 'far' | 'near' | 'contrast';
  visionLevel: number; // 1-based index
  distance: number; // in meters
  screenInfo: ScreenInfo;

  // For contrast test ONLY: patient's current far vision level for readable font size
  // This ensures contrast test has readable base font, then test contrast sensitivity
  patientFarVisionLevel?: number; // 1-based index (Level 1-20)

  /**
   * 'game' (default): Clear Sans cap-height compensation for 2048 tiles.
   * 'optotype': letter height in layout px for exam / VT canvas (no cap compensation).
   */
  renderMode?: VisualDisplayRenderMode;
}

/**
 * Output from consolidated vision calculation
 */
export interface VisionCalculationOutput {
  /** Layout px for rendering — optotype height or game font-size depending on renderMode. */
  fontSize: number;
  /** Snellen / canvas letter height in layout px (always optotype, no cap compensation). */
  letterHeightPx: number;
  scaleFactor: number; // scale multiplier for transform
  contrast: number; // percentage (0-100) - EXACT value from contrastVisionLevels
  fontSizeMm: number; // in mm (for debugging)
  calculatedPPI: number; // calculated PPI (for debugging)
}

/**
 * Calculate game-appropriate scale factor from vision level.
 *
 * Clinical font-size formulas (ISO 8596) produce optotype sizes for eye charts,
 * which are millimetre-precise but result in tiny pixel differences at short
 * distances (e.g. 0.5 m).  Applying those directly as a CSS ``transform: scale()``
 * on a 2048 game makes the tiles almost the same size regardless of vision level.
 *
 * This function maps the vision-level ratio to a perceptually useful scale range
 * using a power curve (exponent 0.4) and clamps between 0.6x and 3.0x.
 *
 * Examples (far vision):
 *   Level 1  (20/400) → scale ≈ 3.0  (3× bigger — very poor vision)
 *   Level 5  (20/160) → scale ≈ 2.3
 *   Level 10 (20/50)  → scale ≈ 1.4
 *   Level 14 (20/20)  → scale = 1.0  (normal vision – no change)
 *   Level 20 (20/5)   → scale ≈ 0.6  (excellent vision – smaller)
 */
export function calculateGameScaleFactor(
  visionType: 'far' | 'near' | 'contrast',
  visionLevel: number
): number {
  // Hybrid mapping: preserve monotonic clinical direction while widening perceptual separation
  // for low-vision levels in interactive games.
  const FAR_EXPONENT = 0.5;
  const FAR_MIN_SCALE = 0.55;
  const FAR_MAX_SCALE = 4.0;

  const NEAR_EXPONENT = 0.5;
  const NEAR_MIN_SCALE = 0.65;
  const NEAR_MAX_SCALE = 2.5;

  if (visionType === 'far') {
    const level = farVisionLevels[visionLevel - 1];
    if (!level) return 1;
    // Ratio relative to normal vision (Level 14, n = 6)
    const ratio = level.n / 6;
    return Math.min(FAR_MAX_SCALE, Math.max(FAR_MIN_SCALE, Math.pow(ratio, FAR_EXPONENT)));
  }

  if (visionType === 'near') {
    const level = nearVisionLevels[visionLevel - 1];
    if (!level) return 1;
    // Ratio relative to N8 (level 6, size = 1.45 mm)
    const ratio = level.size / 1.45;
    return Math.min(NEAR_MAX_SCALE, Math.max(NEAR_MIN_SCALE, Math.pow(ratio, NEAR_EXPONENT)));
  }

  // Contrast: scaling stays at 1.0; only opacity/contrast changes
  return 1.0;
}

/**
 * SINGLE SOURCE OF TRUTH for vision-based font size calculations
 *
 * Consolidates duplicate logic from:
 * - PreviewDialog.tsx (lines 135-189)
 * - ExerciseSetup.tsx (lines 85-113)
 * - PortalExercise.tsx (lines 306-356)
 */
export function calculateVisualSettings(input: VisionCalculationInput): VisionCalculationOutput {
  const {
    visionType,
    visionLevel,
    distance,
    screenInfo,
    patientFarVisionLevel,
    renderMode = 'game',
  } = input;

  // Calculate PPI (Pixels Per Inch) - extracted from all 3 components
  const calculatedPPI =
    Math.sqrt(screenInfo.screenWidth ** 2 + screenInfo.screenHeight ** 2) / screenInfo.diagonalInch;

  const devicePixelRatio = resolveDevicePixelRatio();

  let fontSizeMm = 16; // Default fallback
  let contrast = 100; // Default fallback (100%)

  // Vision-specific calculations - uses tested production formula
  if (visionType === 'far') {
    const farLevel = farVisionLevels[visionLevel - 1];
    if (farLevel) {
      fontSizeMm = calculateFarFontSize(farLevel.n, distance);
    }
    contrast = 100;
  } else if (visionType === 'near') {
    const nearLevel = nearVisionLevels[visionLevel - 1];
    if (nearLevel) {
      fontSizeMm = calculateNearFontSize(nearLevel.size, distance);
    }
    contrast = 100;
  } else if (visionType === 'contrast') {
    // Contrast: readable size = max(20/100, patient's far acuity for that eye)
    fontSizeMm = calculateFarFontSize(resolveContrastFontFarN(patientFarVisionLevel), distance);

    // Get contrast percentage from contrastVisionLevels using visionLevel
    const contrastLevel = contrastVisionLevels[visionLevel - 1];
    if (contrastLevel) {
      contrast = contrastLevel.contrastPercent; // Already in percentage
    }
  }

  const letterHeightPx = Math.max(
    8,
    Math.round(clinicalMmToLayoutPx(fontSizeMm, screenInfo, devicePixelRatio))
  );

  const fontSizePixels =
    renderMode === 'optotype'
      ? letterHeightPx
      : Math.max(
          8,
          Math.round(
            calculateCssFontSizeForTargetHeightMm(fontSizeMm, screenInfo, {
              devicePixelRatio,
              capHeightRatio: CLEAR_SANS_DIGIT_CAP_HEIGHT_RATIO,
            })
          )
        );

  // Game scale factor based on vision level (not clinical px size)
  const scaleFactor = calculateGameScaleFactor(visionType, visionLevel);

  return {
    fontSize: fontSizePixels,
    letterHeightPx,
    scaleFactor,
    contrast, // Already in percentage (0-100), NOT 0-1
    fontSizeMm,
    calculatedPPI,
  };
}
