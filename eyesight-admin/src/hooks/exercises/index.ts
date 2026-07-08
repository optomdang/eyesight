/**
 * Exercise Hooks Barrel Export
 * Centralized exports for all exercise-related hooks
 */

// 2048 Exercise Hook
export { use2048Exercise } from './use2048Exercise';
export type {
  ExerciseMode,
  Use2048ExerciseOptions,
  GameResult,
  GameSession,
  Use2048ExerciseReturn,
} from './use2048Exercise';

// Game Initialization Hook
export { useGame2048Initialization } from './useGame2048Initialization';
export type {
  UseGame2048InitializationOptions,
  UseGame2048InitializationReturn,
} from './useGame2048Initialization';

// Re-export related types from core
export type {
  Game2048State,
  Game2048Result,
  Game2048SessionResult,
  VisualSettings,
} from 'src/types/core';
