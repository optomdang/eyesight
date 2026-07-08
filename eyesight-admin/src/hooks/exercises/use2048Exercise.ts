/**
 * Unified 2048 Exercise Hook
 * Consolidates pure game logic and API integration with mode selection
 *
 * CRITICAL: This hook maintains exact logic compatibility with original implementations
 *
 * Replaces:
 * - src/hooks/use2048Exercise.ts (System A - pure game logic)
 * - src/features/portal/hooks/use2048Exercise.ts (System B - API integration)
 * - src/hooks/useGameSession.ts (session management)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { postData, getData } from 'src/utils/request';
import useAuth from 'src/contexts/authGuard/useAuth';
import type { VisualSettings, Game2048State, ExerciseAssignment } from 'src/types/core';

// Exercise mode determines API integration behavior
export type ExerciseMode = 'standalone' | 'integrated';

// Hook options interface
export interface Use2048ExerciseOptions {
  mode: ExerciseMode;
  assignmentId?: number; // Required for integrated mode
  visualSettings?: VisualSettings; // Optional override
  targetTile?: number; // Default: 2048
  boardSize?: number; // Default: 4
  onGameComplete?: (result: GameResult) => void;
}

// Game result interface (matches original Game2048Result)
export interface GameResult {
  score: number;
  moves: number;
  highestTile: number;
  efficiency: number;
  visualSettings?: VisualSettings;
}

// Game session interface (unified from useGameSession.ts - EXACT MATCH)
export interface GameSession {
  // Game2048Result properties
  score: number;
  moves: number;
  highestTile: number;
  efficiency: number;

  // ExerciseResult properties (from original useGameSession)
  startTime: number;
  movesCount: number;
  scoringMoves: number;
  maxScore: number;
  completed: boolean;
  exerciseId: number;
  sessionId: number;
  level: number;

  // Additional game-specific properties
  restartCount?: number;
}

// Hook return interface
export interface Use2048ExerciseReturn {
  // Game State
  gameState: Game2048State;
  isLoading: boolean;
  error: string | null;

  // Game Actions - SIMPLIFIED: Let Game2048Board handle actual game logic
  // This hook focuses on session management and API integration

  // Session Management (integrated mode only)
  session: GameSession | null;
  startSession: () => Promise<void>;
  endSession: (result: GameResult) => Promise<void>;

  // Visual Settings
  visualSettings: VisualSettings;
  updateVisualSettings: (settings: Partial<VisualSettings>) => void;

  // Results
  getExerciseResult: () => GameResult;

  // Session Tracking (from useGameSession.ts - EXACT MATCH)
  trackMove: () => void;
  updateScore: (newScore: number) => void;
  isCompleted: () => boolean;
  getScore: () => number;
}

/**
 * Unified 2048 Exercise Hook
 *
 * IMPORTANT: This hook does NOT implement game logic (2048 moves, board state)
 * Game logic is handled by Game2048Board component using GameManager
 * This hook focuses on:
 * - Session management and tracking
 * - API integration for portal mode
 * - Visual settings management
 *
 * @param options - Hook configuration options
 * @returns Hook interface with session state and tracking
 */
