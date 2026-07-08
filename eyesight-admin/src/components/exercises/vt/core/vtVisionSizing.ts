/**
 * VT Quest — vision-based stimulus sizing + screen requirement checks.
 * Uses the same calculateVisualSettings as ExerciseSetup / Game2048.
 *
 * @locked VT sizing must keep using calculateVisualSettings / clinicalMmToLayoutPx.
 * See .cursor/rules/screen-calibration-locked.mdc
 */

import {
  calculatePPI,
  calculateVisualSettings,
  computeExercisePatientVision,
  resolveAssignmentTrainingEye,
  resolveExerciseVisionLevel,
  resolveDevicePixelRatio,
  type ExerciseExamResults,
  type ScreenInfo,
  type TrainingEye,
} from 'src/utils/visionUtils';
import { contrastVisionLevels } from 'src/utils/constant';
import { computePixelsPerDeg } from '../stimuli/gaborRenderer';
import { fitStimulusToViewport } from './stimulusLayout';
import { computeVernierStimulusMetrics } from './vernierLayout';
import {
  STEREOPSIS_DIGIT_CANVAS,
  STEREOPSIS_ROW_PANEL,
  STEREOPSIS_SHAPE_CANVAS,
} from '../stimuli/stereopsisRenderer';
import type { VtSettings, VtWorld } from 'src/types/core/vtQuest';
import { DEFAULT_VT_SETTINGS } from 'src/types/core/vtQuest';
import type { ColorScheme } from 'src/types/core/visual-settings';
import { isAnaglyphExerciseColorScheme } from './vtStimulusColors';

/** One physically larger Snellen step (level index decreases, letters grow). */
export function oneLevelLargerFar(level1Based: number): number {
  return Math.max(1, level1Based - 1);
}

/** One physically larger near-vision step. */
export function oneLevelLargerNear(level1Based: number): number {
  return Math.max(1, level1Based - 1);
}

function contrastPercentForLevel(level1Based: number): number {
  return contrastVisionLevels[level1Based - 1]?.contrastPercent ?? 100;
}

/** Michelson contrast (0–1) for Gabor staircase start from clinical contrast % (0–100). */
export function michelsonContrastFromPercent(contrastPercent: number): number {
  return Math.min(1, Math.max(0.02, contrastPercent / 100));
}

/** Vision inputs for VT sizing — always pass trainingEye + configEye separately. */
export type VtExerciseVisionInput = {
  levelOverride?: boolean | null;
  visionLevel?: number | null;
  visionType?: 'far' | 'near' | 'contrast' | 'stereopsis' | null;
  trainingEye?: TrainingEye | string | null;
  configEye?: TrainingEye | string | null;
  /** @deprecated Prefer trainingEye + configEye */
  eye?: TrainingEye | string | null;
  examResults?: ExerciseExamResults;
  /**
   * Pre-resolved starting vision level from `resolveExerciseStartVisionLevel`.
   * When provided, overrides the level that would normally be derived from the
   * exam result / levelOverride chain inside resolveVtExerciseVision.
   * Does NOT bypass clinicalMmToLayoutPx — the level still flows through
   * calculateVisualSettings unchanged.
   */
  startVisionLevel?: number | null;
};

function normalizeVtVisionInput(params: VtExerciseVisionInput): VtExerciseVisionInput {
  return {
    ...params,
    configEye: params.configEye ?? params.eye,
  };
}

/**
 * Display contrast % at stage start for all VT modalities (0–100):
 * - visionType far / near → 100% (sharpest).
 * - visionType contrast → assigned contrast level (levelOverride) or the latest
 *   contrast exam result for the configured training eye.
 */
export function resolveStimulusStartContrastPercent(params: VtExerciseVisionInput): number {
  if (params.visionType !== 'contrast') {
    return 100;
  }
  const resolved = resolveVtExerciseVision(params);
  if (resolved?.contrastLevel == null) {
    return 100;
  }
  return resolved.stimulusContrastPercent;
}

/**
 * Gabor staircase starting contrast (Michelson 0–1) — same policy:
 * far/near → 1.0; contrast → assigned/exam contrast level.
 */
export function resolveGaborStartContrast(params: VtExerciseVisionInput): number {
  return michelsonContrastFromPercent(resolveStimulusStartContrastPercent(params));
}

