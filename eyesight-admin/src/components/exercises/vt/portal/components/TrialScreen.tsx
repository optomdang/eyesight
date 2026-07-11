/**
 * VT Quest — Trial Screen (Phase 2).
 * Canvas size follows vision-based letter height and auto-fits the viewport.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { drawGabor2AFC, clearGaborCanvas, computeGaborStimulusDiameterPx } from '../../stimuli/gaborRenderer';
import { drawVernier2AFC, drawVernierDualOffset2AFC, clearVernierCanvas } from '../../stimuli/vernierRenderer';
import { drawCrowding2AFC, drawCrowdingLetterMatch, clearCrowdingCanvas } from '../../stimuli/crowdingRenderer';
import { fitStimulusToViewport } from '../../core/stimulusLayout';
import { computeVernierStimulusMetrics } from '../../core/vernierLayout';
import type { VtVisionSizing } from '../../core/vtVisionSizing';
import { ensureVtOptotypeFontLoaded } from '../../core/vtOptotypeFont';
import {
  resolveVtStimulusColorScheme,
  isAnaglyphExerciseColorScheme,
} from '../../core/vtStimulusColors';
import {
  getGaborTaskModeFromTrial,
  isSideBasedMode,
  metaNumberFromTrial,
  orientationLabel,
  orientationCssAngle,
  DELAYED_MATCH_MEMORIZE_MS,
  resolveGaborStageEndPolicy,
  VT_UNLIMITED_TRIALS_PER_STAGE,
} from '../../core/gaborTaskModes';
import {
  getVernierTaskModeFromTrial,
  isVernierSideBasedMode,
  resolveVernierStageEndPolicy,
  DELAYED_DIRECTION_MEMORIZE_MS,
} from '../../core/vernierTaskModes';
import {
  getCrowdingTaskModeFromTrial,
  isCrowdingSideBasedMode,
  resolveCrowdingStageEndPolicy,
  DELAYED_LETTER_MEMORIZE_MS,
} from '../../core/crowdingTaskModes';
import {
  getStereopsisTaskModeFromTrial,
  resolveStereopsisStageEndPolicy,
  STEREOPSIS_SHAPE_LABELS,
  STEREOPSIS_POSITION_LABELS,
  STEREOPSIS_SHAPE_ICONS,
} from '../../core/stereopsisTaskModes';
import StereopsisTaskStimulus from './StereopsisTaskStimulus';
import {
  STEREOPSIS_DIGIT_CANVAS,
  STEREOPSIS_ROW_PANEL,
  STEREOPSIS_SHAPE_CANVAS,
} from '../../stimuli/stereopsisRenderer';
import VernierTaskStimulus, {
  VERNIER_CARD_GAP,
  VERNIER_CARD_PADDING,
  VERNIER_SINGLE_PADDING,
} from './VernierTaskStimulus';
import { COPY } from '../../gamification/copy.vi';
import type { TrialFeedbackState } from '../../gamification/useTrialFeedback';
import TrialFeedbackOverlay from './TrialFeedbackOverlay';
import TrialScreenFitWarning from './TrialScreenFitWarning';
import { useAutoInstructionAudioQueue } from 'src/hooks/useInstructionAudioPlayback';
import { getVtInstructionSampleId } from 'src/utils/audio/instructionAudioResolver';
import GaborTaskStimulus, {
  GABOR_CARD_PADDING,
  GABOR_CARD_GAP,
  GABOR_SINGLE_PADDING,
} from './GaborTaskStimulus';
import CrowdingTaskStimulus, {
  CROWDING_CARD_GAP,
  CROWDING_CARD_PADDING,
  CROWDING_SINGLE_PADDING,
} from './CrowdingTaskStimulus';
import type {
  VtEngineState,
  VtGaborTaskMode,
  VtVernierTaskMode,
  VtCrowdingTaskMode,
  VtStereopsisTaskMode,
  VtTrialResponseInput,
  VtWorld,
} from 'src/types/core/vtQuest';
import type { IntroShapeType } from 'src/utils/stereopsis/stereopsisEngine';
import type { GeoShapeType } from 'src/utils/stereopsis/stereopsisEngine';
import type { ColorScheme, DichopticConfig, DichopticPresentation } from 'src/types/core/visual-settings';
import { resolveDichopticPresentation } from 'src/utils/dichopticUtils';

const BG_LUMINANCE: Record<VtWorld, number> = {
  gabor: 128,
  vernier: 200,
  crowding: 220,
  stereopsis: 10,
};

const STEREOPSIS_PANEL_BG = '#0a0c10';

interface TrialScreenProps {
  engineState: VtEngineState;
  distanceM: number;
  visionSizing: VtVisionSizing | null;
  colorScheme?: ColorScheme | null;
  /** Dichoptic config from ExerciseConfig — resolver computes DichopticPresentation internally. */
  dichopticConfig?: DichopticConfig | null;
  /** trainingEye from the assignment (used by dichoptic resolver). */
  trainingEye?: string | null;
  onResponse: (response: VtTrialResponseInput) => void;
  feedback?: TrialFeedbackState | null;
  responseBlocked?: boolean;
  screenRecommendation?: string | null;
  showEaseHint?: boolean;
  onExitRequest?: () => void;
  exitDisabled?: boolean;
}

function getInstruction(
  world: VtWorld,
  gaborMode: VtGaborTaskMode,
  vernierMode: VtVernierTaskMode,
  crowdingMode: VtCrowdingTaskMode,
  stereopsisMode: VtStereopsisTaskMode,
  recallPhase: boolean
): string {
  if (world === 'stereopsis') {
    switch (stereopsisMode) {
      case 'float_position':
        return COPY.instructStereopsisFloat;
      case 'digit_id':
        return COPY.instructStereopsisDigit;
      default:
        return COPY.instructStereopsisShape;
    }
  }
  if (world === 'vernier') {
    switch (vernierMode) {
      case 'offset_direction_mcq':
        return COPY.instructVernierDirection;
      case 'greater_offset_2afc':
        return COPY.instructVernierGreater;
      case 'odd_line_out':
        return COPY.instructVernierOdd;
      case 'delayed_direction':
        return recallPhase ? COPY.instructVernierRecall : COPY.instructVernierMemorize;
      default:
        return COPY.instructVernierDefault;
    }
  }
  if (world === 'crowding') {
    switch (crowdingMode) {
      case 'central_letter_id':
        return COPY.instructCrowdingCentral;
      case 'letter_match_2afc':
        return COPY.instructCrowdingMatch;
      case 'odd_letter_out':
        return COPY.instructCrowdingOdd;
      case 'delayed_letter':
        return recallPhase ? COPY.instructCrowdingRecall : COPY.instructCrowdingMemorize;
      case 'flanker_same_different':
        return COPY.instructCrowdingSameDifferent;
      default:
        return COPY.instructCrowding;
    }
  }
  switch (gaborMode) {
    case 'orientation_id':
      return COPY.instructGaborOrientation;
    case 'orientation_match':
      return COPY.instructGaborMatch;
    case 'odd_one_out':
      return COPY.instructGaborOdd;
    case 'sf_discrimination':
      return COPY.instructGaborSf;
    case 'delayed_match':
      return recallPhase ? COPY.instructGaborRecall : COPY.instructGaborMemorize;
    default:
      return COPY.instructGabor;
  }
}

