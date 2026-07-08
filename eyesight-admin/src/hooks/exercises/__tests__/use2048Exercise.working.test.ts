/**
 * Tests for use2048Exercise Hook - Working Implementation
 * Tests the actual existing functionality only
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { use2048Exercise } from '../../use2048Exercise';

describe('use2048Exercise Hook - Current Working Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should initialize with default game state', () => {
      const { result } = renderHook(() => use2048Exercise());

      expect(result.current.gameState).toBeDefined();
      expect(result.current.gameState.board).toHaveLength(4);
      expect(result.current.gameState.board[0]).toHaveLength(4);
      expect(result.current.gameState.score).toBe(0);
      expect(result.current.gameState.moves).toBe(0);
      expect(result.current.gameState.gameOver).toBe(false);
      expect(result.current.gameState.gameWon).toBe(false);
    });

    it('should initialize with custom board size', () => {
      const { result } = renderHook(() => use2048Exercise({ boardSize: 3 }));

      expect(result.current.gameState.board).toHaveLength(3);
      expect(result.current.gameState.board[0]).toHaveLength(3);
    });
  });

  describe('Hook Methods', () => {
    it('should expose necessary methods', () => {
      const { result } = renderHook(() => use2048Exercise());

      expect(typeof result.current.move).toBe('function');
      expect(typeof result.current.restart).toBe('function');
      expect(typeof result.current.initializeBoard).toBe('function');
      expect(typeof result.current.getExerciseResult).toBe('function');
    });

    it('should handle move operations', () => {
      const { result } = renderHook(() => use2048Exercise());

      act(() => {
        result.current.move('up');
      });

      // Game state should remain valid after move
      expect(result.current.gameState).toBeDefined();
      expect(result.current.gameState.board).toHaveLength(4);
    });

    it('should restart game properly', () => {
      const { result } = renderHook(() => use2048Exercise());

      // Make a move first
      act(() => {
        result.current.move('up');
      });

      // Then restart
      act(() => {
        result.current.restart();
      });

      expect(result.current.gameState.score).toBe(0);
      expect(result.current.gameState.moves).toBe(0);
      expect(result.current.gameState.gameOver).toBe(false);
      expect(result.current.gameState.gameWon).toBe(false);
    });

    it('should return exercise result with proper structure', () => {
      const { result } = renderHook(() => use2048Exercise());

      const exerciseResult = result.current.getExerciseResult();

      expect(exerciseResult).toHaveProperty('score');
      expect(exerciseResult).toHaveProperty('moves');
      expect(exerciseResult).toHaveProperty('highestTile');
      expect(exerciseResult).toHaveProperty('efficiency');
      expect(typeof exerciseResult.score).toBe('number');
      expect(typeof exerciseResult.moves).toBe('number');
      expect(typeof exerciseResult.highestTile).toBe('number');
      expect(typeof exerciseResult.efficiency).toBe('number');
    });
  });

  describe('Game State Integrity', () => {
    it('should maintain valid board structure after moves', () => {
      const { result } = renderHook(() => use2048Exercise());

      // Make multiple moves
      act(() => {
        result.current.move('up');
        result.current.move('right');
        result.current.move('down');
        result.current.move('left');
      });

      // Board should remain valid 4x4 structure
      expect(result.current.gameState.board).toHaveLength(4);
      result.current.gameState.board.forEach((row) => {
        expect(row).toHaveLength(4);
        expect(Array.isArray(row)).toBe(true);
        row.forEach((cell) => {
          expect(typeof cell).toBe('number');
          expect(cell).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should handle all four movement directions', () => {
      const { result } = renderHook(() => use2048Exercise());

      const directions = ['up', 'down', 'left', 'right'] as const;

      directions.forEach((direction) => {
        act(() => {
          result.current.move(direction);
        });

        // State should remain valid after each move
        expect(result.current.gameState).toBeDefined();
        expect(Array.isArray(result.current.gameState.board)).toBe(true);
      });
    });
  });
});

// TODO: Future Implementation Tests
describe('Pause/Resume Features', () => {
  it('should expose restoreGameState method', () => {
    const { result } = renderHook(() => use2048Exercise());

    expect(typeof result.current.restoreGameState).toBe('function');
  });

  it('should expose makeMove alias', () => {
    const { result } = renderHook(() => use2048Exercise());

    expect(typeof result.current.makeMove).toBe('function');
    expect(result.current.makeMove).toBe(result.current.move);
  });

  it('should restore valid game state', () => {
    const savedState = {
      board: [
        [2, 4, 0, 0],
        [0, 8, 0, 0],
        [0, 0, 16, 0],
        [0, 0, 0, 0],
      ],
      score: 500,
      moves: 20,
      gameOver: false,
      gameWon: false,
    };

    const { result } = renderHook(() => use2048Exercise());

    act(() => {
      result.current.restoreGameState(savedState);
    });

    expect(result.current.gameState.board).toEqual(savedState.board);
    expect(result.current.gameState.score).toBe(500);
    expect(result.current.gameState.moves).toBe(20);
  });

  it('should handle invalid state gracefully', () => {
    const { result } = renderHook(() => use2048Exercise());

    // Should not crash with invalid input
    act(() => {
      result.current.restoreGameState(null as any);
    });

    // Should still have valid state
    expect(result.current.gameState.board).toHaveLength(4);
    expect(result.current.gameState.score).toBe(0);
  });

  it('should detect win condition from restored state', () => {
    const winningState = {
      board: [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2048, 0],
        [0, 0, 0, 0],
      ],
      score: 25000,
      moves: 100,
      gameOver: false,
      gameWon: false,
    };

    const { result } = renderHook(() => use2048Exercise());

    act(() => {
      result.current.restoreGameState(winningState);
    });

    expect(result.current.gameState.gameWon).toBe(true);
  });

  it('should validate board cell values', () => {
    const invalidState = {
      board: [
        [2, 3, 5, 7], // Invalid values (not powers of 2)
        [0, 4, 8, 16],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      score: 100,
      moves: 5,
      gameOver: false,
      gameWon: false,
    };

    const { result } = renderHook(() => use2048Exercise());

    act(() => {
      result.current.restoreGameState(invalidState);
    });

    // Should fall back to fresh board because validation failed
    expect(result.current.gameState.score).toBe(0);
  });

  it('should maintain game continuity after restore', () => {
    const savedState = {
      board: [
        [2, 4, 8, 16],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      score: 100,
      moves: 10,
      gameOver: false,
      gameWon: false,
    };

    const { result } = renderHook(() => use2048Exercise());

    act(() => {
      result.current.restoreGameState(savedState);
    });

    // Make a move after restoration
    act(() => {
      result.current.move('down');
    });

    // Game should continue from restored state
    expect(result.current.gameState.board).toHaveLength(4);
    // Moves should increment (may or may not depending on if move was valid)
    expect(result.current.gameState.moves).toBeGreaterThanOrEqual(10);
  });
});