/** Wider Vernier segment gap for far / contrast (viewing distance typically ≥ 3 m). */
export function resolveVernierGapMultiplier(
  visionType?: 'far' | 'near' | 'contrast' | 'stereopsis' | null
): number {
  return visionType === 'far' || visionType === 'contrast' ? 2 : 1;
}

/** HUD + instruction + response buttons (fullscreen exercise estimate) */
export const VT_EXERCISE_CHROME_HEIGHT_PX = 220;
/** Spacing at stage start (easy) — used for screen pre-check, not worst-case 3.5 */
const CROWDING_PRECHECK_SPACING = 3.0;
const VERNIER_WORST_OFFSET_ARCSEC = 120;

const SCREEN_PRESETS: Array<{ label: string; screenInfo: ScreenInfo }> = [
  { label: '15.6" Laptop — 1920×1080', screenInfo: { diagonalInch: 15.6, screenWidth: 1920, screenHeight: 1080 } },
  { label: '14" Laptop — 1920×1080', screenInfo: { diagonalInch: 14, screenWidth: 1920, screenHeight: 1080 } },
  { label: '24" Monitor — 1920×1080', screenInfo: { diagonalInch: 24, screenWidth: 1920, screenHeight: 1080 } },
  { label: '27" Monitor — 2560×1440', screenInfo: { diagonalInch: 27, screenWidth: 2560, screenHeight: 1440 } },
];

export interface VtVisionSizing {
  letterHeightPx: number;
  pixelsPerDeg: number;
  scaleFactor: number;
  /** Display contrast % for Vernier/Crowding at stage start (100 for far/near; contrast level for contrast type). */
  stimulusContrastPercent: number;
  /** Gabor staircase starting Michelson contrast (0–1). */
  gaborStartContrast: number;
  /** Vernier top/bottom segment gap scale (far/contrast > near). */
  vernierGapMultiplier: number;
}

