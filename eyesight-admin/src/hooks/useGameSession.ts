/**
 * GAME SESSION MANAGEMENT HOOK
 * Consolidates session state management that was scattered across components
 *
 * Previously defined in:
 * - src/components/exercises/shared/Game2048Board.tsx (gameSessionRef + state)
 * - src/components/exercises/portal/PortalExercise.tsx (gameExecutionRef)
 *
 * This hook provides a unified interface for tracking game execution state
 *
 * Import and use:
 * const { session, startSession, updateSession, trackMove } = useGameSession(...)
 * const gameSessionRef = useRef(...); const gameSession = useState(...)
 */

import { useRef, useCallback } from 'react';

/**
 * Options for initializing game session hook
 */
export interface UseGameSessionOptions {
  exerciseId?: number;
  sessionId?: number;
  autoSave?: boolean;
}

/**
 * Game session state
 * Represents a single game execution (one play)
 */
export interface GameSessionState {
  // Core game metrics
  score: number;
  moves: number;
  highestTile: number;
  efficiency: number;

  // Session lifecycle
  startTime: number;
  movesCount: number;
  scoringMoves: number;
  maxScore: number;
  completed: boolean;

  // Identity/context
  exerciseId: number;
  sessionId: number;
  level: number;
}

/**
 * Return type from useGameSession hook
 */
export type UseGameSessionReturn = {
  // Current session state (read-only)
  session: GameSessionState | null;

  // Initialize new session
  startSession: (exerciseId: number, sessionId?: number) => GameSessionState;

  // Update session state
  updateSession: (updates: Partial<GameSessionState>) => void;

  // Track a move
  trackMove: () => void;

  // Update score
  updateScore: (newScore: number) => void;

  // End session and get final result
  endSession: (gameWon: boolean, finalScore: number) => GameSessionState | null;

  // Check if session is completed
  isCompleted: () => boolean;

  // Get current score
  getScore: () => number;
};

/**
 * Custom hook for managing game session lifecycle
 *
 * Replaces scattered ref/state management with unified hook
 * Single source of truth for session tracking
 *
 * @param options - Configuration options
 * @returns Game session management interface
 *
 * @example
 * const { session, startSession, trackMove, endSession } = useGameSession({
 *   exerciseId: 1,
 *   sessionId: 100,
 * });
 *
 * // Start new session
 * startSession(1, 100);
 *
 * // Track moves
 * trackMove();
 *
 * // End session
 * const result = endSession(true, finalScore);
 */
export const useGameSession = (_options: UseGameSessionOptions): UseGameSessionReturn => {
  // Store session in ref to avoid re-renders on updates
  // This is intentional - session is "output" not "input"
  const sessionRef = useRef<GameSessionState | null>(null);

  /**
   * Initialize new session with default values
   * Called when game starts
   */
  const startSession = useCallback((exId: number, sessId?: number): GameSessionState => {
    const now = Date.now();

    const newSession: GameSessionState = {
      // Game2048Result properties
      score: 0,
      moves: 0,
      highestTile: 0,
      efficiency: 0,

      // ExerciseResult properties
      startTime: now,
      movesCount: 0,
      scoringMoves: 0,
      maxScore: 0,
      completed: false,

      // Tracking properties
      exerciseId: exId,
      sessionId: sessId || 0,
      level: 0,
    };

    sessionRef.current = newSession;

    return newSession;
  }, []);

  /**
   * Update session with new data
   * Used for partial updates
   */
  const updateSession = useCallback((updates: Partial<GameSessionState>): void => {
    if (!sessionRef.current) {
      return;
    }

    sessionRef.current = {
      ...sessionRef.current,
      ...updates,
    };
  }, []);

  /**
   * Track a move in the session
   * Increments movesCount
   */
  const trackMove = useCallback((): void => {
    if (!sessionRef.current) return;

    updateSession({
      movesCount: (sessionRef.current.movesCount || 0) + 1,
    });
  }, [updateSession]);

  /**
   * Update score and track scoring moves
   * A "scoring move" is a move that increases the score
   */
  const updateScore = useCallback(
    (newScore: number): void => {
      if (!sessionRef.current) return;

      const currentMaxScore = sessionRef.current.maxScore || 0;
      const isScoringScoringMove = newScore > currentMaxScore;

      updateSession({
        maxScore: Math.max(currentMaxScore, newScore),
        scoringMoves: isScoringScoringMove
          ? (sessionRef.current.scoringMoves || 0) + 1
          : sessionRef.current.scoringMoves,
      });
    },
    [updateSession]
  );

  /**
   * End session and return final result
   * Sets completed flag and calculates efficiency
   */
  const endSession = useCallback(
    (_gameWon: boolean, finalScore: number): GameSessionState | null => {
      if (!sessionRef.current) {
        return null;
      }

      // Prevent duplicate calls
      if (sessionRef.current.completed) {
        return sessionRef.current;
      }

      const session = sessionRef.current;
      const endTime = Date.now();
      const duration = (endTime - (session.startTime || 0)) / 1000; // seconds

      // Calculate efficiency (score / time or moves / time)
      const efficiency = duration > 0 ? finalScore / duration : 0;

      const completedSession: GameSessionState = {
        ...session,
        score: finalScore,
        completed: true,
        efficiency: Math.round(efficiency * 100) / 100,
      };

      sessionRef.current = completedSession;

      return completedSession;
    },
    []
  );

  /**
   * Check if current session is completed
   */
  const isCompleted = useCallback((): boolean => {
    return sessionRef.current?.completed ?? false;
  }, []);

  /**
   * Get current score without updating
   */
  const getScore = useCallback((): number => {
    return sessionRef.current?.maxScore ?? 0;
  }, []);

  return {
    session: sessionRef.current,
    startSession,
    updateSession,
    trackMove,
    updateScore,
    endSession,
    isCompleted,
    getScore,
  };
};

export default useGameSession;