/** Mini stripe icon showing the orientation of an answer option. */
const StripeIcon: React.FC<{ deg: number }> = ({ deg }) => (
  <Box
    component="span"
    sx={{
      width: 28,
      height: 28,
      borderRadius: '6px',
      flexShrink: 0,
      background: `repeating-linear-gradient(${orientationCssAngle(deg)}deg, #ffffff 0 3px, transparent 3px 7px)`,
      border: '1px solid rgba(255,255,255,0.35)',
    }}
  />
);

const BTN_COLORS: Record<
  VtWorld,
  { left: string; leftHover: string; right: string; rightHover: string }
> = {
  gabor: { left: '#6C5CE7', leftHover: '#5a4bd1', right: '#4ECDC4', rightHover: '#3bbdb4' },
  vernier: { left: '#0984e3', leftHover: '#0769b4', right: '#00b894', rightHover: '#009d80' },
  crowding: { left: '#a29bfe', leftHover: '#6c5ce7', right: '#fd79a8', rightHover: '#e84393' },
  stereopsis: { left: '#E17055', leftHover: '#d35400', right: '#6C5CE7', rightHover: '#5a4bd1' },
};

const TrialScreen: React.FC<TrialScreenProps> = ({
  engineState,
  distanceM,
  visionSizing,
  colorScheme,
  dichopticConfig,
  trainingEye,
  onResponse,
  feedback = null,
  responseBlocked = false,
  screenRecommendation = null,
  showEaseHint = false,
  onExitRequest,
  exitDisabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stimulusAreaRef = useRef<HTMLDivElement>(null);
  const [areaSize, setAreaSize] = useState({ width: 0, height: 0 });

  const { currentTrial, stimulusVisible, session, settings } = engineState;
  const pixelsPerDeg = visionSizing?.pixelsPerDeg ?? 40;
  const baseLetterHeightPx = visionSizing?.letterHeightPx ?? 24;

  const world = session.currentWorld;
  const gaborMode: VtGaborTaskMode =
    world === 'gabor' ? getGaborTaskModeFromTrial(currentTrial) : 'location_2afc';
  const vernierMode: VtVernierTaskMode =
    world === 'vernier' ? getVernierTaskModeFromTrial(currentTrial) : 'alignment_2afc';
  const crowdingMode: VtCrowdingTaskMode =
    world === 'crowding' ? getCrowdingTaskModeFromTrial(currentTrial) : 'location_2afc';
  const stereopsisMode: VtStereopsisTaskMode =
    world === 'stereopsis' ? getStereopsisTaskModeFromTrial(currentTrial) : 'shape_id';
  const isCustomGaborMode = world === 'gabor' && gaborMode !== 'location_2afc';
  const isCustomVernierMode = world === 'vernier' && vernierMode !== 'alignment_2afc' && vernierMode !== 'greater_offset_2afc';
  const isCustomCrowdingMode =
    world === 'crowding' &&
    crowdingMode !== 'location_2afc' &&
    crowdingMode !== 'letter_match_2afc';

  // Match-cards selection (per trial)
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  // Delayed match: memorize → recall
  const [recallPhase, setRecallPhase] = useState(false);

  useEffect(() => {
    setSelectedCards([]);
    const delayedMode =
      (world === 'gabor' && gaborMode === 'delayed_match') ||
      (world === 'vernier' && vernierMode === 'delayed_direction') ||
      (world === 'crowding' && crowdingMode === 'delayed_letter');
    if (!delayedMode || !currentTrial) {
      setRecallPhase(false);
      return;
    }
    setRecallPhase(false);
    const delayMs =
      world === 'vernier'
        ? DELAYED_DIRECTION_MEMORIZE_MS
        : world === 'crowding'
          ? DELAYED_LETTER_MEMORIZE_MS
          : DELAYED_MATCH_MEMORIZE_MS;
    const timer = setTimeout(() => setRecallPhase(true), delayMs);
    return () => clearTimeout(timer);
  }, [currentTrial?.trialIndex, currentTrial, gaborMode, vernierMode, crowdingMode, world]);

  const instructionSampleId = useMemo(
    () =>
      getVtInstructionSampleId(
        world,
        gaborMode,
        vernierMode,
        crowdingMode,
        stereopsisMode,
        recallPhase
      ),
    [world, gaborMode, vernierMode, crowdingMode, stereopsisMode, recallPhase]
  );

  useAutoInstructionAudioQueue([instructionSampleId], {
    lang: 'vi',
    dedupeKey: `vt-trial:${instructionSampleId}`,
  });

  const bgLum = BG_LUMINANCE[world];
  const stimulusColorScheme = useMemo(
    () => resolveVtStimulusColorScheme(colorScheme),
    [colorScheme]
  );
  const crowdingAnaglyphAntiCue = useMemo(
    () => isAnaglyphExerciseColorScheme(colorScheme),
    [colorScheme]
  );

  const dichopticPresentation = useMemo<DichopticPresentation>(
    () =>
      resolveDichopticPresentation(
        { colorScheme, dichoptic: dichopticConfig ?? null },
        { trainingEye: trainingEye ?? null }
      ),
    [colorScheme, dichopticConfig, trainingEye]
  );

  const stimulusContrastPercent = visionSizing?.stimulusContrastPercent ?? 100;
  const panelBackground =
    world === 'stereopsis'
      ? STEREOPSIS_PANEL_BG
      : stimulusColorScheme?.useColoredPanels && (world === 'vernier' || world === 'crowding')
        ? '#000000'
        : `rgb(${bgLum},${bgLum},${bgLum})`;
  const [crowdingFontReady, setCrowdingFontReady] = useState(world !== 'crowding');

  useEffect(() => {
    if (world !== 'crowding') {
      setCrowdingFontReady(true);
      return;
    }
    setCrowdingFontReady(false);
    void ensureVtOptotypeFontLoaded(baseLetterHeightPx).then(() => setCrowdingFontReady(true));
  }, [world, baseLetterHeightPx]);

  useEffect(() => {
    const el = stimulusAreaRef.current;
    if (!el) return;

    const update = () => {
      setAreaSize({ width: el.clientWidth, height: el.clientHeight });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const layout = useMemo(() => {
    const availableWidth = Math.max(areaSize.width - 16, 0);
    const availableHeight = Math.max(areaSize.height - 16, 0);

    if (!currentTrial || !visionSizing || availableWidth < 80 || availableHeight < 60) {
      return null;
    }

    if (isCustomGaborMode) {
      // Clinical plateau is fixed; canvas must also fit the outer fade halo.
      const patch = Math.round(baseLetterHeightPx);
      const stimulusDiameter = computeGaborStimulusDiameterPx(patch);
      let requiredWidth: number;
      let requiredHeight: number;

      if (gaborMode === 'orientation_match' || gaborMode === 'odd_one_out') {
        const n = Array.isArray(currentTrial.meta?.cardOrientations)
          ? (currentTrial.meta.cardOrientations as number[]).length
          : 4;
        const cols = 2;
        const rows = Math.ceil(n / cols);
        const card = stimulusDiameter + GABOR_CARD_PADDING * 2 + 6; // +6 border
        requiredWidth = cols * card + (cols - 1) * GABOR_CARD_GAP;
        requiredHeight = rows * card + (rows - 1) * GABOR_CARD_GAP;
      } else if (gaborMode === 'sf_discrimination') {
        const panel = stimulusDiameter + GABOR_SINGLE_PADDING * 2;
        requiredWidth = panel * 2 + 2;
        requiredHeight = panel;
      } else {
        const size = stimulusDiameter + GABOR_SINGLE_PADDING * 2;
        requiredWidth = size;
        requiredHeight = size;
      }

      return {
        fits: requiredWidth <= availableWidth && requiredHeight <= availableHeight,
        canvasWidth: requiredWidth,
        canvasHeight: requiredHeight,
        requiredWidth,
        requiredHeight,
      };
    }

    if (isCustomVernierMode && world === 'vernier') {
      const gapMultiplier = visionSizing?.vernierGapMultiplier ?? 1;
      const metrics = computeVernierStimulusMetrics({
        letterHeightPx: baseLetterHeightPx,
        pixelsPerDeg,
        offsetArcsec: currentTrial.difficultyValue,
        availableHeight: availableHeight,
        gapMultiplier,
      });
      const pairW = metrics.lineWidthPx + Math.abs(metrics.offsetPx) + 16;
      const pairH = metrics.lineHeightPx * 2 + metrics.gapPx + 16;
      const cardBase = Math.max(pairW, pairH);

      let requiredWidth: number;
      let requiredHeight: number;

      if (vernierMode === 'odd_line_out') {
        const card = cardBase + VERNIER_CARD_PADDING * 2 + 6;
        requiredWidth = 2 * card + VERNIER_CARD_GAP;
        requiredHeight = 2 * card + VERNIER_CARD_GAP;
      } else {
        const size = cardBase + VERNIER_SINGLE_PADDING * 2;
        requiredWidth = size;
        requiredHeight = size;
      }

      return {
        fits: requiredWidth <= availableWidth && requiredHeight <= availableHeight,
        canvasWidth: requiredWidth,
        canvasHeight: requiredHeight,
        requiredWidth,
        requiredHeight,
      };
    }

    if (world === 'stereopsis') {
      const meta = currentTrial.meta ?? {};
      const positionCount =
        typeof meta.positionCount === 'number' ? meta.positionCount : 5;
      let requiredWidth: number;
      let requiredHeight: number;
      if (stereopsisMode === 'float_position') {
        requiredWidth = positionCount * STEREOPSIS_ROW_PANEL + (positionCount - 1) * 8;
        requiredHeight = STEREOPSIS_ROW_PANEL;
      } else if (stereopsisMode === 'digit_id') {
        requiredWidth = Math.min(STEREOPSIS_DIGIT_CANVAS, 520);
        requiredHeight = Math.min(STEREOPSIS_DIGIT_CANVAS, 520);
      } else {
        requiredWidth = STEREOPSIS_SHAPE_CANVAS;
        requiredHeight = STEREOPSIS_SHAPE_CANVAS;
      }
      return {
        fits: requiredWidth <= availableWidth && requiredHeight <= availableHeight,
        canvasWidth: requiredWidth,
        canvasHeight: requiredHeight,
        requiredWidth,
        requiredHeight,
      };
    }

    if (isCustomCrowdingMode && world === 'crowding') {
      const meta = currentTrial.meta ?? {};
      const spacingRatio = currentTrial.difficultyValue;
      const letterH = baseLetterHeightPx;
      const spacingPx = spacingRatio * letterH;

      let requiredWidth: number;
      let requiredHeight: number;

      if (crowdingMode === 'odd_letter_out') {
        const cardTargets = Array.isArray(meta.cardTargets) ? (meta.cardTargets as string[]) : [];
        const n = cardTargets.length || 4;
        const cols = 2;
        const rows = Math.ceil(n / cols);
        const cardW = spacingPx * 2 + letterH + CROWDING_CARD_PADDING * 2 + 6;
        const cardH = letterH + CROWDING_CARD_PADDING * 2 + 6;
        requiredWidth = cols * cardW + (cols - 1) * CROWDING_CARD_GAP;
        requiredHeight = rows * cardH + (rows - 1) * CROWDING_CARD_GAP;
      } else {
        const w = spacingPx * 2 + letterH + CROWDING_SINGLE_PADDING * 2;
        requiredWidth = w;
        requiredHeight = w;
      }

      return {
        fits: requiredWidth <= availableWidth && requiredHeight <= availableHeight,
        canvasWidth: requiredWidth,
        canvasHeight: requiredHeight,
        requiredWidth,
        requiredHeight,
      };
    }

    if (world === 'crowding') {
      const meta = currentTrial.meta ?? {};
      const targetLetter = typeof meta.targetLetter === 'string' ? meta.targetLetter : 'E';
      const rawFlankers = meta.flankerLetters;
      const flankerLetters: [string, string] =
        Array.isArray(rawFlankers) && rawFlankers.length >= 2
          ? [String(rawFlankers[0]), String(rawFlankers[1])]
          : ['B', 'C'];

      return fitStimulusToViewport({
        world,
        availableWidth,
        availableHeight,
        pixelsPerDeg,
        crowding: {
          spacingRatio: currentTrial.difficultyValue,
          letterHeightPx: baseLetterHeightPx,
          idealLetterHeightPx: baseLetterHeightPx,
          minLetterHeightPx: baseLetterHeightPx,
          targetLetter,
          flankerLetters,
          anaglyphMatchedSpan: crowdingAnaglyphAntiCue,
          referenceRow: crowdingMode === 'letter_match_2afc',
        },
      });
    }

    if (world === 'vernier') {
      const gapMultiplier = visionSizing?.vernierGapMultiplier ?? 1;
      const metrics = computeVernierStimulusMetrics({
        letterHeightPx: baseLetterHeightPx,
        pixelsPerDeg,
        offsetArcsec: currentTrial.difficultyValue,
        availableHeight: availableHeight,
        gapMultiplier,
      });

      return fitStimulusToViewport({
        world,
        availableWidth,
        availableHeight,
        pixelsPerDeg,
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
          letterHeightPx: baseLetterHeightPx,
        },
      });
    }

    const gaborConfig = settings.stimulus.gabor ?? {
      sfCpD: 3,
      orientation: 'vertical' as const,
      sigmaDeg: 0.5,
    };

    return fitStimulusToViewport({
      world: 'gabor',
      availableWidth,
      availableHeight,
      pixelsPerDeg,
      gabor: {
        config: gaborConfig,
        pixelsPerDeg,
        patchSizePx: baseLetterHeightPx,
        idealPatchSizePx: baseLetterHeightPx,
        minPatchSizePx: baseLetterHeightPx,
      },
    });
  }, [
    areaSize,
    currentTrial,
    world,
    gaborMode,
    isCustomGaborMode,
    vernierMode,
    isCustomVernierMode,
    isCustomCrowdingMode,
    crowdingMode,
    stereopsisMode,
    pixelsPerDeg,
    baseLetterHeightPx,
    visionSizing,
    settings.stimulus.gabor,
    crowdingAnaglyphAntiCue,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout?.fits || isCustomGaborMode || isCustomVernierMode || isCustomCrowdingMode || world === 'stereopsis') return;

    canvas.width = layout.canvasWidth;
    canvas.height = layout.canvasHeight;

    if (!currentTrial || !stimulusVisible) {
      if (world === 'gabor') clearGaborCanvas(canvas, bgLum);
      else if (world === 'vernier') clearVernierCanvas(canvas, bgLum, stimulusColorScheme);
      else clearCrowdingCanvas(canvas, bgLum, stimulusColorScheme);
      return;
    }

    if (currentTrial.world === 'gabor') {
      const gaborConfig = settings.stimulus.gabor ?? {
        sfCpD: 3,
        orientation: 'vertical' as const,
        sigmaDeg: 0.5,
      };
      const phaseRad =
        typeof currentTrial.meta?.phaseRad === 'number' ? currentTrial.meta.phaseRad : undefined;
      drawGabor2AFC({
        canvas,
        signalSide: currentTrial.signalSide,
        contrast: currentTrial.difficultyValue,
        config: gaborConfig,
        distanceM,
        pixelsPerDeg,
        patchSizePx: layout.gaborPatchSizePx ?? baseLetterHeightPx,
        phaseRad,
      });
      return;
    }

    if (currentTrial.world === 'vernier') {
      const gapMultiplier = visionSizing?.vernierGapMultiplier ?? 1;
      const v =
        layout.vernier ??
        computeVernierStimulusMetrics({
          letterHeightPx: baseLetterHeightPx,
          pixelsPerDeg,
          offsetArcsec: currentTrial.difficultyValue,
          gapMultiplier,
        });
      const offsetSign =
        currentTrial.meta?.offsetSign === -1 || currentTrial.meta?.offsetSign === 1
          ? currentTrial.meta.offsetSign
          : undefined;
      if (vernierMode === 'greater_offset_2afc') {
        const ratio =
          typeof currentTrial.meta?.distractorOffsetRatio === 'number'
            ? currentTrial.meta.distractorOffsetRatio
            : 0.5;
        drawVernierDualOffset2AFC({
          canvas,
          signalSide: currentTrial.signalSide,
          offsetPx: Math.max(v.offsetPx, 0.5),
          lineHeightPx: v.lineHeightPx,
          gapPx: v.gapPx,
          lineWidthPx: v.lineWidthPx,
          backgroundLuminance: bgLum,
          colorScheme: stimulusColorScheme,
          stimulusContrastPercent,
          offsetSign,
          distractorOffsetRatio: ratio,
          dichopticPresentation,
        });
        return;
      }
      drawVernier2AFC({
        canvas,
        signalSide: currentTrial.signalSide,
        offsetPx: Math.max(v.offsetPx, 0.5),
        lineHeightPx: v.lineHeightPx,
        gapPx: v.gapPx,
        lineWidthPx: v.lineWidthPx,
        backgroundLuminance: bgLum,
        colorScheme: stimulusColorScheme,
        stimulusContrastPercent,
        offsetSign,
        dichopticPresentation,
      });
      return;
    }

    if (currentTrial.world === 'crowding') {
      if (!crowdingFontReady) return;
      const meta = currentTrial.meta ?? {};
      const targetLetter = typeof meta.targetLetter === 'string' ? meta.targetLetter : 'E';
      const rawFlankers = meta.flankerLetters;
      const flankerLetters: [string, string] =
        Array.isArray(rawFlankers) && rawFlankers.length >= 2
          ? [String(rawFlankers[0]), String(rawFlankers[1])]
          : ['B', 'C'];
      const letterHeightPx = layout.crowdingLetterHeightPx ?? baseLetterHeightPx;

      if (crowdingMode === 'letter_match_2afc') {
        const referenceLetter =
          typeof meta.referenceLetter === 'string' ? meta.referenceLetter : targetLetter;
        const leftTargetLetter =
          typeof meta.leftTargetLetter === 'string' ? meta.leftTargetLetter : targetLetter;
        const rightTargetLetter =
          typeof meta.rightTargetLetter === 'string' ? meta.rightTargetLetter : 'B';
        drawCrowdingLetterMatch({
          canvas,
          signalSide: currentTrial.signalSide,
          spacingRatio: layout.crowdingSpacingRatio ?? currentTrial.difficultyValue,
          letterHeightPx,
          referenceLetter,
          leftTargetLetter,
          rightTargetLetter,
          flankerLetters,
          backgroundLuminance: bgLum,
          colorScheme: stimulusColorScheme,
          stimulusContrastPercent,
          anaglyphAntiCue: crowdingAnaglyphAntiCue,
          dichopticPresentation,
        });
        return;
      }

      drawCrowding2AFC({
        canvas,
        signalSide: currentTrial.signalSide,
        spacingRatio: layout.crowdingSpacingRatio ?? currentTrial.difficultyValue,
        letterHeightPx,
        targetLetter,
        flankerLetters,
        backgroundLuminance: bgLum,
        colorScheme: stimulusColorScheme,
        stimulusContrastPercent,
        anaglyphAntiCue: crowdingAnaglyphAntiCue,
        dichopticPresentation,
      });
    }
  }, [
    currentTrial,
    stimulusVisible,
    settings,
    distanceM,
    pixelsPerDeg,
    baseLetterHeightPx,
    world,
    bgLum,
    layout,
    isCustomGaborMode,
    isCustomVernierMode,
    isCustomCrowdingMode,
    vernierMode,
    crowdingMode,
    crowdingFontReady,
    stimulusColorScheme,
    stimulusContrastPercent,
    crowdingAnaglyphAntiCue,
    dichopticPresentation,
  ]);

  const disabled = !engineState.isPendingResponse || !layout?.fits || responseBlocked;
  const trialNum = session.currentStageTrials.length + 1;
  const gaborStagePolicy =
    world === 'gabor' ? resolveGaborStageEndPolicy(settings, settings.stimulus.gabor) : null;
  const vernierStagePolicy =
    world === 'vernier' ? resolveVernierStageEndPolicy(settings, settings.stimulus.vernier) : null;
  const crowdingStagePolicy =
    world === 'crowding' ? resolveCrowdingStageEndPolicy(settings, settings.stimulus.crowding) : null;
  const stereopsisStagePolicy =
    world === 'stereopsis'
      ? resolveStereopsisStageEndPolicy(settings, settings.stimulus.stereopsis)
      : null;
  const stagePolicy =
    gaborStagePolicy ?? vernierStagePolicy ?? crowdingStagePolicy ?? stereopsisStagePolicy;
  const totalTrials =
    stagePolicy && stagePolicy.trialsPerStage >= VT_UNLIMITED_TRIALS_PER_STAGE / 2
      ? null
      : (stagePolicy?.trialsPerStage ?? settings.trialsPerStage);
  const btnColors = BTN_COLORS[world];
  const isTooSmall = layout != null && layout.fits === false;
  const isStimulusLoading =
    layout == null || (layout.fits === true && world === 'crowding' && !crowdingFontReady);
  const isLayoutReady =
    layout?.fits === true && (world !== 'crowding' || crowdingFontReady);

  const sideBased =
    (world === 'gabor' && isSideBasedMode(gaborMode)) ||
    (world === 'vernier' && isVernierSideBasedMode(vernierMode)) ||
    (world === 'crowding' && isCrowdingSideBasedMode(crowdingMode));

  const vernierDirectionMcqKeys =
    world === 'vernier' &&
    (vernierMode === 'offset_direction_mcq' ||
      (vernierMode === 'delayed_direction' && recallPhase));

  const arrowKeyEnabled = sideBased || vernierDirectionMcqKeys;

  useEffect(() => {
    if (disabled || !arrowKeyEnabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (vernierDirectionMcqKeys) onResponse({ index: 0 });
        else onResponse('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (vernierDirectionMcqKeys) onResponse({ index: 1 });
        else onResponse('right');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, arrowKeyEnabled, vernierDirectionMcqKeys, onResponse]);

  // ─── Custom gabor mode data from trial meta ─────────────────────────────────
  const meta = currentTrial?.meta ?? {};
  const optionsDeg: number[] = Array.isArray(meta.optionsDeg) ? (meta.optionsDeg as number[]) : [];
  const cardOrientations: number[] = Array.isArray(meta.cardOrientations)
    ? (meta.cardOrientations as number[])
    : [];
  const targetOrientationDeg = metaNumberFromTrial(meta.targetOrientationDeg) ?? 0;
  const sfOrientationDeg = typeof meta.orientationDeg === 'number' ? meta.orientationDeg : 0;
  const phaseRad = typeof meta.phaseRad === 'number' ? meta.phaseRad : undefined;
  const gaborSfCpD = settings.stimulus.gabor?.sfCpD ?? 3;
  const vernierOffsetSign =
    meta.offsetSign === -1 || meta.offsetSign === 1 ? (meta.offsetSign as 1 | -1) : 1;
  const vernierCardOffsetSigns: (1 | -1)[] = Array.isArray(meta.cardOffsetSigns)
    ? (meta.cardOffsetSigns as (1 | -1)[])
    : [];
  const gapMultiplier = visionSizing?.vernierGapMultiplier ?? 1;
  const vernierMetrics = computeVernierStimulusMetrics({
    letterHeightPx: baseLetterHeightPx,
    pixelsPerDeg,
    offsetArcsec: currentTrial?.difficultyValue ?? 120,
    gapMultiplier,
  });

  const toggleCard = (index: number) => {
    if (gaborMode === 'odd_one_out') {
      const deg = cardOrientations[index];
      onResponse({ index, orientationDeg: deg });
      return;
    }
    setSelectedCards((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= 2) return [prev[1], index];
      return [...prev, index];
    });
  };

  // Delayed match hides the patch during recall; other modes follow stimulusVisible
  const customStimulusVisible =
    gaborMode === 'delayed_match' ||
    vernierMode === 'delayed_direction' ||
    crowdingMode === 'delayed_letter'
      ? stimulusVisible && !recallPhase
      : stimulusVisible;

  const optionsLetters: string[] = Array.isArray(meta.optionsLetters)
    ? (meta.optionsLetters as string[])
    : [];
  const cardTargets: string[] = Array.isArray(meta.cardTargets)
    ? (meta.cardTargets as string[])
    : [];
  const crowdingFlankers: [string, string] =
    Array.isArray(meta.flankerLetters) && meta.flankerLetters.length >= 2
      ? [String(meta.flankerLetters[0]), String(meta.flankerLetters[1])]
      : ['B', 'C'];
  const crowdingTargetLetter =
    typeof meta.targetLetter === 'string' ? meta.targetLetter : 'E';

  const stereopsisRngSeed =
    typeof meta.rngSeed === 'number' ? meta.rngSeed : currentTrial?.trialIndex ?? 1;
  const stereopsisShapeType =
    typeof meta.shapeType === 'string' ? (meta.shapeType as IntroShapeType) : 'star';
  const stereopsisFloatShape =
    meta.floatShape === 'circle' || meta.floatShape === 'square'
      ? (meta.floatShape as GeoShapeType)
      : 'square';
  const stereopsisFloatAt = typeof meta.floatAt === 'number' ? meta.floatAt : 0;
  const stereopsisPositionCount =
    typeof meta.positionCount === 'number' ? meta.positionCount : 5;
  const stereopsisDigit = typeof meta.digit === 'number' ? meta.digit : 0;
  const optionShapeIds: string[] = Array.isArray(meta.optionShapeIds)
    ? (meta.optionShapeIds as string[])
    : ['star', 'triangle', 'square'];
  const optionDigits: number[] = Array.isArray(meta.optionDigits)
    ? (meta.optionDigits as number[])
    : Array.from({ length: 10 }, (_, i) => i);

  const stereopsisDigitKeysEnabled =
    isLayoutReady &&
    world === 'stereopsis' &&
    stereopsisMode === 'digit_id' &&
    optionDigits.length > 0;

  useEffect(() => {
    if (disabled || !stereopsisDigitKeysEnabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const digitFromKey = /^[0-9]$/.test(e.key) ? e.key : null;
      const numpadMatch = e.code.match(/^Numpad([0-9])$/);
      const digitStr = digitFromKey ?? numpadMatch?.[1] ?? null;
      if (digitStr == null) return;

      const digit = parseInt(digitStr, 10);
      const idx = optionDigits.indexOf(digit);
      if (idx < 0) return;

      e.preventDefault();
      onResponse({ index: idx });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, stereopsisDigitKeysEnabled, optionDigits, onResponse]);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        background: 'radial-gradient(ellipse at 50% 20%, #1a0a3c 0%, #0a0520 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {feedback && <TrialFeedbackOverlay feedback={feedback} world={world} />}

      {/* Header — fixed height, does not steal space from response bar */}
      <Box sx={{ flexShrink: 0, pt: 8, px: 2, textAlign: 'center' }}>
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, letterSpacing: 1.5, display: 'block' }}
        >
          THỬ {trialNum}
          {totalTrials != null ? ` / ${totalTrials}` : ''}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            maxWidth: 440,
            mx: 'auto',
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          {getInstruction(world, gaborMode, vernierMode, crowdingMode, stereopsisMode, recallPhase)}
        </Typography>
      </Box>

      {/* Stimulus — shrinks when response bar needs room */}
      <Box
        ref={stimulusAreaRef}
        sx={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'auto',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            textAlign: 'center',
            color: '#FFD93D',
            fontWeight: 700,
            letterSpacing: 0.5,
            opacity: showEaseHint ? 1 : 0,
            transition: 'opacity 0.25s ease',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {COPY.trialEasedHint}
        </Typography>
        {isTooSmall ? (
          <TrialScreenFitWarning
            world={world}
            requiredWidth={layout.requiredWidth}
            requiredHeight={layout.requiredHeight}
            letterHeightPx={baseLetterHeightPx}
            screenRecommendation={screenRecommendation}
            onExit={onExitRequest}
            exitDisabled={exitDisabled}
          />
        ) : isStimulusLoading ? (
          <CircularProgress sx={{ color: '#6C5CE7', m: 'auto' }} size={36} />
        ) : world === 'stereopsis' ? (
          <Box sx={{ m: 'auto', width: '100%', maxWidth: layout.canvasWidth }}>
            <StereopsisTaskStimulus
              mode={stereopsisMode}
              arcsec={currentTrial?.difficultyValue ?? 400}
              rngSeed={stereopsisRngSeed}
              visible={stimulusVisible}
              shapeType={stereopsisShapeType}
              floatShape={stereopsisFloatShape}
              floatAt={stereopsisFloatAt}
              positionCount={stereopsisPositionCount}
              digit={stereopsisDigit}
            />
          </Box>
        ) : isCustomGaborMode ? (
          <Box sx={{ m: 'auto' }}>
            <GaborTaskStimulus
              mode={gaborMode as Exclude<VtGaborTaskMode, 'location_2afc'>}
              contrast={currentTrial?.difficultyValue ?? 0.5}
              patchSizePx={baseLetterHeightPx}
              pixelsPerDeg={pixelsPerDeg}
              sfCpD={gaborSfCpD}
              phaseRad={phaseRad}
              backgroundLum={bgLum}
              visible={customStimulusVisible}
              targetOrientationDeg={targetOrientationDeg}
              cardOrientations={cardOrientations}
              selectedIndices={selectedCards}
              onCardSelect={toggleCard}
              cardsDisabled={disabled}
              thickSide={currentTrial?.signalSide ?? 'left'}
              sfOrientationDeg={sfOrientationDeg}
            />
          </Box>
        ) : isCustomVernierMode ? (
          <Box sx={{ m: 'auto' }}>
            <VernierTaskStimulus
              mode={vernierMode as Exclude<VtVernierTaskMode, 'alignment_2afc' | 'greater_offset_2afc'>}
              offsetPx={Math.max(vernierMetrics.offsetPx, 0.5)}
              lineHeightPx={vernierMetrics.lineHeightPx}
              gapPx={vernierMetrics.gapPx}
              lineWidthPx={vernierMetrics.lineWidthPx}
              backgroundLum={bgLum}
              colorScheme={stimulusColorScheme}
              stimulusContrastPercent={stimulusContrastPercent}
              dichopticPresentation={dichopticPresentation}
              visible={customStimulusVisible}
              offsetSign={vernierOffsetSign}
              cardOffsetSigns={vernierCardOffsetSigns}
              onCardSelect={(idx) => onResponse({ index: idx })}
              cardsDisabled={disabled}
            />
          </Box>
        ) : isCustomCrowdingMode ? (
          <Box sx={{ m: 'auto' }}>
            <CrowdingTaskStimulus
              mode={
                crowdingMode as Exclude<VtCrowdingTaskMode, 'location_2afc' | 'letter_match_2afc'>
              }
              spacingRatio={currentTrial?.difficultyValue ?? 1.2}
              letterHeightPx={baseLetterHeightPx}
              targetLetter={crowdingTargetLetter}
              flankerLetters={crowdingFlankers}
              backgroundLum={bgLum}
              colorScheme={stimulusColorScheme}
              stimulusContrastPercent={stimulusContrastPercent}
              dichopticPresentation={dichopticPresentation}
              visible={customStimulusVisible}
              cardTargets={cardTargets}
              onCardSelect={(idx) => onResponse({ index: idx })}
              cardsDisabled={disabled}
            />
          </Box>
        ) : (
          <Box
            sx={{
              m: 'auto',
              border: '2px solid rgba(108,92,231,0.4)',
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 0 48px rgba(108,92,231,0.25)',
              lineHeight: 0,
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                width: layout.canvasWidth,
                height: layout.canvasHeight,
                maxWidth: '100%',
                maxHeight: '100%',
                background: panelBackground,
              }}
            />
          </Box>
        )}
      </Box>

      {/* Response bar — always pinned above bottom edge */}
      <Box
        sx={{
          flexShrink: 0,
          width: '100%',
          px: 2,
          pt: 1,
          pb: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: 'linear-gradient(0deg, rgba(10,5,32,0.95) 70%, transparent 100%)',
        }}
      >
      {isLayoutReady && sideBased && (
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            width: '100%',
            maxWidth: 520,
            justifyContent: 'center',
          }}
        >
          <Button
            variant="contained"
            disabled={disabled}
            onClick={() => onResponse('left')}
            sx={{
              flex: 1,
              py: 2,
              fontSize: 16,
              fontWeight: 800,
              bgcolor: btnColors.left,
              borderRadius: 3,
              boxShadow: `0 4px 16px ${btnColors.left}55`,
              '&:hover': {
                bgcolor: btnColors.leftHover,
                transform: 'translateY(-2px)',
                boxShadow: `0 6px 20px ${btnColors.left}77`,
              },
              '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
              transition: 'all 0.2s ease',
            }}
          >
            ← {COPY.tapLeft}
          </Button>

          <Button
            variant="contained"
            disabled={disabled}
            onClick={() => onResponse('right')}
            sx={{
              flex: 1,
              py: 2,
              fontSize: 16,
              fontWeight: 800,
              bgcolor: btnColors.right,
              borderRadius: 3,
              boxShadow: `0 4px 16px ${btnColors.right}55`,
              '&:hover': {
                bgcolor: btnColors.rightHover,
                transform: 'translateY(-2px)',
                boxShadow: `0 6px 20px ${btnColors.right}77`,
              },
              '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
              transition: 'all 0.2s ease',
            }}
          >
            {COPY.tapRight} →
          </Button>
        </Box>
      )}

      {/* Orientation MCQ buttons — orientation_id + delayed_match (recall phase) */}
      {isLayoutReady &&
        (gaborMode === 'orientation_id' || gaborMode === 'delayed_match') &&
        optionsDeg.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              gap: 1,
              width: '100%',
              maxWidth: 560,
            }}
          >
            {optionsDeg.map((deg, idx) => (
              <Button
                key={deg}
                variant="contained"
                disabled={disabled || (gaborMode === 'delayed_match' && !recallPhase)}
                onClick={() => onResponse({ index: idx, orientationDeg: deg })}
                startIcon={<StripeIcon deg={deg} />}
                sx={{
                  minWidth: 0,
                  py: 1.25,
                  px: 1,
                  fontSize: { xs: 13, sm: 15 },
                  fontWeight: 800,
                  bgcolor: btnColors.left,
                  borderRadius: 3,
                  boxShadow: `0 4px 16px ${btnColors.left}55`,
                  '&:hover': {
                    bgcolor: btnColors.leftHover,
                    transform: 'translateY(-2px)',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.25)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {orientationLabel(deg)}
              </Button>
            ))}
          </Box>
        )}

      {/* Vernier direction MCQ — offset_direction_mcq + delayed_direction (recall) */}
      {isLayoutReady &&
        world === 'vernier' &&
        (vernierMode === 'offset_direction_mcq' || vernierMode === 'delayed_direction') && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 1,
              width: '100%',
              maxWidth: 420,
            }}
          >
            <Button
              variant="contained"
              disabled={disabled || (vernierMode === 'delayed_direction' && !recallPhase)}
              onClick={() => onResponse({ index: 0 })}
              sx={{
                py: 1.5,
                fontSize: 16,
                fontWeight: 800,
                bgcolor: btnColors.left,
                borderRadius: 3,
                boxShadow: `0 4px 16px ${btnColors.left}55`,
                '&:hover': { bgcolor: btnColors.leftHover, transform: 'translateY(-2px)' },
                '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
                transition: 'all 0.2s ease',
              }}
            >
              {COPY.vernierOffsetLeft}
            </Button>
            <Button
              variant="contained"
              disabled={disabled || (vernierMode === 'delayed_direction' && !recallPhase)}
              onClick={() => onResponse({ index: 1 })}
              sx={{
                py: 1.5,
                fontSize: 16,
                fontWeight: 800,
                bgcolor: btnColors.right,
                borderRadius: 3,
                boxShadow: `0 4px 16px ${btnColors.right}55`,
                '&:hover': { bgcolor: btnColors.rightHover, transform: 'translateY(-2px)' },
                '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
                transition: 'all 0.2s ease',
              }}
            >
              {COPY.vernierOffsetRight}
            </Button>
          </Box>
        )}

      {/* Crowding letter MCQ — central_letter_id + delayed_letter (recall phase) */}
      {isLayoutReady &&
        world === 'crowding' &&
        (crowdingMode === 'central_letter_id' || crowdingMode === 'delayed_letter') &&
        optionsLetters.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              gap: 1,
              width: '100%',
              maxWidth: 560,
            }}
          >
            {optionsLetters.map((letter, idx) => (
              <Button
                key={`${letter}-${idx}`}
                variant="contained"
                disabled={disabled || (crowdingMode === 'delayed_letter' && !recallPhase)}
                onClick={() => onResponse({ index: idx })}
                sx={{
                  minWidth: 0,
                  py: 1.25,
                  px: 1,
                  fontSize: { xs: 20, sm: 24 },
                  fontWeight: 800,
                  fontFamily: 'inherit',
                  bgcolor: btnColors.left,
                  borderRadius: 3,
                  boxShadow: `0 4px 16px ${btnColors.left}55`,
                  '&:hover': { bgcolor: btnColors.leftHover, transform: 'translateY(-2px)' },
                  '&:disabled': {
                    bgcolor: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.25)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {letter}
              </Button>
            ))}
          </Box>
        )}

      {/* Crowding flanker same/different MCQ */}
      {isLayoutReady && world === 'crowding' && crowdingMode === 'flanker_same_different' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1,
            width: '100%',
            maxWidth: 420,
          }}
        >
          <Button
            variant="contained"
            disabled={disabled}
            onClick={() => onResponse({ index: 0 })}
            sx={{
              py: 1.5,
              fontSize: 16,
              fontWeight: 800,
              bgcolor: btnColors.left,
              borderRadius: 3,
              boxShadow: `0 4px 16px ${btnColors.left}55`,
              '&:hover': { bgcolor: btnColors.leftHover, transform: 'translateY(-2px)' },
              '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
              transition: 'all 0.2s ease',
            }}
          >
            {COPY.crowdingSameLabel}
          </Button>
          <Button
            variant="contained"
            disabled={disabled}
            onClick={() => onResponse({ index: 1 })}
            sx={{
              py: 1.5,
              fontSize: 16,
              fontWeight: 800,
              bgcolor: btnColors.right,
              borderRadius: 3,
              boxShadow: `0 4px 16px ${btnColors.right}55`,
              '&:hover': { bgcolor: btnColors.rightHover, transform: 'translateY(-2px)' },
              '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
              transition: 'all 0.2s ease',
            }}
          >
            {COPY.crowdingDifferentLabel}
          </Button>
        </Box>
      )}

      {/* Stereopsis MCQ — shape_id */}
      {isLayoutReady && world === 'stereopsis' && stereopsisMode === 'shape_id' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: optionShapeIds.length <= 4 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              sm: optionShapeIds.length <= 4 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            },
            gap: 1,
            width: '100%',
            maxWidth: optionShapeIds.length <= 4 ? 400 : 560,
          }}
        >
          {optionShapeIds.map((shapeId, idx) => (
            <Button
              key={`${shapeId}-${idx}`}
              variant="contained"
              disabled={disabled}
              onClick={() => onResponse({ index: idx })}
              sx={{
                minWidth: 0,
                py: 1.25,
                fontSize: { xs: 13, sm: 15 },
                fontWeight: 800,
                bgcolor: btnColors.left,
                borderRadius: 3,
                boxShadow: `0 4px 16px ${btnColors.left}55`,
                '&:hover': { bgcolor: btnColors.leftHover, transform: 'translateY(-2px)' },
                '&:disabled': {
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.25)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Box component="span" sx={{ fontSize: 20, mr: 0.75 }}>
                {STEREOPSIS_SHAPE_ICONS[shapeId] ?? '◆'}
              </Box>
              {STEREOPSIS_SHAPE_LABELS[shapeId] ?? shapeId}
            </Button>
          ))}
        </Box>
      )}

      {/* Stereopsis MCQ — float_position */}
      {isLayoutReady && world === 'stereopsis' && stereopsisMode === 'float_position' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)' },
            gap: 1,
            width: '100%',
            maxWidth: 560,
          }}
        >
          {Array.from({ length: stereopsisPositionCount }, (_, idx) => (
            <Button
              key={idx}
              variant="contained"
              disabled={disabled}
              onClick={() => onResponse({ index: idx })}
              sx={{
                minWidth: 0,
                py: 1.25,
                fontSize: 14,
                fontWeight: 800,
                bgcolor: btnColors.left,
                borderRadius: 3,
                boxShadow: `0 4px 16px ${btnColors.left}55`,
                '&:hover': { bgcolor: btnColors.leftHover, transform: 'translateY(-2px)' },
                '&:disabled': {
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.25)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {STEREOPSIS_POSITION_LABELS[idx] ?? `Ô ${idx + 1}`}
            </Button>
          ))}
        </Box>
      )}

      {/* Stereopsis MCQ — digit_id */}
      {isLayoutReady && world === 'stereopsis' && stereopsisMode === 'digit_id' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 1,
            width: '100%',
            maxWidth: 360,
          }}
        >
          {optionDigits.map((digit, idx) => (
            <Button
              key={`${digit}-${idx}`}
              variant="contained"
              disabled={disabled}
              onClick={() => onResponse({ index: idx })}
              sx={{
                minWidth: 0,
                py: 1.25,
                fontSize: { xs: 18, sm: 22 },
                fontWeight: 800,
                bgcolor: btnColors.left,
                borderRadius: 3,
                boxShadow: `0 4px 16px ${btnColors.left}55`,
                '&:hover': { bgcolor: btnColors.leftHover, transform: 'translateY(-2px)' },
                '&:disabled': {
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.25)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {digit}
            </Button>
          ))}
        </Box>
      )}

      {/* Confirm button — match-cards mode */}
      {isLayoutReady && gaborMode === 'orientation_match' && (
        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
          <Button
            variant="contained"
            disabled={disabled || selectedCards.length !== 2}
            onClick={() => onResponse({ indices: selectedCards })}
            sx={{
              minWidth: 220,
              py: 1.5,
              fontSize: 16,
              fontWeight: 800,
              bgcolor: btnColors.right,
              borderRadius: 3,
              boxShadow: `0 4px 16px ${btnColors.right}55`,
              '&:hover': { bgcolor: btnColors.rightHover, transform: 'translateY(-2px)' },
              '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
              transition: 'all 0.2s ease',
            }}
          >
            {COPY.confirmSelection} ({selectedCards.length}/2)
          </Button>
        </Box>
      )}
      </Box>
    </Box>
  );
};

export default TrialScreen;
