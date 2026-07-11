/**
 * VT Quest — Portal Exercise Component
 *
 * Implements PortalExerciseProps lifecycle (start → pause → complete)
 * matching the pattern of Game2048Exercise.tsx.
 *
 * Architecture:
 *   - All API calls here (start/pause/complete via patient.service)
 *   - useVtQuestEngine owns game state (screen, trials, staircase)
 *   - Child screens (WorldMap, Trial, StageResult) receive engine callbacks
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import { useBlocker, useNavigate } from 'react-router-dom';
import useAuth from 'src/contexts/authGuard/useAuth';
import useSnackbar from 'src/contexts/UseSnackbar';
import useFreshPatientExamResults from 'src/hooks/useFreshPatientExamResults';
import {
  startExercise,
  pauseExercise,
  completeExercise,
  trackInactivity,
} from 'src/services/patient.service';
import { getErrorMessage } from 'src/utils/errorHandler';
import {
  getEffectiveExerciseDurationMs,
  getInactivityThresholdMs,
} from 'src/utils/exerciseDuration';
import { hasExerciseVisionLevel } from 'src/utils/exerciseVisionPrerequisites';
import { resolveExerciseStartVisionLevel } from 'src/utils/exerciseDifficultyBaseline';
import {
  checkVtQuestScreenRequirements,
  computeVtVisionSizing,
  parseExerciseDistanceM,
  resolveGaborStartContrast,
  resolveStimulusStartContrastPercent,
  resolveVtExerciseVision,
} from '../core/vtVisionSizing';
import ExitConfirmationDialog from 'src/components/exercises/portal/ExitConfirmationDialog';
import StopTrainingDialog from 'src/components/exercises/portal/StopTrainingDialog';
import ExerciseCompletionDialog from 'src/components/exercises/portal/ExerciseCompletionDialog';
import ExerciseVisionRequiredAlert from 'src/features/portal/views/exerciseResult/components/ExerciseVisionRequiredAlert';
import type { PortalExerciseProps } from 'src/components/exercises/portal/types';
import type {
  VtSettings,
  VtResultMetrics,
  VtPauseSnapshot,
  VtGaborTaskMode,
  VtVernierTaskMode,
  VtCrowdingTaskMode,
  VtStereopsisTaskMode,
  VtWorld,
} from 'src/types/core/vtQuest';
import {
  getVtModalityFromExerciseType,
  resolveVtExerciseTypeFromAssignment,
  resolveVtSettingsForExerciseType,
  type VtQuestFamilyExerciseType,
} from '../core/vtExerciseTypes';
import { getGaborTaskModeFromTrial } from '../core/gaborTaskModes';
import { getVernierTaskModeFromTrial } from '../core/vernierTaskModes';
import { getCrowdingTaskModeFromTrial } from '../core/crowdingTaskModes';
import { getStereopsisTaskModeFromTrial } from '../core/stereopsisTaskModes';
import { normalizeExerciseType } from 'src/components/exercises/registry';
import { parseVtPauseSnapshot } from '../core/vtPauseSnapshot';
import { useVtQuestEngine } from 'src/hooks/exercises/useVtQuestEngine';
import { useDichopticSessionConfig } from 'src/hooks/exercises/useDichopticSessionConfig';
import { useAutoInstructionAudioQueue } from 'src/hooks/useInstructionAudioPlayback';
import {
  getVtStageIntroAudioId,
} from 'src/utils/audio/instructionAudioResolver';
import { useExerciseFullscreen } from 'src/hooks/useExerciseFullscreen';
import { getWorldInfo } from '../gamification/worldMap';
import BoltIcon from '@mui/icons-material/Bolt';
import { Chip } from '@mui/material';
import planetGaborImg from 'src/assets/vt-quest/planets/planet-gabor.png';
import planetVernierImg from 'src/assets/vt-quest/planets/planet-vernier.png';
import planetCrowdingImg from 'src/assets/vt-quest/planets/planet-crowding.png';
import WorldMapScreen from './components/WorldMapScreen';
import TrialScreen from './components/TrialScreen';
import StageResultOverlay from './components/StageResultOverlay';
import QuestHud from './components/QuestHud';
import { COPY } from '../gamification/copy.vi';
import { useTrialFeedback } from '../gamification/useTrialFeedback';
import {
  useTrialResponseTimeout,
} from '../gamification/useTrialResponseTimeout';
import {
  fetchColorSchemePresets,
  resolveExerciseColorScheme,
} from 'src/services/colorPreset.service';

const VT_PLANET_IMGS: Partial<Record<VtWorld, string>> = {
  gabor: planetGaborImg,
  vernier: planetVernierImg,
  crowding: planetCrowdingImg,
};

const VtQuestExercise: React.FC<PortalExerciseProps> = ({
  assignmentId,
  sessionId,
  screenParams,
  assignment,
  sandboxMode = false,
  unlockAllWorlds = false,
  sandboxSettings,
  onSandboxExit,
}) => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { examResults: freshExamResults } = useFreshPatientExamResults();

  const patient = user?.patient;
  const exerciseConfig = useMemo(() => assignment?.exerciseConfig, [assignment]);
  const exerciseType = resolveVtExerciseTypeFromAssignment(assignment);
  const fixedModality = useMemo(
    () => getVtModalityFromExerciseType(exerciseType),
    [exerciseType]
  );
  const singleModalityMode = fixedModality != null;
  const patientExamResults = freshExamResults ?? (patient as any)?.examResults;

  // --- Lifecycle state ---
  const [isLoading, setIsLoading] = useState(true);
  const [currentResultId, setCurrentResultId] = useState<number | null>(null);
  const currentResultIdRef = useRef<number | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const sessionStartTimeRef = useRef<number | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trialEaseHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTriggeredRef = useRef(false);
  const completionInFlightRef = useRef(false);
  const [showTrialEaseHint, setShowTrialEaseHint] = useState(false);
  const fullscreenRootRef = useRef<HTMLDivElement>(null);

  useExerciseFullscreen(fullscreenRootRef, !isLoading);

  useEffect(() => {
    currentResultIdRef.current = currentResultId;
  }, [currentResultId]);

  const [colorPresetsReady, setColorPresetsReady] = useState(0);
  useEffect(() => {
    void fetchColorSchemePresets().then(() => setColorPresetsReady((n) => n + 1));
  }, []);

  const resolvedColorScheme = useMemo(
    () => resolveExerciseColorScheme(exerciseConfig?.colorScheme ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exerciseConfig?.colorScheme, colorPresetsReady]
  );

  // --- Vision ---
  const visionType = exerciseConfig?.visionType;

  const vtVisionInput = useMemo(
    () => ({
      levelOverride: assignment?.levelOverride,
      visionLevel: assignment?.visionLevel,
      visionType,
      trainingEye: assignment?.trainingEye,
      configEye: exerciseConfig?.eye,
      examResults: patientExamResults,
      startVisionLevel: resolveExerciseStartVisionLevel({
        difficultyBaselineSource: exerciseConfig?.difficultyBaselineSource,
        levelOverride: assignment?.levelOverride,
        visionLevel: assignment?.visionLevel,
        visionType,
        trainingEye: assignment?.trainingEye,
        configEye: exerciseConfig?.eye,
        examResults: patientExamResults,
        lastAchievedVisionLevel: assignment?.lastAchievedVisionLevel,
      }),
    }),
    [
      assignment?.levelOverride,
      assignment?.visionLevel,
      assignment?.lastAchievedVisionLevel,
      assignment?.trainingEye,
      exerciseConfig?.difficultyBaselineSource,
      exerciseConfig?.eye,
      visionType,
      patientExamResults,
    ]
  );

  const canDetermineVisionLevel = useMemo(
    () =>
      sandboxMode ||
      hasExerciseVisionLevel({
        levelOverride: assignment?.levelOverride,
        visionLevel: assignment?.visionLevel,
        visionType,
        trainingEye: assignment?.trainingEye,
        configEye: exerciseConfig?.eye,
        examResults: patientExamResults,
      }),
    [assignment, patientExamResults, visionType, sandboxMode]
  );

  const distanceM = useMemo(
    () => parseExerciseDistanceM(exerciseConfig?.distance),
    [exerciseConfig?.distance]
  );

  const gaborStartContrast = useMemo(
    () => resolveGaborStartContrast(vtVisionInput),
    [vtVisionInput]
  );

  const vtVisionSizing = useMemo(() => {
    const resolved = resolveVtExerciseVision(vtVisionInput);
    if (!resolved || distanceM == null) return null;
    try {
      return {
        ...computeVtVisionSizing({
          screenInfo: screenParams,
          distanceM,
          visionType: resolved.sizeVisionType,
          visionLevel: resolved.sizeVisionLevel,
          stimulusContrastPercent: resolveStimulusStartContrastPercent(vtVisionInput),
          exerciseVisionType: visionType ?? resolved.visionType,
          gaborStartContrast,
        }),
        sizeVisionLevel: resolved.sizeVisionLevel,
      };
    } catch (err) {
      console.error('VT vision sizing failed:', err);
      return null;
    }
  }, [vtVisionInput, distanceM, screenParams, gaborStartContrast, visionType]);

  // Merge vtSettings from config with defaults; single-modality types lock to one world
  const vtSettings: VtSettings = useMemo(() => {
    const raw = (exerciseConfig as any)?.vtSettings;
    const resolved = resolveVtSettingsForExerciseType(exerciseType, raw);
    return sandboxSettings ? { ...resolved, ...sandboxSettings } : resolved;
  }, [exerciseConfig, exerciseType, sandboxSettings]);

  const vtScreenCheck = useMemo(() => {
    const resolved = resolveVtExerciseVision(vtVisionInput);
    if (!resolved || distanceM == null) return null;
    try {
      return checkVtQuestScreenRequirements({
        screenInfo: screenParams,
        distanceM,
        visionType: resolved.sizeVisionType,
        visionLevel: resolved.sizeVisionLevel,
        vtSettings,
        colorScheme: exerciseConfig?.colorScheme ?? null,
        exerciseVisionType: visionType ?? resolved.visionType,
      });
    } catch {
      return null;
    }
  }, [vtVisionInput, distanceM, screenParams, vtSettings, exerciseConfig?.colorScheme, visionType]);

  // --- Engine ---
  const {
    engineState,
    openWorldMap,
    selectWorld,
    startStage,
    submitResponse,
    handleTrialTimeout,
    continueAfterStage,
    forceComplete,
    serializeForPause,
    restoreFromSnapshot,
  } = useVtQuestEngine({
    settings: vtSettings,
    initialWorld: fixedModality ?? vtSettings.modalities[0] ?? 'gabor',
    singleModality: fixedModality ?? undefined,
    staircaseContext: { gaborStartContrast },
  });

  const { dichopticConfig: sessionDichoptic, tryAdvanceOnAccuracy } = useDichopticSessionConfig(
    exerciseConfig?.dichoptic
  );
  const lastAutoBalanceStageRef = useRef<string | null>(null);

  useEffect(() => {
    const result = engineState.lastStageResult;
    if (!result) return;
    const stageKey = `${result.world}-${result.stageIndex}`;
    if (lastAutoBalanceStageRef.current === stageKey) return;
    lastAutoBalanceStageRef.current = stageKey;
    tryAdvanceOnAccuracy(result.accuracy);
  }, [engineState.lastStageResult, tryAdvanceOnAccuracy]);

  const enableFeedbackSound = vtSettings.gamification?.enableSound !== false;

  const stageIntroAudioIds = useMemo(() => {
    if (engineState.screen !== 'stage-intro') return [];

    const stageNum = engineState.session.stageIndex + 1;
    const sampleIds = [getVtStageIntroAudioId(stageNum)];
    if (engineState.isBossStage) {
      sampleIds.push('vt_boss');
    }
    if (engineState.session.currentWorld === 'stereopsis') {
      sampleIds.unshift('vt_stereo_glasses');
    }
    return sampleIds;
  }, [
    engineState.screen,
    engineState.session.stageIndex,
    engineState.session.currentWorld,
    engineState.isBossStage,
  ]);

  useAutoInstructionAudioQueue(stageIntroAudioIds, {
    lang: 'vi',
    dedupeKey:
      stageIntroAudioIds.length > 0
        ? `vt-stage-intro:${engineState.session.stageIndex}:${engineState.isBossStage}:${engineState.session.currentWorld}`
        : undefined,
    enabled: stageIntroAudioIds.length > 0,
  });

  const { handleTrialResponse, feedback, responseBlocked } = useTrialFeedback(submitResponse, {
    currentTrial: engineState.currentTrial,
    currentCombo: engineState.session.currentCombo,
    enableSound: enableFeedbackSound,
  });


  // --- Duration countdown ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (sandboxMode || !sessionStartTimeRef.current || !exerciseConfig?.duration) return;
    const limitMs = getEffectiveExerciseDurationMs(exerciseConfig?.duration);
    if (limitMs === null) return;
    const elapsed = currentTime - sessionStartTimeRef.current;
    const remaining = Math.max(0, limitMs - elapsed);
    setTimeRemaining(remaining);

    if (remaining === 0 && !timeoutTriggeredRef.current) {
      timeoutTriggeredRef.current = true;
      void handleTimeoutComplete();
    }
  }, [currentTime, exerciseConfig]);

  const inactivityThresholdMs = useMemo(
    () => getInactivityThresholdMs(exerciseConfig),
    [exerciseConfig]
  );

  // --- Inactivity tracking ---
  const resetInactivityTimer = useCallback(() => {
    if (sandboxMode) return;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      const resultId = currentResultIdRef.current;
      if (resultId != null) {
        void trackInactivity(assignmentId, sessionId, resultId).catch(() => {});
      }
      resetInactivityTimer();
    }, inactivityThresholdMs);
  }, [assignmentId, sessionId, inactivityThresholdMs, sandboxMode]);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  const trialTimeoutKey = useMemo(() => {
    const trial = engineState.currentTrial;
    if (!trial) return null;
    return `${trial.trialIndex}-${trial.difficultyValue}-${trial.signalSide}-${JSON.stringify(trial.meta ?? {})}`;
  }, [engineState.currentTrial]);

  useTrialResponseTimeout({
    timeoutMs: inactivityThresholdMs,
    active:
      engineState.screen === 'trial' &&
      engineState.isPendingResponse &&
      engineState.stimulusVisible &&
      !responseBlocked,
    trialKey: trialTimeoutKey,
    onTimeout: () => {
      resetInactivityTimer();
      handleTrialTimeout();
      setShowTrialEaseHint(true);
      if (trialEaseHintTimerRef.current) clearTimeout(trialEaseHintTimerRef.current);
      trialEaseHintTimerRef.current = setTimeout(() => setShowTrialEaseHint(false), 2000);
    },
  });

  useEffect(
    () => () => {
      if (trialEaseHintTimerRef.current) clearTimeout(trialEaseHintTimerRef.current);
    },
    []
  );

  const beginSession = useCallback(() => {
    if (fixedModality) {
      selectWorld(fixedModality);
      const delay = sandboxMode ? 0 : 800;
      setTimeout(startStage, delay);
      return;
    }
    openWorldMap();
  }, [fixedModality, selectWorld, startStage, openWorldMap, sandboxMode]);

  // --- Start exercise on mount ---
  const startExerciseResult = useCallback(async () => {
    if (sandboxMode) {
      setIsLoading(false);
      sessionStartTimeRef.current = Date.now();
      const limitMs = getEffectiveExerciseDurationMs(exerciseConfig?.duration ?? 30);
      if (limitMs != null) setTimeRemaining(limitMs);
      beginSession();
      return;
    }

    try {
      setIsLoading(true);
      timeoutTriggeredRef.current = false;

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      const resp = await startExercise(assignmentId, sessionId);
      const { action, result, reason } = resp;

      if (action === 'blocked') {
        showSnackbar(reason ?? 'Không thể bắt đầu bài tập', 'error' as any);
        navigate(-1);
        return;
      }

      const resultId = result?.id;
      if (!resultId) throw new Error('No result ID');

      setCurrentResultId(resultId);

      if (action === 'resume') {
        showSnackbar('Tiếp tục từ lần chơi trước', 'info');
      } else if (
        action === 'continue' &&
        ((result.score ?? 0) > 0 || (result.movesCount ?? 0) > 0)
      ) {
        showSnackbar(
          'Không tìm thấy trạng thái đã lưu. Hãy dùng nút Tạm dừng trước khi rời bài tập.',
          'warning'
        );
      }

      const resumeSnapshot: VtPauseSnapshot | null =
        action === 'resume' && result.exerciseState
          ? parseVtPauseSnapshot(result.exerciseState)
          : null;

      if (action === 'resume' && result.exerciseState && !resumeSnapshot) {
        showSnackbar('Không thể khôi phục trạng thái, bắt đầu lại từ bản đồ', 'warning');
      }

      const elapsedSec =
        action === 'resume' || action === 'continue' ? result.duration || 0 : 0;
      sessionStartTimeRef.current = Date.now() - elapsedSec * 1000;
      setCurrentTime(Date.now());

      const limitMs = getEffectiveExerciseDurationMs(exerciseConfig?.duration);
      if (limitMs != null) {
        setTimeRemaining(Math.max(0, limitMs - elapsedSec * 1000));
      }

      if (resumeSnapshot) {
        restoreFromSnapshot(resumeSnapshot);
      } else {
        beginSession();
      }

      resetInactivityTimer();
      setIsLoading(false);
    } catch {
      showSnackbar('Không thể bắt đầu bài tập. Vui lòng thử lại.');
      navigate(-1);
    }
  }, [
    assignmentId,
    sessionId,
    beginSession,
    restoreFromSnapshot,
    resetInactivityTimer,
    showSnackbar,
    navigate,
    sandboxMode,
    exerciseConfig?.duration,
  ]);

  useEffect(() => {
    if (sandboxMode) {
      void startExerciseResult();
      return;
    }
    if (assignment) void startExerciseResult();
  }, [assignment, sandboxMode]);

  // --- Build metrics ---
  const buildMetrics = useCallback(() => {
    const { session } = engineState;
    const stages = session.completedStages;
    const totalTrials = stages.reduce((sum, s) => sum + s.trials.length, 0);
    const totalCorrect = stages.reduce(
      (sum, s) => sum + s.trials.filter((t) => t.correct).length,
      0
    );
    const accuracy = totalTrials > 0 ? totalCorrect / totalTrials : 0;
    const durationSec = sessionStartTimeRef.current
      ? Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
      : 0;
    const score = session.totalStars * 100 + session.totalCoins;

    const worlds: VtResultMetrics['worlds'] = {};
    for (const stage of stages) {
      const existing = worlds[stage.world];
      if (!existing) {
        worlds[stage.world] = {
          threshold: stage.threshold,
          unit:
            stage.world === 'gabor'
              ? 'contrastPercent'
              : stage.world === 'vernier' || stage.world === 'stereopsis'
                ? 'arcsec'
                : 'spacingRatio',
          trials: stage.trials.length,
          accuracy: stage.accuracy,
        };
      } else {
        // Average across stages for same world
        const n = existing.trials + stage.trials.length;
        worlds[stage.world] = {
          ...existing,
          threshold: stage.threshold ?? existing.threshold,
          trials: n,
          accuracy: (existing.accuracy * existing.trials + stage.accuracy * stage.trials.length) / n,
        };
      }
    }

    // Record which gabor task modes were exercised (legacy 2AFC leaves this absent)
    if (worlds.gabor) {
      const modes = new Set<string>();
      for (const stage of stages) {
        if (stage.world !== 'gabor') continue;
        for (const trial of stage.trials) {
          modes.add(getGaborTaskModeFromTrial(trial));
        }
      }
      if (modes.size > 0 && !(modes.size === 1 && modes.has('location_2afc'))) {
        worlds.gabor.taskModes = Array.from(modes) as VtGaborTaskMode[];
      }
    }

    if (worlds.vernier) {
      const modes = new Set<string>();
      for (const stage of stages) {
        if (stage.world !== 'vernier') continue;
        for (const trial of stage.trials) {
          modes.add(getVernierTaskModeFromTrial(trial));
        }
      }
      if (modes.size > 0 && !(modes.size === 1 && modes.has('alignment_2afc'))) {
        worlds.vernier.vernierTaskModes = Array.from(modes) as VtVernierTaskMode[];
      }
    }

    if (worlds.crowding) {
      const modes = new Set<string>();
      for (const stage of stages) {
        if (stage.world !== 'crowding') continue;
        for (const trial of stage.trials) {
          modes.add(getCrowdingTaskModeFromTrial(trial));
        }
      }
      if (modes.size > 0 && !(modes.size === 1 && modes.has('location_2afc'))) {
        worlds.crowding.crowdingTaskModes = Array.from(modes) as VtCrowdingTaskMode[];
      }
    }

    if (worlds.stereopsis) {
      const modes = new Set<string>();
      for (const stage of stages) {
        if (stage.world !== 'stereopsis') continue;
        for (const trial of stage.trials) {
          modes.add(getStereopsisTaskModeFromTrial(trial));
        }
      }
      if (modes.size > 0) {
        worlds.stereopsis.stereopsisTaskModes = Array.from(modes) as VtStereopsisTaskMode[];
      }
    }

    const normalizedType = normalizeExerciseType(exerciseType ?? 'vt-quest');
    const exerciseKind = (
      ['vt-quest', 'vt-gabor', 'vt-vernier', 'vt-crowding', 'vt-stereopsis'] as const
    ).includes(normalizedType as VtQuestFamilyExerciseType)
      ? (normalizedType as VtQuestFamilyExerciseType)
      : 'vt-quest';

    const resultMetrics: VtResultMetrics = {
      exerciseKind,
      worlds,
      sessionSummary: {
        totalTrials,
        totalStars: session.totalStars,
        coinsEarned: session.totalCoins,
        stagesCompleted: stages.length,
      },
      // Record the starting vision level as the peak for this execution.
      // VT Quest does not dynamically change the stimulus level mid-session;
      // the level at session start equals the highest level exercised.
      peakVisionLevel: vtVisionSizing?.sizeVisionLevel ?? null,
    };

    return { score, duration: durationSec, movesCount: totalTrials, accuracy, resultMetrics };
  }, [engineState, exerciseType, vtVisionSizing]);

  // --- Complete ---
  const handleExitToPortal = useCallback(() => {
    if (sandboxMode) {
      onSandboxExit?.();
      return;
    }
    navigate('/portal/exercises');
  }, [navigate, sandboxMode, onSandboxExit]);

  const handleCompleteExercise = useCallback(async () => {
    if (completionInFlightRef.current || showCompletionDialog) return;
    completionInFlightRef.current = true;

    if (sandboxMode) {
      setSessionSaved(true);
      setShowCompletionDialog(true);
      return;
    }
    const resultId = currentResultIdRef.current;
    if (!resultId) {
      completionInFlightRef.current = false;
      setSessionSaved(false);
      return;
    }
    const metrics = buildMetrics();
    setIsCompletingSession(true);
    try {
      await completeExercise(assignmentId, sessionId, resultId, {
        score: metrics.score,
        duration: metrics.duration,
        movesCount: metrics.movesCount,
        accuracy: metrics.accuracy,
        resultMetrics: metrics.resultMetrics as unknown as Record<string, unknown>,
      });
      setSessionSaved(true);
      setShowCompletionDialog(true);
    } catch {
      completionInFlightRef.current = false;
      setSessionSaved(false);
      showSnackbar(
        'Không lưu được kết quả. Bạn vẫn có thể thoát về danh sách bài tập.',
        'warning'
      );
    } finally {
      setIsCompletingSession(false);
    }
  }, [assignmentId, sessionId, buildMetrics, showSnackbar, sandboxMode, showCompletionDialog]);

  const handleTimeoutComplete = useCallback(async () => {
    forceComplete();
    await handleCompleteExercise();
  }, [forceComplete, handleCompleteExercise]);

  const handleStopConfirm = useCallback(async () => {
    setShowStopDialog(false);
    timeoutTriggeredRef.current = true;
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    forceComplete();
    await handleCompleteExercise();
    if (!sandboxMode) {
      showSnackbar('Đã dừng tập và lưu kết quả. Lần sau sẽ bắt đầu phiên mới.', 'success');
    }
  }, [forceComplete, handleCompleteExercise, sandboxMode, showSnackbar]);

  const handleStopCancel = useCallback(() => {
    setShowStopDialog(false);
  }, []);

  // --- Pause ---
  const handlePauseExercise = useCallback(async () => {
    if (sandboxMode) return;
    const resultId = currentResultIdRef.current;
    if (!resultId) return;
    const pauseState = serializeForPause();
    const metrics = buildMetrics();
    setIsPausing(true);
    try {
      await pauseExercise(assignmentId, sessionId, resultId, {
        exerciseState: pauseState as unknown as Record<string, unknown>,
        score: metrics.score,
        duration: metrics.duration,
        movesCount: metrics.movesCount,
        accuracy: metrics.accuracy,
      });
      showSnackbar('Đã tạm dừng — bạn có thể tiếp tục từ đúng chỗ khi quay lại', 'success');
    } catch (error) {
      showSnackbar(
        getErrorMessage(error, 'Không thể tạm dừng bài tập'),
        'error'
      );
      throw error;
    } finally {
      setIsPausing(false);
    }
  }, [assignmentId, sessionId, buildMetrics, serializeForPause, showSnackbar, sandboxMode]);

  const handlePauseRequest = useCallback(() => {
    setShowExitDialog(true);
  }, []);

  const handleStopRequest = useCallback(() => {
    setShowStopDialog(true);
  }, []);


  // --- Navigation blocker ---
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !sandboxMode &&
      currentLocation.pathname !== nextLocation.pathname &&
      !showCompletionDialog
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowExitDialog(true);
    }
  }, [blocker.state]);

  const handleExitConfirm = useCallback(async () => {
    setShowExitDialog(false);
    if (sandboxMode) {
      onSandboxExit?.();
      return;
    }
    try {
      await handlePauseExercise();
      if (blocker.state === 'blocked') {
        blocker.proceed();
      } else {
        navigate('/portal/exercises');
      }
    } catch {
      navigate('/portal/exercises');
    }
  }, [handlePauseExercise, blocker, sandboxMode, onSandboxExit, navigate]);

  const handleExitCancel = useCallback(() => {
    setShowExitDialog(false);
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);

  // Auto-complete when engine reaches session-complete
  useEffect(() => {
    if (engineState.screen === 'session-complete' && !showCompletionDialog) {
      void handleCompleteExercise();
    }
  }, [engineState.screen]);

  // --- Vision gate ---
  if (!canDetermineVisionLevel && !isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <ExerciseVisionRequiredAlert />
      </Box>
    );
  }

  if (!isLoading && distanceM == null && !sandboxMode) {
    return (
      <Box
        sx={{
          p: 3,
          color: 'white',
          textAlign: 'center',
          bgcolor: '#0a0520',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box>
          <Box sx={{ fontSize: 20, fontWeight: 700, mb: 1 }}>Thiếu cấu hình khoảng cách</Box>
          <Box sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            Bài tập chưa có khoảng cách xem (m). Vui lòng liên hệ phòng khám để cập nhật cấu hình.
          </Box>
        </Box>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          minHeight: sandboxMode ? 0 : '100vh',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0520',
        }}
      >
        <CircularProgress sx={{ color: '#6C5CE7' }} />
      </Box>
    );
  }

  const screen = engineState.screen;
  const sessionControlsDisabled = isPausing || isCompletingSession;

  return (
    <Box
      ref={fullscreenRootRef}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: sandboxMode ? 0 : '100vh',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#0a0520',
      }}
    >
      {/* HUD (always visible except loading) */}
      {screen !== 'session-complete' && (
        <QuestHud
          session={engineState.session}
          timeRemainingMs={timeRemaining}
          pauseDisabled={sessionControlsDisabled}
          stopDisabled={sessionControlsDisabled}
          onPauseRequest={handlePauseRequest}
          onStopRequest={handleStopRequest}
        />
      )}

      {/* Screens */}
      {screen === 'world-map' && !singleModalityMode && (
        <WorldMapScreen
          session={engineState.session}
          unlockAllWorlds={unlockAllWorlds || sandboxMode}
          bossCycle={vtSettings.stagesPerSession}
          onSelectWorld={(world) => {
            selectWorld(world);
            const delay = sandboxMode ? 0 : 1500;
            setTimeout(startStage, delay);
          }}
        />
      )}

      {screen === 'stage-intro' && (() => {
        const world = engineState.session.currentWorld;
        const worldInfo = getWorldInfo(world);
        const isBoss = (engineState as any).isBossStage as boolean;
        return (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              background: `radial-gradient(ellipse at 50% 40%, ${worldInfo.color}22 0%, #1a0a3c 40%, #0a0520 100%)`,
              cursor: 'pointer',
              userSelect: 'none',
              pt: 8,
              pb: 4,
              gap: 1.5,
            }}
            onClick={startStage}
          >
            {/* Planet image */}
            {VT_PLANET_IMGS[world] ? (
              <Box
                component="img"
                src={VT_PLANET_IMGS[world]}
                alt={worldInfo.label}
                sx={{
                  width: 120,
                  height: 120,
                  objectFit: 'contain',
                  filter: `drop-shadow(0 8px 28px ${worldInfo.color}99)`,
                  animation: 'stage-bounce 1.4s ease-in-out infinite',
                  '@keyframes stage-bounce': {
                    '0%,100%': { transform: 'translateY(0) scale(1)' },
                    '50%': { transform: 'translateY(-18px) scale(1.05)' },
                  },
                }}
              />
            ) : (
              <Box
                sx={{
                  fontSize: 72,
                  lineHeight: 1,
                  filter: `drop-shadow(0 8px 28px ${worldInfo.color}99)`,
                  animation: 'stage-bounce 1.4s ease-in-out infinite',
                  '@keyframes stage-bounce': {
                    '0%,100%': { transform: 'translateY(0) scale(1)' },
                    '50%': { transform: 'translateY(-18px) scale(1.05)' },
                  },
                }}
              >
                {worldInfo.emoji}
              </Box>
            )}

            {world === 'stereopsis' && (
              <Alert
                severity="info"
                sx={{
                  maxWidth: 420,
                  mx: 2,
                  bgcolor: 'rgba(225,112,85,0.12)',
                  color: 'white',
                  border: '1px solid rgba(225,112,85,0.35)',
                  '& .MuiAlert-icon': { color: '#E17055' },
                }}
              >
                {COPY.stereopsisGlassesNote}
              </Alert>
            )}

            {/* World label */}
            <Box sx={{ color: worldInfo.color, fontWeight: 800, fontSize: 18, textShadow: `0 0 16px ${worldInfo.color}` }}>
              {worldInfo.label}
            </Box>

            {/* Stage name */}
            <Box sx={{ color: 'white', fontWeight: 700, fontSize: 22 }}>
              {COPY.stageIntro(engineState.session.stageIndex + 1)}
            </Box>

            {/* Boss chip */}
            {isBoss && (
              <Chip
                icon={<BoltIcon sx={{ color: '#FFD93D !important', fontSize: 15 }} />}
                label={COPY.bossStageWarning}
                sx={{
                  bgcolor: 'rgba(255,165,0,0.15)',
                  border: '1.5px solid #FFD93D',
                  color: '#FFD93D',
                  fontWeight: 800,
                  fontSize: 11,
                  animation: 'pulse-boss 1.1s ease-in-out infinite',
                  '@keyframes pulse-boss': {
                    '0%,100%': { boxShadow: '0 0 6px rgba(255,217,61,0.4)' },
                    '50%': { boxShadow: '0 0 18px rgba(255,217,61,0.9)' },
                  },
                }}
              />
            )}

            <Box sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, mt: 1 }}>
              Chạm để bắt đầu ✨
            </Box>
          </Box>
        );
      })()}

      {screen === 'trial' && distanceM != null && (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <TrialScreen
            engineState={engineState}
            distanceM={distanceM}
            visionSizing={vtVisionSizing}
            colorScheme={resolvedColorScheme}
            dichopticConfig={sessionDichoptic}
            trainingEye={assignment?.trainingEye ?? exerciseConfig?.eye ?? null}
            feedback={feedback}
            responseBlocked={responseBlocked}
            screenRecommendation={vtScreenCheck?.recommendedLabel ?? null}
            showEaseHint={showTrialEaseHint}
            exitDisabled={sessionControlsDisabled}
            onExitRequest={handlePauseRequest}
            onResponse={(side) => {
              resetInactivityTimer();
              handleTrialResponse(side);
            }}
          />
        </Box>
      )}

      {screen === 'stage-result' && engineState.lastStageResult && (
        <>
          {/* Keep trial canvas in background, overlay result */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              background: 'radial-gradient(ellipse at 50% 50%, #1a0a3c 0%, #0a0520 100%)',
            }}
          />
          <StageResultOverlay
            result={engineState.lastStageResult}
            onContinue={continueAfterStage}
          />
        </>
      )}

      {screen === 'session-complete' && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 30%, #1a0a3c 0%, #0a0520 100%)',
            px: 3,
            pb: 4,
          }}
        >
          <Box sx={{ fontSize: 64, mb: 2 }}>🏆</Box>
          <Box sx={{ color: 'white', fontWeight: 800, fontSize: 22, textAlign: 'center' }}>
            {COPY.sessionComplete}
          </Box>
          <Box sx={{ color: '#FFD93D', fontSize: 18, mt: 1 }}>
            {COPY.totalStars(engineState.session.totalStars)}
          </Box>
          <Box sx={{ color: '#4ECDC4', fontSize: 16, mt: 0.5 }}>
            {COPY.totalCoins(engineState.session.totalCoins)}
          </Box>
          <Box
            sx={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 14,
              mt: 2,
              textAlign: 'center',
              maxWidth: 360,
            }}
          >
            {COPY.keepGoing}
          </Box>
          <Button
            variant="contained"
            size="large"
            disabled={isCompletingSession}
            onClick={handleExitToPortal}
            sx={{
              mt: 4,
              px: 4,
              py: 1.25,
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 3,
              bgcolor: '#6C5CE7',
              '&:hover': { bgcolor: '#5a4bd1' },
            }}
          >
            {isCompletingSession ? (
              <>
                <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                Đang lưu kết quả…
              </>
            ) : (
              COPY.exitToExercises
            )}
          </Button>
          {!sessionSaved && !isCompletingSession && !sandboxMode && (
            <Box sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, mt: 1.5 }}>
              Nhấn nút trên để quay về danh sách bài tập.
            </Box>
          )}
        </Box>
      )}

      {/* Dialogs */}
      <ExitConfirmationDialog
        open={showExitDialog}
        onConfirm={handleExitConfirm}
        onClose={handleExitCancel}
        container={fullscreenRootRef.current}
      />

      <StopTrainingDialog
        open={showStopDialog}
        onConfirm={() => void handleStopConfirm()}
        onClose={handleStopCancel}
        confirming={isCompletingSession}
        container={fullscreenRootRef.current}
      />

      <ExerciseCompletionDialog
        open={showCompletionDialog}
        onClose={handleExitToPortal}
        container={fullscreenRootRef.current}
      />

      {sandboxMode && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            zIndex: 30,
            px: 1.5,
            py: 0.75,
            borderRadius: 2,
            bgcolor: 'rgba(255,165,0,0.2)',
            border: '1px solid rgba(255,165,0,0.5)',
            color: '#FFD93D',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          🧪 CHẾ ĐỘ TEST — không lưu kết quả
        </Box>
      )}
    </Box>
  );
};

export default VtQuestExercise;