export const use2048Exercise = (options: Use2048ExerciseOptions): Use2048ExerciseReturn => {
  const { mode, assignmentId, visualSettings: initialVisualSettings, onGameComplete } = options;

  const { user } = useAuth();

  // Basic game state (for compatibility - actual game state managed by Game2048Board)
  const [gameState] = useState<Game2048State>({
    board: Array(4)
      .fill(null)
      .map(() => Array(4).fill(0)),
    score: 0,
    gameOver: false,
    gameWon: false,
    moves: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session State (integrated mode only)
  const [assignment, setAssignment] = useState<ExerciseAssignment | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);

  // Visual Settings State
  const [visualSettings, setVisualSettings] = useState<VisualSettings>(
    initialVisualSettings || {
      colorScheme: {
        preset: 'whiteBlack',
        textColor: '#000000',
        backgroundColor: '#ffffff',
      },
      contrast: 100,
      fontSize: 16,
    }
  );

  // Refs for session tracking (EXACT MATCH with useGameSession.ts)
  const sessionRef = useRef<GameSession | null>(null);

  // Load assignment data (integrated mode only)
  useEffect(() => {
    if (mode === 'integrated' && assignmentId && user?.id) {
      loadAssignment();
    }
  }, [mode, assignmentId, user?.id]);

  const loadAssignment = async () => {
    if (!assignmentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getData<ExerciseAssignment>(`/me/assignments/${assignmentId}`);
      setAssignment(data);

      // Extract visual settings from assignment's config if available
      if (data.exerciseConfig) {
        const config = data.exerciseConfig;
        if (config.fontSize || config.contrast || config.colorScheme) {
          const newSettings: VisualSettings = {
            fontSize: config.fontSize || visualSettings.fontSize,
            contrast: config.contrast || visualSettings.contrast,
            colorScheme: config.colorScheme
              ? {
                  preset:
                    (config.colorScheme.preset as 'whiteBlack' | 'blackWhite' | 'custom') ||
                    'whiteBlack',
                  textColor: config.colorScheme.textColor,
                  backgroundColor: config.colorScheme.backgroundColor,
                }
              : visualSettings.colorScheme,
          };
          setVisualSettings(newSettings);
        }
      }
    } catch (err) {
      setError('Không thể tải thông tin bài tập');
    } finally {
      setIsLoading(false);
    }
  };

  // Session Management Functions (EXACT MATCH with useGameSession.ts)

  const startSession = useCallback(async (): Promise<void> => {
    const now = Date.now();

    const newSession: GameSession = {
      // Game2048Result properties
      score: 0,
      moves: 0,
      highestTile: 0,
      efficiency: 0,

      // ExerciseResult properties (EXACT MATCH with useGameSession.ts)
      startTime: now,
      movesCount: 0,
      scoringMoves: 0,
      maxScore: 0,
      completed: false,

      // Tracking properties
      exerciseId: assignment?.exerciseConfig?.exerciseId || 0,
      sessionId: 0, // Will be set when session is created
      level: assignment?.visionLevel || 0,

      // Game-specific
      restartCount: 0,
    };

    sessionRef.current = newSession;
    setSession(newSession);
  }, [assignment]);

  const endSession = useCallback(
    async (result: GameResult): Promise<void> => {
      if (!sessionRef.current) {
        return;
      }

      // Prevent duplicate calls (EXACT MATCH with useGameSession.ts)
      if (sessionRef.current.completed) {
        return;
      }

      const endTime = Date.now();
      const duration = Math.floor((endTime - sessionRef.current.startTime) / 1000);

      // Calculate efficiency (EXACT MATCH with useGameSession.ts)
      const efficiency = duration > 0 ? result.score / duration : 0;

      const completedSession: GameSession = {
        ...sessionRef.current,
        score: result.score,
        completed: true,
        efficiency: Math.round(efficiency * 100) / 100,
      };

      sessionRef.current = completedSession;
      setSession(completedSession);

      // Submit result to backend (integrated mode only)
      if (mode === 'integrated' && assignment) {
        try {
          const accuracy = Math.min(result.score / 2048, 1.0);

          const resultPayload = {
            exerciseAssignmentId: assignment.id,
            exerciseSessionId: sessionRef.current.sessionId,
            level: assignment.visionLevel,
            score: result.score,
            duration,
            accuracy,
            movesCount: sessionRef.current.movesCount,
            completed: true,
            metadata: {
              gameBoard: gameState.board,
              visionLevel: assignment.visionLevel,
            },
          };

          const response = await postData(
            `/me/assignments/${assignment.id}/sessions/${sessionRef.current.sessionId}/results`,
            resultPayload
          );

          if (response && onGameComplete) {
            onGameComplete(result);
          }
        } catch (err) {
          setError('Không thể lưu kết quả bài tập');
        }
      } else if (onGameComplete) {
        // Standalone mode - just call callback
        onGameComplete(result);
      }
    },
    [mode, assignment, gameState.board, onGameComplete]
  );

  // Session tracking functions (EXACT MATCH with useGameSession.ts)
  const trackMove = useCallback((): void => {
    if (!sessionRef.current) return;

    const updatedSession = {
      ...sessionRef.current,
      movesCount: (sessionRef.current.movesCount || 0) + 1,
    };

    sessionRef.current = updatedSession;
    setSession(updatedSession);
  }, []);

  const updateScore = useCallback((newScore: number): void => {
    if (!sessionRef.current) return;

    const currentMaxScore = sessionRef.current.maxScore;
    const isScoringScoringMove = newScore > currentMaxScore;

    const updatedSession = {
      ...sessionRef.current,
      maxScore: Math.max(currentMaxScore, newScore),
      scoringMoves: isScoringScoringMove
        ? sessionRef.current.scoringMoves + 1
        : sessionRef.current.scoringMoves,
    };

    sessionRef.current = updatedSession;
    setSession(updatedSession);
  }, []);

  const isCompleted = useCallback((): boolean => {
    return sessionRef.current?.completed ?? false;
  }, []);

  const getScore = useCallback((): number => {
    return sessionRef.current?.maxScore ?? 0;
  }, []);

  // Visual settings functions
  const updateVisualSettings = useCallback((newSettings: Partial<VisualSettings>) => {
    setVisualSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Get exercise result (for compatibility)
  const getExerciseResult = useCallback((): GameResult => {
    return {
      score: sessionRef.current?.maxScore || 0,
      moves: sessionRef.current?.movesCount || 0,
      highestTile: sessionRef.current?.highestTile || 0,
      efficiency: sessionRef.current?.efficiency || 0,
      visualSettings,
    };
  }, [visualSettings]);

  return {
    // Game State (basic compatibility)
    gameState,
    isLoading,
    error,

    // Session Management (integrated mode only)
    session,
    startSession,
    endSession,

    // Visual Settings
    visualSettings,
    updateVisualSettings,

    // Results
    getExerciseResult,

    // Session Tracking (EXACT MATCH with useGameSession.ts)
    trackMove,
    updateScore,
    isCompleted,
    getScore,
  };
};

export default use2048Exercise;
