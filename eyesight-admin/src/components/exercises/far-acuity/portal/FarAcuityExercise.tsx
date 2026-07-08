/**
 * Far Acuity Exercise — adaptive far vision + contrast training.
 *
 * Letter size starts at the patient's far exam result and contrast starts at 100%.
 * Correct answers decrease contrast; reaching minimum contrast advances letter size.
 * Incorrect answers relax contrast, then size.
 *
 * Session lifecycle mirrors Game2048Exercise (start/pause/complete/timeout/inactivity).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useBlocker, useNavigate } from 'react-router-dom';
import useAuth from 'src/contexts/authGuard/useAuth';
import useSnackbar from 'src/contexts/UseSnackbar';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import ExitConfirmationDialog from 'src/components/exercises/portal/ExitConfirmationDialog';
import ExerciseEndConfirmDialog from 'src/components/exercises/portal/ExerciseEndConfirmDialog';
import ExerciseCompletionDialog from 'src/components/exercises/portal/ExerciseCompletionDialog';
import ExerciseVisionRequiredAlert from 'src/features/portal/views/exerciseResult/components/ExerciseVisionRequiredAlert';
import {
  startExercise,
  pauseExercise,
  completeExercise,
  trackInactivity,
} from 'src/services/patient.service';
import {
  getEffectiveExerciseDurationMs,
  getInactivityThresholdMs,
} from 'src/utils/exerciseDuration';
import {
  resolveAssignmentTrainingEye,
  calculateFarFontSize,
  calculateNearFontSize,
  buildExamDisplayStrategy,
  EXAM_HORIZONTAL_PADDING_PX,
} from 'src/utils/visionUtils';
import { hasExerciseVisionLevel } from 'src/utils/exerciseVisionPrerequisites';
import { resolveExerciseStartVisionLevel } from 'src/utils/exerciseDifficultyBaseline';
import useFreshPatientExamResults from 'src/hooks/useFreshPatientExamResults';
import {
  useFarAcuityEngine,
  getAcuityLevelInfo,
  getContrastLevelInfo,
  FAR_ACUITY_CHAR_COUNT,
  type FarAcuityVisionType,
} from 'src/hooks/exercises/useFarAcuityEngine';
import { resolvePatientExamCharType, type ExamCharType } from 'src/utils/resolvePatientExamCharType';
import type { PortalExerciseProps } from 'src/components/exercises/portal/types';
import { evaluateAnswer } from 'src/utils/examUtils';
import FarAcuityCharTypeStep from './FarAcuityCharTypeStep';
import FarAcuityTestStep from './FarAcuityTestStep';
import FarAcuityRoundFeedbackOverlay from './FarAcuityRoundFeedbackOverlay';
import { useFarAcuityGamification } from '../gamification/useFarAcuityGamification';
import { COPY } from 'src/components/exercises/vt/gamification/copy.vi';
import { isStreakMilestone } from 'src/components/exercises/vt/gamification/rewards';
import { useExerciseFullscreen } from 'src/hooks/useExerciseFullscreen';

interface ExerciseExecution {
  startTime: number;
  completed: boolean;
}

const FarAcuityExercise: React.FC<PortalExerciseProps> = ({
  assignmentId,
  sessionId,
  screenParams,
  assignment,
  sandboxMode,
  onSandboxExit,
}) => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { examResults: freshExamResults, loading: examResultsLoading } = useFreshPatientExamResults();
  const patient = user?.patient;

  const exerciseConfig = useMemo(() => assignment?.exerciseConfig, [assignment]);
  const patientExamResults = freshExamResults ?? (patient as any)?.examResults;

  const trainingVisionType = useMemo((): FarAcuityVisionType => {
    return exerciseConfig?.visionType === 'near' ? 'near' : 'far';
  }, [exerciseConfig?.visionType]);

  const eye = useMemo(
    () =>
      resolveAssignmentTrainingEye({
        trainingEye: assignment?.trainingEye,
        configEye: exerciseConfig?.eye,
      }),
    [assignment?.trainingEye, exerciseConfig?.eye]
  );

  const canDetermineVisionSize = useMemo(
    () =>
      hasExerciseVisionLevel({
        levelOverride: assignment?.levelOverride,
        visionLevel: assignment?.visionLevel,
        visionType: trainingVisionType,
        trainingEye: assignment?.trainingEye,
        configEye: exerciseConfig?.eye,
        examResults: patientExamResults,
      }),
    [assignment, patientExamResults, exerciseConfig?.eye, trainingVisionType]
  );

  // ── charType + setup phase ────────────────────────────────────────────────
  const [setupPhase, setSetupPhase] = useState<'charType' | 'active'>('charType');
  const [charType, setCharType] = useState<ExamCharType>('E');
  const [suggestedCharType, setSuggestedCharType] = useState<ExamCharType | null>(null);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [currentBatchCharIndex, setCurrentBatchCharIndex] = useState(0);
  const [inputValues, setInputValues] = useState<string[]>(() =>
    new Array(FAR_ACUITY_CHAR_COUNT).fill('')
  );
  const [inputFocusKey, setInputFocusKey] = useState(0);

  useEffect(() => {
    if (sandboxMode) return;
    resolvePatientExamCharType()
      .then((resolved) => {
        setSuggestedCharType(resolved);
        setCharType(resolved);
      })
      .catch(() => setCharType('E'));
  }, [sandboxMode]);

  const resetInputState = useCallback(() => {
    setCurrentBatch(0);
    setCurrentBatchCharIndex(0);
    setInputValues(new Array(FAR_ACUITY_CHAR_COUNT).fill(''));
  }, []);

  // ── Session state ─────────────────────────────────────────────────────────
  const executionRef = useRef<ExerciseExecution | null>(null);
  const fullscreenRootRef = useRef<HTMLDivElement>(null);
  const currentResultIdRef = useRef<number | null>(null);
  const timeoutTriggeredRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [currentResultId, setCurrentResultId] = useState<number | null>(null);
  const [isPausing, setIsPausing] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useExerciseFullscreen(fullscreenRootRef, !isLoading);

  useEffect(() => {
    currentResultIdRef.current = currentResultId;
  }, [currentResultId]);

  // ── Engine ────────────────────────────────────────────────────────────────
  const initialAcuityLevel = useMemo(() => {
    return (
      resolveExerciseStartVisionLevel({
        difficultyBaselineSource: exerciseConfig?.difficultyBaselineSource,
        levelOverride: assignment?.levelOverride,
        visionLevel: assignment?.visionLevel,
        visionType: trainingVisionType,
        trainingEye: assignment?.trainingEye,
        configEye: exerciseConfig?.eye,
        examResults: patientExamResults,
        lastAchievedVisionLevel: assignment?.lastAchievedVisionLevel,
      }) ?? 1
    );
  }, [
    exerciseConfig?.difficultyBaselineSource,
    assignment?.levelOverride,
    assignment?.visionLevel,
    assignment?.lastAchievedVisionLevel,
    trainingVisionType,
    assignment?.trainingEye,
    exerciseConfig?.eye,
    patientExamResults,
  ]);

  const engine = useFarAcuityEngine({
    initialFarLevel: initialAcuityLevel ?? 1,
    charType,
    visionType: trainingVisionType,
  });
  const { state, setAnswer, submitRound, allAnswered, serializeForPause, restoreFromSnapshot, resetSession, regenerateLetters } = engine;

  const {
    totalCoins,
    currentCombo,
    maxCombo,
    feedback,
    feedbackBlocked,
    processRound,
    restoreGamification,
    getGamificationSnapshot,
  } = useFarAcuityGamification(true);

  // Far level resolves asynchronously — re-init only before user starts or plays a round
  const roundsPlayedRef = useRef(0);
  roundsPlayedRef.current = state.roundsCompleted;
  const restoredRef = useRef(false);

  const handleCharTypeConfirm = useCallback(() => {
    setSetupPhase('active');
    resetSession({ farLevel: initialAcuityLevel ?? 1, charType });
    resetInputState();
    if (charType === 'A' || charType === 'N') {
      setInputFocusKey((k) => k + 1);
    }
  }, [initialAcuityLevel, charType, resetSession, resetInputState]);

  // ── Visual sizing ─────────────────────────────────────────────────────────
  const distance = useMemo(
    () => parseFloat(String(exerciseConfig?.distance || '3')),
    [exerciseConfig?.distance]
  );

  const fontSizeMm = useMemo(() => {
    const acuityInfo = getAcuityLevelInfo(trainingVisionType, state.farLevel);
    try {
      if (trainingVisionType === 'near' && 'size' in acuityInfo) {
        return calculateNearFontSize(acuityInfo.size, distance);
      }
      if ('n' in acuityInfo) {
        return calculateFarFontSize(acuityInfo.n, distance);
      }
      return 8;
    } catch {
      return 8; // fallback 8mm
    }
  }, [state.farLevel, distance, trainingVisionType]);

  const contrastOpacity = useMemo(() => {
    const info = getContrastLevelInfo(state.contrastLevel);
    return info.contrastPercent / 100;
  }, [state.contrastLevel]);

  const displayStrategy = useMemo(
    () =>
      buildExamDisplayStrategy({
        fontSizeMm,
        screenInfo: screenParams,
        charType,
        viewportWidthPx: typeof window !== 'undefined' ? window.innerWidth : screenParams.screenWidth,
        horizontalPaddingPx: EXAM_HORIZONTAL_PADDING_PX,
        totalChars: FAR_ACUITY_CHAR_COUNT,
      }),
    [fontSizeMm, screenParams, charType]
  );

  const getBatchStart = useCallback(
    (batch: number) => displayStrategy.batches.slice(0, batch).reduce((sum, n) => sum + n, 0),
    [displayStrategy.batches]
  );

  const handleDirectionSelect = useCallback(
    (direction: string) => {
      const batchSize = displayStrategy.batches[currentBatch] ?? FAR_ACUITY_CHAR_COUNT;
      if (currentBatchCharIndex >= batchSize) return;
      const absoluteIndex = getBatchStart(currentBatch) + currentBatchCharIndex;
      setAnswer(absoluteIndex, direction);
      if (currentBatchCharIndex < batchSize - 1) {
        setCurrentBatchCharIndex((i) => i + 1);
      } else if (currentBatch < displayStrategy.numberOfBatches - 1) {
        setCurrentBatch((b) => b + 1);
        setCurrentBatchCharIndex(0);
      }
    },
    [currentBatch, currentBatchCharIndex, displayStrategy, getBatchStart, setAnswer]
  );

  const handleInputChange = useCallback((index: number, value: string) => {
    setInputValues((prev) => {
      const next = [...prev];
      next[index] = value.trim().toUpperCase();
      return next;
    });
  }, []);

  const handleRegenerateLetters = useCallback(() => {
    regenerateLetters();
    resetInputState();
  }, [regenerateLetters, resetInputState]);

  // ── Navigation blocker ────────────────────────────────────────────────────
  const isGameActive = useCallback(() => Boolean(executionRef.current && !executionRef.current.completed), []);

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    Boolean(!sandboxMode && isGameActive() && currentLocation.pathname !== nextLocation.pathname)
  );

  useEffect(() => {
    if (blocker.state === 'blocked') setShowExitDialog(true);
  }, [blocker]);

  // ── Inactivity timer ──────────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (!isGameActive()) return;
    const thresholdMs = getInactivityThresholdMs(exerciseConfig);
    inactivityTimerRef.current = setTimeout(() => {
      if (!isGameActive()) return;
      const resultId = currentResultIdRef.current;
      if (resultId) void trackInactivity(assignmentId, sessionId, resultId);
      resetInactivityTimer();
    }, thresholdMs);
  }, [assignmentId, sessionId, exerciseConfig, isGameActive]);

  const handleConfirmRound = useCallback(async () => {
    if (!isGameActive() || feedbackBlocked) return;

    const isTextCharType = charType === 'A' || charType === 'N';

    if (isTextCharType) {
      const batchStart = getBatchStart(currentBatch);
      const batchSize = displayStrategy.batches[currentBatch] ?? FAR_ACUITY_CHAR_COUNT;
      const batchFilled = Array.from({ length: batchSize }, (_, idx) =>
        Boolean(inputValues[batchStart + idx]?.trim())
      ).every(Boolean);
      if (!batchFilled) return;

      if (currentBatch < displayStrategy.numberOfBatches - 1) {
        flushSync(() => {
          for (let idx = 0; idx < batchSize; idx++) {
            const absoluteIndex = batchStart + idx;
            const value = inputValues[batchStart + idx]?.trim();
            if (value) setAnswer(absoluteIndex, value);
          }
        });
        setCurrentBatch((b) => b + 1);
        setCurrentBatchCharIndex(0);
        setInputFocusKey((k) => k + 1);
        return;
      }
    } else if (!allAnswered) {
      return;
    }

    const pendingAnswers: Array<{ index: number; value: string }> = [];
    const effectiveLetters = state.letters.map((l, i) => {
      if (l.answer !== undefined && l.answer !== '') return l;
      const pending = isTextCharType ? inputValues[i]?.trim().toUpperCase() : '';
      if (pending) {
        pendingAnswers.push({ index: i, value: pending });
        return { ...l, answer: pending };
      }
      return l;
    });

    if (!effectiveLetters.every((l) => l.answer !== undefined && l.answer !== '')) {
      return;
    }

    if (pendingAnswers.length > 0) {
      flushSync(() => {
        pendingAnswers.forEach(({ index, value }) => setAnswer(index, value));
      });
    }

    const evaluated = effectiveLetters.map((l) => evaluateAnswer({ ...l }, 'far'));
    const correctCount = evaluated.filter((l) => l.result).length;
    const passed = correctCount / FAR_ACUITY_CHAR_COUNT > 0.5;

    await processRound(correctCount, passed);
    submitRound();
    resetInputState();
    if (isTextCharType) {
      setInputFocusKey((k) => k + 1);
    }
    resetInactivityTimer();
  }, [
    allAnswered,
    charType,
    currentBatch,
    displayStrategy.batches,
    feedbackBlocked,
    getBatchStart,
    inputValues,
    isGameActive,
    processRound,
    resetInputState,
    resetInactivityTimer,
    setAnswer,
    state.letters,
    submitRound,
  ]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  // ── Metrics builder ───────────────────────────────────────────────────────
  const buildMetrics = useCallback(() => {
    if (!executionRef.current) return null;
    const contrastInfo = getContrastLevelInfo(state.contrastLevel);
    const acuityInfo = getAcuityLevelInfo(trainingVisionType, state.farLevel);
    return {
      score: totalCoins,
      duration: Math.floor((Date.now() - executionRef.current.startTime) / 1000),
      accuracy: state.roundsCompleted > 0 ? 1 : 0,
      resultMetrics: {
        farLevel: state.farLevel,
        contrastLevel: state.contrastLevel,
        logCS: contrastInfo.score,
        snellen: acuityInfo.score,
        visionType: trainingVisionType,
        roundsCompleted: state.roundsCompleted,
        peakFarLevel: state.peakFarLevel,
        peakContrastLevel: state.peakContrastLevel,
        totalCoins,
        maxCombo,
      },
    };
  }, [state, totalCoins, maxCombo, trainingVisionType]);

  // ── Complete exercise ──────────────────────────────────────────────────────
  const completeExerciseResult = useCallback(async (): Promise<boolean> => {
    if (!executionRef.current || executionRef.current.completed) return false;
    if (!sandboxMode && !currentResultIdRef.current) return false;
    executionRef.current.completed = true;
    setIsActive(false);

    const metrics = buildMetrics();
    if (!metrics) return false;

    if (inactivityTimerRef.current) { clearTimeout(inactivityTimerRef.current); inactivityTimerRef.current = null; }

    try {
      if (sandboxMode) return true;
      await completeExercise(assignmentId, sessionId, currentResultIdRef.current as number, metrics);
      return true;
    } catch {
      showSnackbar('Không thể lưu kết quả bài tập', 'error');
      return false;
    }
  }, [assignmentId, sessionId, sandboxMode, buildMetrics, showSnackbar]);

  const handleTimeoutSubmission = useCallback(async () => {
    const success = await completeExerciseResult();
    if (success) setShowCompletionDialog(true);
  }, [completeExerciseResult]);

  useEffect(() => {
    if (!exerciseConfig?.duration || !executionRef.current?.startTime || !isActive) {
      setTimeRemaining(null);
      return;
    }
    const durationMs = getEffectiveExerciseDurationMs(exerciseConfig.duration);
    if (durationMs === null) { setTimeRemaining(null); return; }

    const startTime = executionRef.current.startTime;
    const elapsed = currentTime - startTime;
    const remaining = Math.max(0, durationMs - elapsed);
    setTimeRemaining(remaining);

    if (remaining <= 0 && !timeoutTriggeredRef.current) {
      timeoutTriggeredRef.current = true;
      void handleTimeoutSubmission();
    }
  }, [currentTime, exerciseConfig?.duration, handleTimeoutSubmission, isActive]);

  // ── Pause ──────────────────────────────────────────────────────────────────
  const handlePauseExercise = useCallback(async () => {
    if (!executionRef.current || !currentResultIdRef.current || isPausing || executionRef.current.completed) return;
    setIsPausing(true);
    try {
      const metrics = buildMetrics();
      if (!metrics) return;
      const exerciseState = {
        ...serializeForPause(),
        gamification: getGamificationSnapshot(),
      };
      await pauseExercise(assignmentId, sessionId, currentResultIdRef.current, {
        ...metrics,
        exerciseState,
      });
      showSnackbar('Đã tạm dừng bài tập thành công', 'success');
    } catch {
      showSnackbar('Không thể tạm dừng bài tập', 'error');
      throw new Error('Pause failed');
    } finally {
      setIsPausing(false);
    }
  }, [assignmentId, sessionId, isPausing, buildMetrics, serializeForPause, getGamificationSnapshot, showSnackbar]);

  const handlePauseClick = useCallback(async () => {
    try {
      timeoutTriggeredRef.current = true;
      if (inactivityTimerRef.current) { clearTimeout(inactivityTimerRef.current); inactivityTimerRef.current = null; }
      await handlePauseExercise();
      if (executionRef.current) executionRef.current.completed = true;
      setIsActive(false);
      if (!sandboxMode) navigate('/portal/exercises');
      else onSandboxExit?.();
    } catch {
      timeoutTriggeredRef.current = false;
    }
  }, [handlePauseExercise, sandboxMode, navigate, onSandboxExit]);

  // ── End / exit dialogs ────────────────────────────────────────────────────
  const handleEndConfirm = useCallback(async () => {
    setShowEndDialog(false);
    const success = await completeExerciseResult();
    if (success) setShowCompletionDialog(true);
  }, [completeExerciseResult]);

  const handleExitConfirm = useCallback(async () => {
    try {
      if (isGameActive() && currentResultId) await handlePauseExercise();
    } finally {
      setShowExitDialog(false);
      if (blocker.state === 'blocked') blocker.proceed();
    }
  }, [isGameActive, currentResultId, handlePauseExercise, blocker]);

  const handleCompletionClose = useCallback(() => {
    setShowCompletionDialog(false);
    if (!sandboxMode) navigate('/portal/exercises');
    else onSandboxExit?.();
  }, [sandboxMode, navigate, onSandboxExit]);

  // ── Start exercise (mount) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!assignment || sandboxMode) {
      setIsLoading(false);
      if (sandboxMode) {
        const startTime = Date.now();
        executionRef.current = { startTime, completed: false };
        setCurrentTime(startTime);
        setIsActive(true);
      }
      return;
    }

    void (async () => {
      try {
        const response = await startExercise(assignmentId, sessionId);
        const { action, result, reason } = response;

        if (action === 'blocked') {
          setIsLoading(false);
          const msgs: Record<string, string> = {
            timed_out_not_playable: 'Bài tập này đã hết thời gian thực hiện.',
            session_completed_not_playable: 'Phiên bài tập này đã hoàn thành.',
          };
          showSnackbar(msgs[reason as string] ?? 'Không thể tiếp tục bài tập này.', 'warning');
          navigate(`/portal/assignments/${assignmentId}/sessions/${sessionId}/results`);
          return;
        }

        setCurrentResultId(result.id);
        currentResultIdRef.current = result.id;

        if (action === 'resume' && result.exerciseState) {
          try {
            restoreFromSnapshot(result.exerciseState);
            if (result.exerciseState.gamification) {
              restoreGamification(result.exerciseState.gamification);
            }
            restoredRef.current = true;
            setSetupPhase('active');
            showSnackbar('Tiếp tục từ lần luyện trước', 'info');
          } catch {
            showSnackbar('Không thể khôi phục trạng thái, bắt đầu mới', 'warning');
          }
        }

        const startTime =
          action === 'resume' || action === 'continue'
            ? Date.now() - (result.duration ?? 0) * 1000
            : Date.now();

        executionRef.current = { startTime, completed: false };
        setCurrentTime(Date.now());
        resetInactivityTimer();
        setIsActive(true);
        setIsLoading(false);
      } catch {
        setIsLoading(false);
        const startTime = Date.now();
        executionRef.current = { startTime, completed: false };
        setCurrentTime(startTime);
        setIsActive(true);
      }
    })();
  }, [assignment, assignmentId, sessionId, sandboxMode]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!assignment) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Không tìm thấy bài tập với ID: {assignmentId}
      </Alert>
    );
  }

  if (!canDetermineVisionSize && !sandboxMode) {
    if (examResultsLoading) {
      return (
        <Box sx={{ width: '100vw', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      );
    }
    return (
      <Box sx={{ width: '100vw', minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
        <Box sx={{ maxWidth: 720, mx: 'auto', mt: 4 }}>
          <ExerciseVisionRequiredAlert showBackButton />
        </Box>
      </Box>
    );
  }

  const acuityInfo = getAcuityLevelInfo(trainingVisionType, state.farLevel);
  const contrastInfo = getContrastLevelInfo(state.contrastLevel);
  const eyeLabel = eye === 'left' ? 'Mắt trái' : eye === 'right' ? 'Mắt phải' : 'Hai mắt';

  return (
    <LoadingBoundary loading={isLoading} height="100vh">
      <Box
        ref={fullscreenRootRef}
        sx={{
          width: '100%',
          height: sandboxMode ? '100%' : '100vh',
          minHeight: sandboxMode ? '100%' : '100vh',
          flex: sandboxMode ? 1 : undefined,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top HUD */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            px: 2,
            py: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'white',
            borderBottom: '1px solid #e0e0e0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
            zIndex: 10,
            gap: 3,
            flexShrink: 0,
          }}
        >
          {/* Score — left aligned, number before coin */}
          <Box
            sx={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ color: '#FFD93D', lineHeight: 1 }}>
                {totalCoins}
              </Typography>
              <Typography sx={{ fontSize: 22, lineHeight: 1 }}>🪙</Typography>
            </Box>

            {currentCombo >= 3 && (
              <Typography
                sx={{
                  color: isStreakMilestone(currentCombo) ? '#FF6B6B' : '#FFD93D',
                  fontWeight: 800,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                }}
              >
                {isStreakMilestone(currentCombo)
                  ? COPY.streakMilestoneHud(currentCombo)
                  : COPY.comboLabel(currentCombo)}
              </Typography>
            )}
          </Box>

          {/* Acuity */}
          <Box textAlign="center">
            <Typography variant="h6" fontWeight="bold" color="primary.main">
              {acuityInfo.score}
            </Typography>
            <Typography variant="caption" color="text.secondary">Thị lực</Typography>
          </Box>

          {/* logCS */}
          <Box textAlign="center">
            <Typography variant="h6" fontWeight="bold">
              {contrastInfo.score}
            </Typography>
            <Typography variant="caption" color="text.secondary">logCS</Typography>
          </Box>

          {/* Eye */}
          <Box textAlign="center">
            <Typography variant="body2" fontWeight="bold">{eyeLabel}</Typography>
            <Typography variant="caption" color="text.secondary">Mắt tập</Typography>
          </Box>

          {/* Timer */}
          {timeRemaining !== null && (
            <Box textAlign="center">
              <Typography
                variant="h6"
                fontWeight="bold"
                color={timeRemaining <= 60_000 ? 'error.main' : 'success.main'}
              >
                {Math.floor(timeRemaining / 60_000)}:
                {(Math.floor(timeRemaining / 1000) % 60).toString().padStart(2, '0')}
              </Typography>
              <Typography variant="caption" color="text.secondary">Còn lại</Typography>
            </Box>
          )}

          {/* Controls (right-aligned) */}
          <Box sx={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handlePauseClick}
              disabled={isPausing || !isGameActive()}
            >
              {isPausing ? 'Đang lưu...' : 'Tạm dừng'}
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={() => setShowEndDialog(true)}
              disabled={!isGameActive()}
            >
              Dừng tập
            </Button>
          </Box>
        </Box>

        {/* Main content: char-type setup or test (exam-style) */}
        {setupPhase === 'charType' ? (
          <FarAcuityCharTypeStep
            charType={charType}
            onCharTypeChange={setCharType}
            onConfirm={handleCharTypeConfirm}
            suggestedCharType={suggestedCharType}
            menuContainerRef={fullscreenRootRef}
          />
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <FarAcuityTestStep
              letters={state.letters}
              charType={charType}
              fontSizeMm={fontSizeMm}
              screenInfo={screenParams}
              contrastOpacity={contrastOpacity}
              snellenLabel={acuityInfo.score}
              logCsLabel={contrastInfo.score}
              eyeLabel={eyeLabel}
              acuityScore={acuityInfo.score}
              contrastPercent={contrastInfo.contrastPercent}
              currentBatchCharIndex={currentBatchCharIndex}
              currentBatch={currentBatch}
              inputValues={inputValues}
              inputFocusKey={inputFocusKey}
              allAnswered={allAnswered}
              disabled={!isGameActive() || feedbackBlocked}
              onDirectionSelect={handleDirectionSelect}
              onInputChange={handleInputChange}
              onRegenerateLetters={handleRegenerateLetters}
              onConfirmRound={() => void handleConfirmRound()}
            />
            {feedback && (
              <FarAcuityRoundFeedbackOverlay
                feedback={feedback}
                hudOffset={72}
              />
            )}
          </Box>
        )}

        <ExitConfirmationDialog
          open={showExitDialog}
          onClose={() => { setShowExitDialog(false); if (blocker.state === 'blocked') blocker.reset(); }}
          onConfirm={handleExitConfirm}
          container={fullscreenRootRef.current}
        />
        <ExerciseEndConfirmDialog
          open={showEndDialog}
          onConfirm={handleEndConfirm}
          onCancel={() => setShowEndDialog(false)}
          container={fullscreenRootRef.current}
        />
        <ExerciseCompletionDialog
          open={showCompletionDialog}
          onClose={handleCompletionClose}
          container={fullscreenRootRef.current}
        />
      </Box>
    </LoadingBoundary>
  );
};

export default FarAcuityExercise;
