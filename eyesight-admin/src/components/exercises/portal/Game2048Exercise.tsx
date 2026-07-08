/**
 * Portal Exercise Component
 * Generic exercise component for all exercise types (2048, memory, etc.)
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box, Button, Typography, Alert, CircularProgress } from '@mui/material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import { useBlocker, useNavigate } from 'react-router-dom';
import { useGame2048Engine } from 'src/hooks/exercises/useGame2048Engine';
import {
  startExercise,
  pauseExercise,
  completeExercise,
  trackInactivity,
} from 'src/services/patient.service';
import type { GameSession } from 'src/hooks/exercises';
import ExitConfirmationDialog from './ExitConfirmationDialog';
import ExerciseEndConfirmDialog from './ExerciseEndConfirmDialog';
import ExerciseCompletionDialog from './ExerciseCompletionDialog';
import useAuth from 'src/contexts/authGuard/useAuth';
import useSnackbar from 'src/contexts/UseSnackbar';
import {
  getEffectiveExerciseDurationMs,
  getInactivityThresholdMs,
} from 'src/utils/exerciseDuration';
import { calculateVisualSettings, computeExercisePatientVision, resolveAssignmentTrainingEye } from 'src/utils/visionUtils';
import { hasExerciseVisionLevel } from 'src/utils/exerciseVisionPrerequisites';
import { resolveExerciseStartVisionLevel } from 'src/utils/exerciseDifficultyBaseline';
import useFreshPatientExamResults from 'src/hooks/useFreshPatientExamResults';
import { useExerciseFullscreen } from 'src/hooks/useExerciseFullscreen';
import ExerciseVisionRequiredAlert from 'src/features/portal/views/exerciseResult/components/ExerciseVisionRequiredAlert';
import { VisualSettings, GameManager } from 'src/types/core';
import type { PortalExerciseProps } from './types';

declare global {
  interface Window {
    GameManager: any;
    KeyboardInputManager: any;
    HTMLActuator: any;
    LocalStorageManager: any;
  }
}

const Game2048Exercise: React.FC<PortalExerciseProps> = ({
  assignmentId,
  sessionId,
  screenParams,
  assignment,
  sandboxMode = false,
}) => {
  const { user } = useAuth(); // Get user info from auth context
  const { showSnackbar } = useSnackbar();
  const { examResults: freshExamResults, loading: examResultsLoading } = useFreshPatientExamResults();
  const patient = user?.patient;
  // Helper to access exerciseConfig safely
  // const exerciseConfig = assignment?.exerciseConfig;

  const navigate = useNavigate();
  const gameExecutionRef = useRef<GameSession | null>(null); // ĐÚNG: execution = 1 lần chơi game
  const fullscreenRootRef = useRef<HTMLDivElement>(null);
  const timeoutTriggeredRef = useRef(false);
  const currentResultIdRef = useRef<number | null>(null);

  const [sessionBootstrap, setSessionBootstrap] = useState<{
    engineEnabled: boolean;
    resumeState: Record<string, unknown> | null;
  }>({ engineEnabled: false, resumeState: null });

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentResultId, setCurrentResultId] = useState<number | null>(null);

  // Game session tracking
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const exerciseConfig = useMemo(() => assignment?.exerciseConfig, [assignment]);
  const patientExamResults = freshExamResults ?? (patient as any)?.examResults;

  useEffect(() => {
    currentResultIdRef.current = currentResultId;
  }, [currentResultId]);

  const eye = useMemo(
    () =>
      resolveAssignmentTrainingEye({
        trainingEye: assignment?.trainingEye,
        configEye: exerciseConfig?.eye,
      }),
    [assignment?.trainingEye, exerciseConfig?.eye]
  );
  const visionType = exerciseConfig?.visionType;

  // Tính vision level cho lượt tập. Logic đặt trong computeExercisePatientVision
  // (visionUtils) để dùng chung với màn preview ExerciseSetup, đảm bảo cỡ chữ
  // preview khớp game thật. eye='both' → lấy mắt kém hơn (min); override bật →
  // dùng visionLevel bác sĩ chỉ định, bỏ qua eye.
  const patientVision = useMemo(
    () =>
      computeExercisePatientVision({
        levelOverride: assignment?.levelOverride,
        visionLevel: assignment?.visionLevel,
        visionType,
        trainingEye: assignment?.trainingEye,
        configEye: exerciseConfig?.eye,
        examResults: patientExamResults,
      }),
    [assignment, patientExamResults, eye, visionType]
  );

  // Starting level respects difficultyBaselineSource — may use lastAchievedVisionLevel
  // instead of the raw exam result when the doctor chose 'latest_achieved' mode.
  const startVisionLevel = useMemo(
    () =>
      resolveExerciseStartVisionLevel({
        difficultyBaselineSource: exerciseConfig?.difficultyBaselineSource,
        levelOverride: assignment?.levelOverride,
        visionLevel: assignment?.visionLevel,
        visionType,
        trainingEye: assignment?.trainingEye,
        configEye: exerciseConfig?.eye,
        examResults: patientExamResults,
        lastAchievedVisionLevel: assignment?.lastAchievedVisionLevel,
      }),
    [
      exerciseConfig?.difficultyBaselineSource,
      assignment?.levelOverride,
      assignment?.visionLevel,
      assignment?.lastAchievedVisionLevel,
      visionType,
      assignment?.trainingEye,
      exerciseConfig?.eye,
      patientExamResults,
    ]
  );

  const canDetermineVisionSize = useMemo(
    () =>
      hasExerciseVisionLevel({
        levelOverride: assignment?.levelOverride,
        visionLevel: assignment?.visionLevel,
        visionType,
        trainingEye: assignment?.trainingEye,
        configEye: exerciseConfig?.eye,
        examResults: patientExamResults,
      }),
    [assignment, patientExamResults, eye, visionType]
  );

  useExerciseFullscreen(fullscreenRootRef, !isLoading && canDetermineVisionSize);

  const navigateToResults = useCallback(() => {
    navigate(`/portal/assignments/${assignmentId}/sessions/${sessionId}/results`);
  }, [assignmentId, navigate, sessionId]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (!isGameActive()) return;
    const thresholdMs = getInactivityThresholdMs(exerciseConfig);
    inactivityTimerRef.current = setTimeout(() => {
      if (!isGameActive()) return;
      const resultId = currentResultIdRef.current;
      if (resultId) {
        // Server is source of truth — fire-and-forget, ignore failures
        void trackInactivity(assignmentId, sessionId, resultId);
      }
      // Restart timer for next inactivity window
      resetInactivityTimer();
    }, thresholdMs);
  }, [assignmentId, sessionId, exerciseConfig]);

  // Block navigation when exercise is active
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return Boolean(isGameActive() && currentLocation.pathname !== nextLocation.pathname);
  });

  // Handle blocked navigation
  React.useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowExitDialog(true);
    }
  }, [blocker]);

  // Handle exit confirmation with auto-save (for navigation blocking)
  const handleExitConfirm = async () => {
    try {
      // Pause (save state) before leaving - don't complete
      if (isGameActive() && currentResultId) {
        await handlePauseExercise();
      }

      setShowExitDialog(false);
      if (blocker.state === 'blocked') {
        blocker.proceed(); // This will navigate to the intended page
      }
    } catch (error) {
      console.error('Error auto-saving before exit:', error);
      // Still proceed even if save fails
      setShowExitDialog(false);
      if (blocker.state === 'blocked') {
        blocker.proceed(); // This will navigate to the intended page
      }
    }
  };

  // Handle end exercise confirmation (for "Kết thúc" button)
  const handleEndConfirm = async () => {
    setShowEndDialog(false);

    if (isGameActive() && currentResultId) {
      const success = await completeExerciseResult(getFinalScore());
      if (success) {
        setShowCompletionDialog(true);
      }
    } else {
      navigate('/portal/exercises');
    }
  };

  const handleCompletionDialogClose = () => {
    setShowCompletionDialog(false);
    navigate('/portal/exercises');
  };

  const handleExitCancel = () => {
    setShowExitDialog(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  // Handle "Kết thúc" button click - show dialog
  const handleEndExercise = () => {
    setShowEndDialog(true);
  };

  const handleEndCancel = () => {
    setShowEndDialog(false);
  };

  // Handle pause exercise - save current game state to backend
  const handlePauseExercise = async () => {
    const currentSession = gameExecutionRef.current;
    const gameManager = gameInstanceRef.current;

    if (!currentSession || !currentResultId || isPausing || currentSession.completed) {
      return;
    }

    setIsPausing(true);

    try {
      const metrics = buildExecutionMetrics();
      if (!metrics) {
        return;
      }

      // Build game state for saving - use full serialize() method
      const exerciseState = gameManager?.serialize ? gameManager.serialize() : null;
      if (!exerciseState) {
        throw new Error('Game state unavailable');
      }

      await pauseExercise(assignmentId, sessionId, currentResultId, {
        ...metrics,
        exerciseState: exerciseState,
      });

      showSnackbar('Đã tạm dừng bài tập thành công', 'success');
    } catch (error) {
      showSnackbar('Không thể tạm dừng bài tập', 'error');
      throw error; // Re-throw so caller knows it failed
    } finally {
      setIsPausing(false);
    }
  };

  // Handle pause button click
  const handlePauseClick = async () => {
    try {
      // Prevent timeout submission from racing with pause
      timeoutTriggeredRef.current = true;

      // Stop inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      await handlePauseExercise();

      // Mark as completed AFTER pause succeeds so unmount cleanup and timeout don't re-enter
      if (gameExecutionRef.current) {
        gameExecutionRef.current.completed = true;
      }

      navigate('/portal/exercises');
    } catch (error) {
      // Pause failed: restore timeout guard and leave game active so user can retry
      timeoutTriggeredRef.current = false;
    }
  };

  // Helper function to check if game is active
  const isGameActive = () => {
    const currentSession = gameExecutionRef.current;
    return Boolean(currentSession && !currentSession.completed);
  };

  // Helper function to get final score
  const getFinalScore = () => {
    const currentSession = gameExecutionRef.current;
    const gameManager = gameInstanceRef.current;
    return Math.max(gameManager?.score ?? 0, currentSession?.maxScore ?? 0);
  };

  const buildExecutionMetrics = useCallback((options?: { scoreOverride?: number }) => {
    const currentSession = gameExecutionRef.current;
    if (!currentSession) {
      return null;
    }

    const gameManager = gameInstanceRef.current;
    const movesCount = currentSession.movesCount ?? 0;
    const scoringMoves = currentSession.scoringMoves ?? 0;
    const accuracy = movesCount > 0 ? scoringMoves / movesCount : 0;

    return {
      score:
        options?.scoreOverride ?? Math.max(gameManager?.score ?? 0, currentSession.maxScore ?? 0),
      duration: Math.floor((Date.now() - currentSession.startTime) / 1000),
      movesCount,
      accuracy: Math.round(accuracy * 100) / 100,
    };
  }, []);

  /**
   * Complete exercise (no auto-navigate)
   * Caller decides what to do after completion (show dialog, navigate, etc)
   *
   * @returns true if success, false if failed
   */
  const completeExerciseResult = useCallback(
    async (finalScore: number): Promise<boolean> => {
      const currentSession = gameExecutionRef.current;

      if (!currentSession || !assignment || currentSession.completed || !currentResultId) {
        return false;
      }

      // Mark as completed to prevent duplicate calls
      gameExecutionRef.current = { ...currentSession, completed: true };

      const metrics = buildExecutionMetrics({ scoreOverride: finalScore });
      if (!metrics) {
        return false;
      }

      // Stop inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      try {
        await completeExercise(assignmentId, sessionId, currentResultId, {
          ...metrics,
        });
        return true;
      } catch {
        showSnackbar('Không thể lưu kết quả bài tập', 'error');
        return false;
      } finally {
        // Clean up
        gameExecutionRef.current = null;
        setCurrentResultId(null);
      }
    },
    [assignmentId, sessionId, assignment, currentResultId, buildExecutionMetrics, showSnackbar]
  );

  const handleTimeoutSubmission = useCallback(async () => {
    const currentSession = gameExecutionRef.current;

    if (!currentSession || !assignment || !currentResultIdRef.current || currentSession.completed) {
      return;
    }

    // Complete exercise and show dialog
    const success = await completeExerciseResult(getFinalScore());
    if (success) {
      setShowCompletionDialog(true);
    }
  }, [assignment, completeExerciseResult, getFinalScore]);

  // Update current time every second for real-time UI updates
  useEffect(() => {
    if (!isGameActive()) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameActive]);

  // Countdown timer based on exercise duration - follow existing pattern
  useEffect(() => {
    if (!exerciseConfig?.duration || !gameExecutionRef.current?.startTime) {
      setTimeRemaining(null);
      return;
    }

    const durationMs = getEffectiveExerciseDurationMs(exerciseConfig.duration);
    if (durationMs === null) {
      setTimeRemaining(null);
      return;
    }

    const startTime = gameExecutionRef.current.startTime;

    const updateCountdown = () => {
      const elapsed = currentTime - startTime;
      const remaining = Math.max(0, durationMs - elapsed);

      if (remaining <= 0) {
        setTimeRemaining(0);

        if (!timeoutTriggeredRef.current) {
          timeoutTriggeredRef.current = true;
          void handleTimeoutSubmission();
        }

        return;
      }

      setTimeRemaining(remaining);
    };

    // Update countdown based on currentTime (already updates every second)
    updateCountdown();
  }, [currentTime, exerciseConfig?.duration, handleTimeoutSubmission]);

  useEffect(() => {
    // Exercise type is guaranteed supported here: the PortalExercise dispatcher
    // only mounts this component for the '2048' registry entry.
    if (assignment) {
      void startExerciseResult();
    }
  }, [assignment]);

  // Calculate visual settings from patient vision data and exercise config
  const getVisualSettings = useCallback((): VisualSettings | undefined => {
    if (!exerciseConfig || !patientVision) return undefined;

    const visionType = exerciseConfig.visionType;
    const distance = parseFloat(String(exerciseConfig.distance || '0.5'));
    const colorScheme =
      exerciseConfig.colorScheme?.preset === 'original'
        ? undefined
        : exerciseConfig.colorScheme;

    try {
      let visionLevel: number | null = null;
      let patientFarLevel: number | undefined;

      if (visionType === 'far' || visionType === 'near') {
        visionLevel = startVisionLevel;
      } else if (visionType === 'contrast') {
        visionLevel = startVisionLevel;
        patientFarLevel = patientVision.farVisionLevel ?? undefined;
      }

      if (visionLevel == null) {
        return undefined;
      }

      const { fontSize, contrast, scaleFactor, fontSizeMm } = calculateVisualSettings({
        visionType: visionType as 'far' | 'near' | 'contrast',
        visionLevel,
        distance,
        screenInfo: screenParams,
        patientFarVisionLevel: patientFarLevel,
      });

      return {
        fontSize,
        contrast,
        colorScheme: colorScheme || undefined,
        scaleFactor,
        visionType: visionType || undefined,
        // fontSizeMm = ISO clinical target height in mm for the patient's vision level.
        // Exposed so tests and debug tools can verify the physical rendering size.
        fontSizeMm,
      };
    } catch (error) {
      console.error('Error calculating visual settings:', error);
      return undefined;
    }
  }, [startVisionLevel, patientVision, screenParams, exerciseConfig]);

  // ==================== GAME ENHANCEMENT ====================

  // Portal-specific game enhancement: attach tracking to GameManager
  const attachGameTracking = useCallback(
    (gameManager: GameManager) => {
      const originalRestart = gameManager.restart;
      const originalActuate = gameManager.actuator?.actuate;
      const actuator = gameManager.actuator;
      const inputManager = (gameManager as any).inputManager;

      if (!originalActuate || !actuator) {
        console.warn('[Portal] GameManager actuator not available');
        return;
      }

      // Track moves from input events.
      // GameManager registers its internal move handler during construction,
      // so overriding gameManager.move afterwards does not affect bound callbacks.
      if (inputManager && typeof inputManager.on === 'function') {
        inputManager.on('move', () => {
          const currentSession = gameExecutionRef.current;
          if (!currentSession || currentSession.completed) {
            return;
          }

          gameExecutionRef.current = {
            ...currentSession,
            movesCount: (currentSession.movesCount ?? 0) + 1,
          };

          // Any move resets the configured inactivity window
          resetInactivityTimer();
        });
      }

      // Override restart
      gameManager.restart = function () {
        if (gameExecutionRef.current && !gameExecutionRef.current.completed) {
          gameExecutionRef.current = null;
        }
        const result = originalRestart.call(this);
        // Will call startExerciseResult via useEffect
        return result;
      };

      // Override actuate to track score and game over
      actuator.actuate = function (grid: any, metadata: any) {
        originalActuate.call(this, grid, metadata);

        const currentSession = gameExecutionRef.current;
        if (currentSession && !currentSession.completed) {
          // Inline score update
          if (metadata && metadata.score !== undefined && metadata.score >= 0) {
            const maxScore = currentSession.maxScore ?? 0;
            const scoringMoves = currentSession.scoringMoves ?? 0;
            const scoreIncreased = metadata.score > maxScore;

            gameExecutionRef.current = {
              ...currentSession,
              maxScore: Math.max(maxScore, metadata.score),
              scoringMoves: scoreIncreased ? scoringMoves + 1 : scoringMoves,
            };
          }

          // Check game over - will be handled by endExerciseResult defined below
          if (metadata && metadata.over && !metadata.won) {
            // Call endExerciseResult which is defined after hook
            setTimeout(() => {
              if (endExerciseResult) {
                endExerciseResult(false, metadata.score || 0);
              }
            }, 0);
          }
        }
      };
    },
    [assignment]
  );

  /**
   * Validate game state structure before restore
   */
  const isValidGameState = useCallback((state: any): boolean => {
    if (!state || typeof state !== 'object') return false;

    if (!state.grid || typeof state.grid !== 'object') return false;
    if (typeof state.grid.size !== 'number' || state.grid.size <= 0) return false;
    if (!Array.isArray(state.grid.cells)) return false;

    const score = typeof state.score === 'string' ? parseInt(state.score, 10) : state.score;
    if (typeof score !== 'number' || Number.isNaN(score)) return false;
    if (typeof state.over !== 'boolean') return false;
    if (typeof state.won !== 'boolean') return false;

    return true;
  }, []);

  const normalizeGameState = useCallback(
    (state: any) => {
      if (!isValidGameState(state)) return null;
      return {
        ...state,
        score: typeof state.score === 'string' ? parseInt(state.score, 10) : state.score,
        keepPlaying: typeof state.keepPlaying === 'boolean' ? state.keepPlaying : false,
      };
    },
    [isValidGameState]
  );

  const currentVisualSettings = useMemo(() => getVisualSettings(), [getVisualSettings]);

  // ==================== GAME ENGINE HOOK ====================

  const {
    gameContainerRef,
    gameInstanceRef,
    isReady: isGameReady,
  } = useGame2048Engine({
    visualSettings: currentVisualSettings,
    enableTracking: true,
    hideUnnecessaryUI: true,
    onGameInit: attachGameTracking,
    enabled: sessionBootstrap.engineEnabled && canDetermineVisionSize,
    initialGameState: sessionBootstrap.resumeState,
  });

  const restoreGameState = useCallback(
    (savedState: any) => {
      if (!savedState || !gameInstanceRef.current) {
        return false;
      }

      const normalized = normalizeGameState(savedState);
      if (!normalized) {
        return false;
      }

      const gameManager = gameInstanceRef.current;

      try {
        if (gameManager.storageManager) {
          gameManager.storageManager.clearGameState();
          gameManager.storageManager.setGameState(normalized);
          gameManager.setup(true);
          return true;
        }
      } catch (error) {
        console.error('Failed to restore game state:', error);
        return false;
      }

      return false;
    },
    [gameInstanceRef, normalizeGameState]
  );

  // Fallback restore if engine was already warm when resume state arrives
  useEffect(() => {
    if (!isGameReady || !sessionBootstrap.resumeState) return;
    restoreGameState(sessionBootstrap.resumeState);
  }, [isGameReady, sessionBootstrap.resumeState, restoreGameState]);

  // Handle page unload/reload - use sendBeacon for reliable data saving
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isGameActive() && currentResultId) {
        const currentSession = gameExecutionRef.current;
        const gameManager = gameInstanceRef.current;

        if (currentSession) {
          const metrics = buildExecutionMetrics();
          if (!metrics) {
            return;
          }

          const pauseData = {
            exerciseState: gameManager?.serialize ? gameManager.serialize() : null,
            ...metrics,
          };

          const baseUrl = import.meta.env.VITE_BASE_API_URL || '';
          const url = `${baseUrl}/me/assignments/${assignmentId}/sessions/${sessionId}/results/${currentResultId}`;
          const blob = new Blob([JSON.stringify(pauseData)], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
        }

        event.preventDefault();
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      const session = gameExecutionRef.current;
      const resultId = currentResultIdRef.current;
      const gameManager = gameInstanceRef.current;

      if (session && !session.completed && resultId && gameManager?.serialize) {
        const metrics = buildExecutionMetrics();
        const exerciseState = gameManager.serialize();
        if (metrics && exerciseState) {
          void pauseExercise(assignmentId, sessionId, resultId, {
            ...metrics,
            exerciseState,
          }).catch(() => {
            // Best-effort save on unmount
          });
        }
      }
    };
  }, [assignmentId, sessionId, currentResultId, buildExecutionMetrics, gameInstanceRef]);

  // Game session functions
  const startExerciseResult = async () => {
    if (!assignment || !sessionId) return;

    setIsLoading(true);
    timeoutTriggeredRef.current = false;
    setSessionBootstrap({ engineEnabled: false, resumeState: null });

    // Clear any running inactivity timer before starting new execution
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    try {
      // Call new startExercise API
      const response = await startExercise(assignmentId, sessionId);
      const { action, result, reason } = response;

      if (action === 'blocked') {
        setIsLoading(false);
        const messages = {
          timed_out_not_playable: 'Bài tập này đã hết thời gian thực hiện.',
          session_completed_not_playable: 'Phiên bài tập này đã hoàn thành.',
        };
        showSnackbar(messages[reason] || 'Không thể tiếp tục bài tập này.', 'warning');
        navigateToResults();
        return;
      }

      setCurrentResultId(result.id);

      if (action === 'resume') {
        showSnackbar('Tiếp tục từ lần chơi trước', 'info');
      } else if (
        action === 'continue' &&
        ((result.score ?? 0) > 0 || (result.movesCount ?? 0) > 0)
      ) {
        showSnackbar(
          'Không tìm thấy trạng thái bàn chơi đã lưu. Hãy dùng nút Tạm dừng trước khi rời bài tập.',
          'warning'
        );
      }

      const resumeState =
        action === 'resume' && result.exerciseState
          ? normalizeGameState(result.exerciseState)
          : null;

      if (action === 'resume' && result.exerciseState && !resumeState) {
        showSnackbar('Không thể khôi phục trạng thái game, bắt đầu game mới', 'warning');
      }

      const startTime =
        action === 'resume' || action === 'continue'
          ? Date.now() - (result.duration || 0) * 1000
          : Date.now();

      const execution: GameSession = {
        // Game2048Result properties
        score: result.score || 0,
        moves: result.movesCount || 0,
        highestTile: 0,
        efficiency: 0,
        // ExerciseResult properties
        startTime: startTime,
        movesCount: result.movesCount || 0,
        scoringMoves: 0,
        maxScore: result.score || 0,
        completed: false,
        exerciseId: assignment?.exerciseConfig?.exerciseId || 0,
        sessionId,
        level: result.level || 0,
      };

      gameExecutionRef.current = execution;
      setCurrentTime(Date.now());

      // Start inactivity timer once game is live
      resetInactivityTimer();

      setSessionBootstrap({
        engineEnabled: true,
        resumeState,
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error starting game execution:', error);
      setIsLoading(false);
      // Fallback to local execution if API fails
      const startTime = Date.now();
      const execution: GameSession = {
        // Game2048Result properties
        score: 0,
        moves: 0,
        highestTile: 0,
        efficiency: 0,
        // ExerciseResult properties
        startTime: startTime,
        movesCount: 0,
        scoringMoves: 0,
        maxScore: 0,
        completed: false,
        exerciseId: assignment?.exerciseConfig?.exerciseId || 0,
        level: 0,
        sessionId: 0,
      };

      gameExecutionRef.current = execution;
    }
  };

  /**
   * Handle game over (called by GameManager when no moves left)
   */
  const endExerciseResult = useCallback(
    async (_gameWon: boolean, finalScore: number) => {
      const success = await completeExerciseResult(finalScore);
      if (success) {
        setShowCompletionDialog(true);
      }
    },
    [completeExerciseResult]
  );

  // ==============================================================
  // OLD CODE REMOVED: Lines 636-884 (250 lines)
  // - initGame() function → Replaced by useGame2048Engine hook
  // - applyVisionScaling() function → Handled by hook's visual settings
  // ==============================================================

  // PatientExerciseDetail not found
  if (!assignment) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Không tìm thấy bài tập với ID: {assignmentId}
      </Alert>
    );
  }

  if (!canDetermineVisionSize) {
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

  // Loading state while starting exercise
  return (
    <LoadingBoundary loading={isLoading} height="100vh">
      <Box
        ref={fullscreenRootRef}
        sx={{
          width: '100%',
          height: sandboxMode ? '100%' : '100vh',
          minHeight: sandboxMode ? '100%' : '100vh',
          flex: sandboxMode ? 1 : undefined,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#f5f5f5',
        }}
      >
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            p: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'white',
            borderBottom: '1px solid #e0e0e0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          {/* Game Stats - Centered */}
          {gameExecutionRef?.current && (
            <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {gameExecutionRef.current.maxScore}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Điểm
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {Math.floor((currentTime - (gameExecutionRef.current.startTime || 0)) / 1000)}s
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Thời gian
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {gameExecutionRef.current.movesCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Nước đi
                </Typography>
              </Box>
              {timeRemaining !== null && timeRemaining !== undefined && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: timeRemaining <= 60000 ? 'error.main' : 'success.main',
                      fontWeight: 'bold',
                    }}
                  >
                    {Math.floor(timeRemaining / 60000)}:
                    {(Math.floor(timeRemaining / 1000) % 60).toString().padStart(2, '0')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Còn lại
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Control Buttons - Positioned absolute right */}
          <Box
            sx={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: 1,
            }}
          >
            <Button
              onClick={handlePauseClick}
              variant="outlined"
              color="primary"
              size="small"
              disabled={isPausing || !isGameActive()}
            >
              {isPausing ? 'Đang lưu...' : 'Tạm dừng'}
            </Button>
            <Button
              onClick={handleEndExercise}
              variant="contained"
              color="error"
              size="small"
              disabled={!isGameActive()}
            >
              Kết thúc
            </Button>
          </Box>
        </Box>

        {/* Game container */}
        <Box
          component="div"
          className="game-wrapper"
          ref={gameContainerRef}
          data-patient-vision={patientVision ? JSON.stringify(patientVision) : undefined}
          data-visual-settings={
            currentVisualSettings ? JSON.stringify(currentVisualSettings) : undefined
          }
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
            pb: 2,
          }}
        />

        <ExitConfirmationDialog
          open={showExitDialog}
          onClose={handleExitCancel}
          onConfirm={handleExitConfirm}
          container={fullscreenRootRef.current}
        />

        <ExerciseEndConfirmDialog
          open={showEndDialog}
          onConfirm={handleEndConfirm}
          onCancel={handleEndCancel}
          container={fullscreenRootRef.current}
        />

        <ExerciseCompletionDialog
          open={showCompletionDialog}
          onClose={handleCompletionDialogClose}
          container={fullscreenRootRef.current}
        />
      </Box>
    </LoadingBoundary>
  );
};

export default Game2048Exercise;
