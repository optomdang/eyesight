/**
 * Exercise Components Barrel Export
 * Centralized exports for all exercise-related components
 */

// Shared Components
export { default as ExerciseStats } from './shared/ExerciseStats';
export { default as ExerciseTimer } from './shared/ExerciseTimer';
export { default as Game2048Board } from './shared/Game2048Board';

// Admin Components
export { default as Game2048Component } from './admin/Game2048Component';
export { default as Game2048Results } from './admin/Game2048Results';

// Portal Components
export { default as PortalExercise } from './portal/PortalExercise';
export { default as GameHeader } from './portal/GameHeader';
export { default as GameControls } from './portal/GameControls';
export { default as GameProgress } from './portal/GameProgress';
export { default as ExitConfirmationDialog } from './portal/ExitConfirmationDialog';

// Types
export type { ExerciseStatsProps } from './shared/ExerciseStats';
export type { ExerciseTimerProps } from './shared/ExerciseTimer';
