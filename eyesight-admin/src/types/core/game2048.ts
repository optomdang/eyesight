/**
 * GAME2048 SPECIFIC TYPES - SINGLE SOURCE OF TRUTH
 * Consolidates Game2048 type definitions that were scattered across components
 *
 * Previously defined in:
 * - src/components/exercises/shared/Game2048Board.tsx
 * - src/components/exercises/portal/PortalExercise.tsx
 * - src/components/exercises/admin/Game2048Preview.tsx
 *
 * Import from here instead of inline definitions:
 * import { GameManager, GameGrid } from 'src/types/core/game2048'
 * import type { GameManager } from 'src/types/core'
 * import GameManager from './Game2048Board'
 */

import type { VisualSettings } from './visual-settings';

// ============ GAME2048 MANAGER & GRID ============

/**
 * GameManager interface - represents the 2048 game instance
 * Consolidated from multiple component definitions
 *
 * This is the public API of the GameManager class loaded from /2048/js/game_manager.js
 * DO NOT modify this lightly - it reflects the external library's interface
 */
export interface GameManager {
  // Core game methods
  restart: () => void;
  setup: (isLoadPreviousGame?: boolean) => void;
  move: (direction: number) => boolean;
  actuate: (grid: GameGrid, metadata: GameMetadata) => void;
  serialize: () => GameState;

  // Lifecycle teardown: removes the input manager's document-level keyboard
  // listener. Call on unmount to avoid leaking listeners across game instances.
  destroy?: () => void;

  // Vision scaling extension (monkey-patched by our code)
  applyVisualSettings?: (settings: VisualSettings) => void;
  _cleanupMoveTracking?: () => void;

  // Game state properties
  score?: number;
  over?: boolean;
  won?: boolean;
  keepPlaying?: boolean;
  grid?: GameGrid;
  actuator?: {
    actuate: (grid: unknown, metadata: unknown) => void;
  };
  storageManager?: {
    getGameState: () => GameState | null;
    setGameState: (state: GameState) => void;
    clearGameState: () => void;
  };
}

/**
 * GameGrid interface - represents the game board state
 * Consolidated from Game2048Board.tsx definition
 *
 * The grid is a 2D array of numbers representing tile values
 * Example: [[2, 4, 0, 0], [8, 0, 16, 0], ...]
 */
export interface GameGrid {
  cells: unknown[][]; // 2D array of tile values (or null)
  size: number; // Board size (typically 4 for 4x4)
  serialize?: () => unknown; // Serialize grid to JSON-compatible format
}

/**
 * GameState interface - full serialized game state for save/restore
 * Used by GameManager.serialize() and LocalStorageManager
 */
export interface GameState {
  grid: unknown; // Serialized grid state
  score: number; // Current score
  over: boolean; // Is game over
  won: boolean; // Has player won
  keepPlaying: boolean; // Continue playing after winning
}

/**
 * GameMetadata interface - metadata about current game state
 * Consolidated from Game2048Board.tsx definition
 *
 * Used when rendering the game (passed to actuator)
 */
export interface GameMetadata {
  score: number; // Current score
  over: boolean; // Is game over (no more moves)
  won: boolean; // Has player won (reached 2048)
  bestScore: number; // Best score ever achieved
}

// ============ WINDOW GLOBALS ============

/**
 * Extend Window interface to include Game2048 library globals
 * These are loaded from /2048/js/*.js files
 *
 * Previously declared in:
 * - src/components/exercises/admin/Game2048Preview.tsx
 * - src/components/exercises/portal/PortalExercise.tsx
 */
declare global {
  interface Window {
    // Core game classes from /2048/js/*.js
    GameManager: any; // The main game class
    KeyboardInputManager: any; // Handles keyboard input (arrow keys)
    HTMLActuator: any; // Renders the game board to HTML
    LocalStorageManager: any; // Manages save/load from localStorage
    Grid: any; // Represents the grid state
    Tile: any; // Represents a single tile
  }
}

// ============ TYPE EXPORTS FOR CONVENIENCE ============

/**
 * Type guard to check if object is a GameManager
 */
export function isGameManager(obj: unknown): obj is GameManager {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'restart' in obj &&
    'setup' in obj &&
    'actuate' in obj &&
    'move' in obj
  );
}
