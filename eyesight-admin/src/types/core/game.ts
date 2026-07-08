/**
 * GAME TYPES - SINGLE SOURCE OF TRUTH
 * All game-related types for vision training games
 * Consolidates definitions from:
 * - src/types/shared/game.ts (partial)
 * - src/types/exercise.ts (partial)
 * - Inline definitions in hooks
 */

import type { VisualSettings } from './visual-settings';

// ============ 2048 GAME TYPES ============

/**
 * State of 2048 game board
 */
export interface Game2048State {
  board: number[][]; // Game board state (e.g., 4x4)
  score: number; // Current score
  moves: number; // Move count
  gameOver: boolean; // Is game over
  gameWon: boolean; // Has player won (reached 2048)
  startTime?: number; // Game start timestamp
  restartCount?: number; // Times restarted
}

/**
 * Options for initializing 2048 game hook
 */
export interface Game2048Options {
  visualSettings?: VisualSettings;
  targetTile?: number; // Usually 2048
  boardSize?: number; // Usually 4x4
}

/**
 * Result of 2048 game
 */
export interface Game2048Result {
  score: number;
  moves: number;
  highestTile: number;
  efficiency: number; // Score / moves
  completionTime?: number; // Seconds
  visualSettings?: VisualSettings;
}

/**
 * Game result with session info
 */
export interface Game2048SessionResult extends Game2048Result {
  sessionId?: string;
  timestamp?: number;
  startTime?: number | null; // Session start time
  endTime?: number | null; // Session end time
  restartCount?: number; // Number of restarts
  rawData?: Record<string, unknown>;
}

// ============ GENERIC GAME TYPES ============

export type GameType = '2048' | 'visual' | 'contrast' | 'color' | 'stereopsis';

/**
 * Configuration for generic game
 */
export interface GameConfig {
  type: GameType;
  difficulty: number;
  duration?: number; // Seconds
  visualSettings: VisualSettings;
}

/**
 * Generic game result
 */
export interface GameResult {
  type: GameType;
  score: number;
  timeSpent: number; // Seconds
  passed: boolean;
  metadata?: Record<string, unknown>;
}

// ============ EXERCISE RESULT (extends game result) ============

/**
 * Result of an exercise game with clinical data
 */
export interface ExerciseGameResult extends GameResult {
  exerciseId: number;
  assignmentId: number;
  level: number;
  visionLevel?: number;
  accuracy?: number;
  completedAt: string;
}
