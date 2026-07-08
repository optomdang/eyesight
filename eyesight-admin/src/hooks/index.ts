/**
 * Hooks Barrel Export
 * Centralized exports for all custom hooks
 */

// Exercise hooks
export { use2048Exercise, useGame2048Initialization } from './exercises';
export type {
  ExerciseMode,
  Use2048ExerciseOptions,
  Use2048ExerciseReturn,
  GameResult,
  GameSession,
  UseGame2048InitializationOptions,
  UseGame2048InitializationReturn,
} from './exercises';

// Data table hooks
export { useDataTable } from './useDataTable';

// Autocomplete hooks
export { useAutocompleteOptions } from './useAutocompleteOptions';

// Other hooks can be added here as needed
// export { useCustomHook } from './useCustomHook';
