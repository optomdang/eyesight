/**
 * Portal Exercise Components
 * Components used by patients to execute exercises
 */

// Main exercise component (the playable 2048 game)
export { default as Exercise2048 } from './Game2048Exercise';

// Dispatcher: routes an assignment to its registered exercise component
export { default as PortalExercise } from './PortalExercise';
export { default as ExerciseInfo } from './ExerciseInfo';
export { default as GameProgress } from './GameProgress';
export { default as ExitConfirmationDialog } from './ExitConfirmationDialog';
export { default as EndExerciseDialog } from './EndExerciseDialog';

// Types will be added as needed