/** Parse viewing distance (m) from exercise config — never silently use 0.5m. */
export function parseExerciseDistanceM(distance: unknown): number | null {
  if (distance == null || distance === '') return null;
  const parsed = parseFloat(String(distance));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export interface VtScreenRequirementResult {
  fits: boolean;
  requiredWidth: number;
  requiredHeight: number;
  recommendedLabel: string;
  recommendedMinWidth: number;
  recommendedMinHeight: number;
  limitingWorld?: VtWorld;
}

export function computeVtVisionSizing(params: {
  screenInfo: ScreenInfo;
  distanceM: number;
  visionType: 'far' | 'near' | 'contrast';
  visionLevel: number;
  patientFarVisionLevel?: number;
  /** Start display contrast % (from resolveStimulusStartContrastPercent). Defaults to 100. */
  stimulusContrastPercent?: number;
  /** Exercise config vision type (for Vernier gap); defaults to sizing visionType. */
  exerciseVisionType?: 'far' | 'near' | 'contrast' | null;
  gaborStartContrast?: number;
}): VtVisionSizing {
  const visual = calculateVisualSettings({
    visionType: params.visionType,
    visionLevel: params.visionLevel,
    distance: params.distanceM,
    screenInfo: params.screenInfo,
    patientFarVisionLevel: params.patientFarVisionLevel,
    renderMode: 'optotype',
  });
  const ppi = calculatePPI(params.screenInfo);
  const devicePixelRatio = resolveDevicePixelRatio();
  const pixelsPerDeg = computePixelsPerDeg(ppi, params.distanceM) / devicePixelRatio;

  const letterHeightPx = visual.fontSize;

  return {
    letterHeightPx,
    pixelsPerDeg,
    scaleFactor: visual.scaleFactor,
    stimulusContrastPercent: params.stimulusContrastPercent ?? 100,
    gaborStartContrast:
      params.gaborStartContrast ??
      michelsonContrastFromPercent(params.stimulusContrastPercent ?? 100),
    vernierGapMultiplier: resolveVernierGapMultiplier(
      params.exerciseVisionType ?? params.visionType
    ),
  };
}

function estimateExerciseViewport(screenInfo: ScreenInfo): { width: number; height: number } {
  return {
    width: Math.max(screenInfo.screenWidth - 32, 320),
    height: Math.max(screenInfo.screenHeight - VT_EXERCISE_CHROME_HEIGHT_PX, 200),
  };
}

function worstCaseFit(
  world: VtWorld,
  sizing: VtVisionSizing,
  availableWidth: number,
  availableHeight: number,
  vtSettings: VtSettings,
  colorScheme?: ColorScheme | null
) {
  const gaborConfig = vtSettings.stimulus.gabor ?? {
    sfCpD: 3,
    orientation: 'vertical' as const,
    sigmaDeg: 0.5,
  };

  if (world === 'stereopsis') {
    const rowWidth = 5 * STEREOPSIS_ROW_PANEL + 4 * 8;
    const requiredWidth = Math.max(STEREOPSIS_DIGIT_CANVAS, rowWidth, STEREOPSIS_SHAPE_CANVAS);
    const requiredHeight = STEREOPSIS_DIGIT_CANVAS;
    const scale = Math.min(1, availableWidth / requiredWidth, availableHeight / requiredHeight);
    const fits = scale >= 0.35;
    return {
      fits,
      requiredWidth: Math.ceil(requiredWidth * 0.5),
      requiredHeight: Math.ceil(requiredHeight * 0.5),
    };
  }

  if (world === 'crowding') {
    const anaglyphMatchedSpan = isAnaglyphExerciseColorScheme(colorScheme);
    return fitStimulusToViewport({
      world,
      availableWidth,
      availableHeight,
      pixelsPerDeg: sizing.pixelsPerDeg,
      crowding: {
        spacingRatio: CROWDING_PRECHECK_SPACING,
        letterHeightPx: sizing.letterHeightPx,
        idealLetterHeightPx: sizing.letterHeightPx,
        minLetterHeightPx: sizing.letterHeightPx,
        targetLetter: 'M',
        flankerLetters: ['H', 'K'],
        anaglyphMatchedSpan,
      },
    });
  }

  if (world === 'vernier') {
    const metrics = computeVernierStimulusMetrics({
      letterHeightPx: sizing.letterHeightPx,
      pixelsPerDeg: sizing.pixelsPerDeg,
      offsetArcsec: VERNIER_WORST_OFFSET_ARCSEC,
      availableHeight,
      gapMultiplier: sizing.vernierGapMultiplier,
    });

    return fitStimulusToViewport({
      world,
      availableWidth,
      availableHeight,
      pixelsPerDeg: sizing.pixelsPerDeg,
      vernier: {
        offsetPx: metrics.offsetPx,
        lineHeightPx: metrics.lineHeightPx,
        gapPx: metrics.gapPx,
        lineWidthPx: metrics.lineWidthPx,
        idealOffsetPx: metrics.offsetPx,
        idealLineHeightPx: metrics.lineHeightPx,
        idealGapPx: metrics.gapPx,
        idealLineWidthPx: metrics.lineWidthPx,
        minLineHeightPx: metrics.lineHeightPx,
        letterHeightPx: sizing.letterHeightPx,
      },
    });
  }

  return fitStimulusToViewport({
    world: 'gabor',
    availableWidth,
    availableHeight,
    pixelsPerDeg: sizing.pixelsPerDeg,
    gabor: {
      config: gaborConfig,
      pixelsPerDeg: sizing.pixelsPerDeg,
      patchSizePx: sizing.letterHeightPx,
      idealPatchSizePx: sizing.letterHeightPx,
      minPatchSizePx: sizing.letterHeightPx,
    },
  });
}

function evaluateVtQuestScreenFit(params: {
  screenInfo: ScreenInfo;
  distanceM: number;
  visionType: 'far' | 'near' | 'contrast';
  visionLevel: number;
  patientFarVisionLevel?: number;
  vtSettings?: Partial<VtSettings>;
  colorScheme?: ColorScheme | null;
  exerciseVisionType?: 'far' | 'near' | 'contrast' | null;
}): Pick<VtScreenRequirementResult, 'fits' | 'requiredWidth' | 'requiredHeight' | 'limitingWorld'> {
  const vtSettings: VtSettings = { ...DEFAULT_VT_SETTINGS, ...params.vtSettings };
  const sizing = computeVtVisionSizing({
    ...params,
    exerciseVisionType: params.exerciseVisionType ?? params.visionType,
  });
  const viewport = estimateExerciseViewport(params.screenInfo);

  const worlds: VtWorld[] =
    vtSettings.modalities.length > 0 ? vtSettings.modalities : ['gabor'];
  let limitingWorld: VtWorld | undefined;
  let requiredWidth = 0;
  let requiredHeight = 0;
  let fits = true;

  for (const world of worlds) {
    const result = worstCaseFit(world, sizing, viewport.width, viewport.height, vtSettings, params.colorScheme);
    if (!result.fits) fits = false;
    const area = result.requiredWidth * result.requiredHeight;
    if (area >= requiredWidth * requiredHeight) {
      requiredWidth = result.requiredWidth;
      requiredHeight = result.requiredHeight;
      limitingWorld = world;
    }
  }

  return { fits, requiredWidth, requiredHeight, limitingWorld };
}

export function checkVtQuestScreenRequirements(params: {
  screenInfo: ScreenInfo;
  distanceM: number;
  visionType: 'far' | 'near' | 'contrast';
  visionLevel: number;
  patientFarVisionLevel?: number;
  vtSettings?: Partial<VtSettings>;
  colorScheme?: ColorScheme | null;
  exerciseVisionType?: 'far' | 'near' | 'contrast' | null;
}): VtScreenRequirementResult {
  const { fits, requiredWidth, requiredHeight, limitingWorld } = evaluateVtQuestScreenFit(params);

  const recommendedPreset = SCREEN_PRESETS.find((preset) =>
    evaluateVtQuestScreenFit({ ...params, screenInfo: preset.screenInfo }).fits
  );

  const recommendedLabel = recommendedPreset
    ? recommendedPreset.label
    : 'Màn hình lớn hơn (≥ 24" hoặc độ phân giải cao hơn)';

  return {
    fits,
    requiredWidth,
    requiredHeight,
    recommendedLabel,
    recommendedMinWidth: requiredWidth,
    recommendedMinHeight: requiredHeight,
    limitingWorld,
  };
}

export interface VtResolvedExerciseVision {
  /** Level used for clinical letter / line height sizing. */
  sizeVisionLevel: number;
  sizeVisionType: 'far' | 'near';
  visionType: 'far' | 'near' | 'contrast';
  /** Contrast sensitivity level (1-based) when visionType is contrast. */
  contrastLevel?: number;
  /** Start display contrast %: 100 for far/near; contrast level % for contrast type. */
  stimulusContrastPercent: number;
}

/** Resolve effective vision level for VT sizing. */
export function resolveVtExerciseVision(params: VtExerciseVisionInput): VtResolvedExerciseVision | null {
  const input = normalizeVtVisionInput(params);
  const levelOverride = input.levelOverride === true;
  const visionType = input.visionType;
  if (!visionType || visionType === 'stereopsis') return null;

  const effectiveEye = resolveAssignmentTrainingEye({
    trainingEye: input.trainingEye,
    configEye: input.configEye,
  });

  const patientVision = computeExercisePatientVision({
    levelOverride: levelOverride,
    visionLevel: input.visionLevel ?? undefined,
    visionType,
    trainingEye: input.trainingEye,
    configEye: input.configEye,
    examResults: input.examResults,
  });

  const farFromExam = resolveExerciseVisionLevel(
    input.examResults?.far?.currentResult,
    effectiveEye ?? undefined
  );

  if (visionType === 'far') {
    // If a pre-resolved start level is provided (e.g. from latest_achieved mode), use it.
    const level = input.startVisionLevel ?? patientVision.farVisionLevel;
    if (level == null) return null;
    return {
      sizeVisionLevel: level,
      sizeVisionType: 'far',
      visionType: 'far',
      stimulusContrastPercent: 100,
    };
  }

  if (visionType === 'near') {
    const level = input.startVisionLevel ?? patientVision.nearVisionLevel;
    if (level == null) return null;
    return {
      sizeVisionLevel: level,
      sizeVisionType: 'near',
      visionType: 'near',
      stimulusContrastPercent: 100,
    };
  }

  // Contrast: contrast level from override or exam; letter size always from far acuity exam.
  const contrastLevel = input.startVisionLevel ?? patientVision.contrastLevel;
  if (contrastLevel == null) return null;

  const sizeBaseline = farFromExam ?? patientVision.farVisionLevel;
  if (sizeBaseline == null) return null;

  return {
    sizeVisionLevel: oneLevelLargerFar(sizeBaseline),
    sizeVisionType: 'far',
    visionType: 'contrast',
    contrastLevel,
    stimulusContrastPercent: contrastPercentForLevel(contrastLevel),
  };
}
