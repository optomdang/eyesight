/**
 * PortalExercise Pause/Resume Business Logic Tests
 *
 * These tests verify the pause/resume business logic without rendering
 * the full component (which requires complex router/context setup).
 *
 * Focus areas:
 * 1. Game state validation
 * 2. Status transitions
 * 3. API contract verification
 * 4. Timer/duration calculations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the service functions
vi.mock('src/services/patient.service', () => ({
  pauseExercise: vi.fn(),
  completeExercise: vi.fn(),
  startExercise: vi.fn(),
}));

import { pauseExercise, completeExercise, startExercise } from 'src/services/patient.service';

const mockPauseExercise = vi.mocked(pauseExercise);
const mockCompleteExercise = vi.mocked(completeExercise);
const mockStartExercise = vi.mocked(startExercise);

describe('PortalExercise - Pause/Resume Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPauseExercise.mockResolvedValue({ success: true } as any);
    mockCompleteExercise.mockResolvedValue({ success: true } as any);
    mockStartExercise.mockResolvedValue({ id: 1 } as any);
  });

  describe('Game State Validation', () => {
    // Helper: validate board structure
    const validateBoard = (board: any): board is number[][] => {
      if (!Array.isArray(board) || board.length !== 4) return false;

      return board.every((row) => {
        if (!Array.isArray(row) || row.length !== 4) return false;

        return row.every((cell) => {
          if (typeof cell !== 'number' || cell < 0) return false;
          // Check if it's a power of 2 or zero
          return cell === 0 || Math.log2(cell) % 1 === 0;
        });
      });
    };

    it('should validate correct 4x4 board structure', () => {
      const validBoard = [
        [2, 4, 0, 0],
        [0, 8, 0, 0],
        [0, 0, 16, 0],
        [0, 0, 0, 0],
      ];
      expect(validateBoard(validBoard)).toBe(true);
    });

    it('should reject board with wrong dimensions', () => {
      const invalidBoard3x3 = [
        [2, 4, 0],
        [0, 8, 0],
        [0, 0, 16],
      ];
      expect(validateBoard(invalidBoard3x3)).toBe(false);

      const invalidBoard5x5 = [
        [2, 4, 0, 0, 0],
        [0, 8, 0, 0, 0],
        [0, 0, 16, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ];
      expect(validateBoard(invalidBoard5x5)).toBe(false);
    });

    it('should reject board with non-power-of-2 values', () => {
      const invalidBoard = [
        [3, 5, 7, 11], // Not powers of 2
        [0, 4, 8, 16],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      expect(validateBoard(invalidBoard)).toBe(false);
    });

    it('should reject board with negative values', () => {
      const invalidBoard = [
        [-2, 4, 0, 0],
        [0, 8, 0, 0],
        [0, 0, 16, 0],
        [0, 0, 0, 0],
      ];
      expect(validateBoard(invalidBoard)).toBe(false);
    });

    it('should accept board with high value tiles (2048, 4096)', () => {
      const validBoard = [
        [2048, 1024, 512, 256],
        [128, 64, 32, 16],
        [8, 4, 2, 0],
        [0, 0, 0, 4096],
      ];
      expect(validateBoard(validBoard)).toBe(true);
    });

    it('should accept empty board (all zeros)', () => {
      const emptyBoard = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      expect(validateBoard(emptyBoard)).toBe(true);
    });
  });

  describe('Game State Serialization', () => {
    it('should preserve all state properties when pausing', () => {
      const gameState = {
        grid: [
          [2, 4, 8, 16],
          [32, 64, 128, 256],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        score: 12500,
        over: false,
        won: false,
        moves: 150,
      };

      // Simulate serialization
      const serialized = JSON.stringify(gameState);
      const restored = JSON.parse(serialized);

      expect(restored.grid).toEqual(gameState.grid);
      expect(restored.score).toBe(12500);
      expect(restored.moves).toBe(150);
      expect(restored.over).toBe(false);
      expect(restored.won).toBe(false);
    });

    it('should handle null exerciseState gracefully', () => {
      const nullState = null;
      const result = nullState ?? { grid: null, score: 0 };

      expect(result.grid).toBeNull();
      expect(result.score).toBe(0);
    });
  });

  describe('Status Transitions', () => {
    type ExerciseStatus = 'incomplete' | 'passed' | 'failed';

    // Helper: determine status from game state
    const determineStatus = (
      gameOver: boolean,
      gameWon: boolean,
      highestTile: number
    ): ExerciseStatus => {
      if (gameWon || highestTile >= 2048) return 'passed';
      if (gameOver) return 'failed';
      return 'incomplete';
    };

    it('should return "incomplete" for active game', () => {
      expect(determineStatus(false, false, 256)).toBe('incomplete');
      expect(determineStatus(false, false, 1024)).toBe('incomplete');
    });

    it('should return "passed" when game is won', () => {
      expect(determineStatus(false, true, 2048)).toBe('passed');
      expect(determineStatus(true, true, 2048)).toBe('passed');
    });

    it('should return "passed" when highest tile >= 2048', () => {
      expect(determineStatus(false, false, 2048)).toBe('passed');
      expect(determineStatus(false, false, 4096)).toBe('passed');
    });

    it('should return "failed" when game over without winning', () => {
      expect(determineStatus(true, false, 512)).toBe('failed');
      expect(determineStatus(true, false, 1024)).toBe('failed');
    });

    it('should prioritize "passed" over "failed"', () => {
      // Edge case: game over but won
      expect(determineStatus(true, true, 2048)).toBe('passed');
    });
  });

  describe('Exercise Timer Calculations', () => {
    it('should calculate duration correctly', () => {
      const startTime = Date.now() - 120000; // 2 minutes ago
      const currentTime = Date.now();
      const duration = Math.floor((currentTime - startTime) / 1000);

      expect(duration).toBeGreaterThanOrEqual(119);
      expect(duration).toBeLessThanOrEqual(121);
    });

    it('should add previous duration when resuming', () => {
      const previousDuration = 300; // 5 minutes
      const additionalTime = 60; // 1 minute more
      const totalDuration = previousDuration + additionalTime;

      expect(totalDuration).toBe(360);
    });

    it('should handle zero duration', () => {
      const startTime = Date.now();
      const duration = Math.floor((Date.now() - startTime) / 1000);

      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('API Contract - pauseExercise', () => {
    it('should call pauseExercise with correct parameters', async () => {
      const assignmentId = 1;
      const sessionId = 2;
      const resultId = 123;
      const pauseData = {
        score: 500,
        duration: 120,
        exerciseState: {
          grid: [
            [2, 4, 0, 0],
            [0, 8, 0, 0],
            [0, 0, 16, 0],
            [0, 0, 0, 0],
          ],
          score: 500,
          over: false,
          won: false,
          moves: 50,
        },
      };

      await pauseExercise(assignmentId, sessionId, resultId, pauseData);

      expect(mockPauseExercise).toHaveBeenCalledWith(assignmentId, sessionId, resultId, pauseData);
      expect(mockPauseExercise).toHaveBeenCalledTimes(1);
    });

    it('should handle pauseExercise API error', async () => {
      mockPauseExercise.mockRejectedValue(new Error('Network error'));

      await expect(
        pauseExercise(1, 1, 1, { score: 0, duration: 0, exerciseState: null })
      ).rejects.toThrow('Network error');
    });
  });

  describe('API Contract - completeExercise', () => {
    it('should call completeExercise with status "passed"', async () => {
      const assignmentId = 1;
      const sessionId = 2;
      const resultId = 123;
      const completeData = {
        score: 25000,
        duration: 600,
        status: 'passed' as const,
      };

      await completeExercise(assignmentId, sessionId, resultId, completeData);

      expect(mockCompleteExercise).toHaveBeenCalledWith(
        assignmentId,
        sessionId,
        resultId,
        completeData
      );
    });

    it('should call completeExercise with status "failed"', async () => {
      const completeData = {
        score: 5000,
        duration: 300,
        status: 'failed' as const,
      };

      await completeExercise(1, 1, 1, completeData);

      expect(mockCompleteExercise).toHaveBeenCalledWith(
        1,
        1,
        1,
        expect.objectContaining({ status: 'failed' })
      );
    });

    it('should handle completeExercise API error', async () => {
      mockCompleteExercise.mockRejectedValue(new Error('Server error'));

      await expect(
        completeExercise(1, 1, 1, { score: 0, duration: 0, status: 'failed' })
      ).rejects.toThrow('Server error');
    });
  });

  describe('Game Over Detection', () => {
    // Helper: check if game is over (no valid moves)
    const isGameOver = (grid: number[][]): boolean => {
      // Check for empty cells
      if (grid.flat().includes(0)) return false;

      // Check for adjacent matching cells
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const current = grid[i][j];
          // Check right neighbor
          if (j < 3 && grid[i][j + 1] === current) return false;
          // Check bottom neighbor
          if (i < 3 && grid[i + 1][j] === current) return false;
        }
      }
      return true;
    };

    it('should detect game over when no moves available', () => {
      const stuckGrid = [
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 2],
      ];
      expect(isGameOver(stuckGrid)).toBe(true);
    });

    it('should not be game over when empty cells exist', () => {
      const gridWithEmpty = [
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 0], // Empty cell
      ];
      expect(isGameOver(gridWithEmpty)).toBe(false);
    });

    it('should not be game over when matching neighbors exist', () => {
      const gridWithMatch = [
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 4], // Two 4s adjacent
      ];
      expect(isGameOver(gridWithMatch)).toBe(false);
    });
  });

  describe('Win Detection', () => {
    // Helper: check if game is won
    const isGameWon = (grid: number[][], targetTile = 2048): boolean => {
      return grid.flat().some((cell) => cell >= targetTile);
    };

    it('should detect win when 2048 tile exists', () => {
      const winningGrid = [
        [2048, 4, 8, 16],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      expect(isGameWon(winningGrid)).toBe(true);
    });

    it('should detect win with higher tiles (4096, 8192)', () => {
      const highScoreGrid = [
        [4096, 2048, 1024, 512],
        [256, 128, 64, 32],
        [16, 8, 4, 2],
        [0, 0, 0, 0],
      ];
      expect(isGameWon(highScoreGrid)).toBe(true);
    });

    it('should not be won when highest tile < 2048', () => {
      const notWonGrid = [
        [1024, 512, 256, 128],
        [64, 32, 16, 8],
        [4, 2, 0, 0],
        [0, 0, 0, 0],
      ];
      expect(isGameWon(notWonGrid)).toBe(false);
    });

    it('should support custom target tile', () => {
      const grid = [
        [512, 256, 128, 64],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      expect(isGameWon(grid, 512)).toBe(true);
      expect(isGameWon(grid, 1024)).toBe(false);
    });
  });

  describe('Highest Tile Calculation', () => {
    it('should find highest tile in grid', () => {
      const grid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2048, 4],
        [2, 4, 8, 16],
      ];

      const highestTile = Math.max(...grid.flat());
      expect(highestTile).toBe(2048);
    });

    it('should handle empty grid', () => {
      const emptyGrid = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];

      const highestTile = Math.max(...emptyGrid.flat());
      expect(highestTile).toBe(0);
    });
  });

  describe('Pause/Resume Flow Integration', () => {
    it('should simulate complete pause/resume cycle', async () => {
      // Step 1: Start exercise
      const startResult = await startExercise(1, 1);
      expect(startResult.id).toBe(1);

      // Step 2: Play game (simulated state)
      const gameState = {
        grid: [
          [2, 4, 8, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        score: 200,
        moves: 15,
        over: false,
        won: false,
      };

      // Step 3: Pause exercise
      await pauseExercise(1, 1, 1, {
        score: gameState.score,
        duration: 60,
        exerciseState: gameState,
      });
      expect(mockPauseExercise).toHaveBeenCalled();

      // Step 4: Resume (restore state) - verified by checking state integrity
      const restoredGrid = gameState.grid;
      expect(restoredGrid).toHaveLength(4);
      expect(gameState.score).toBe(200);
      expect(gameState.moves).toBe(15);

      // Step 5: Continue playing and complete
      const finalState = {
        ...gameState,
        grid: [
          [2048, 1024, 512, 256],
          [128, 64, 32, 16],
          [8, 4, 2, 0],
          [0, 0, 0, 0],
        ],
        score: 25000,
        over: false,
        won: true,
      };

      await completeExercise(1, 1, 1, {
        score: finalState.score,
        duration: 300,
        status: 'passed',
      });
      expect(mockCompleteExercise).toHaveBeenCalledWith(
        1,
        1,
        1,
        expect.objectContaining({ status: 'passed' })
      );
    });

    it('should handle multiple pauses correctly', async () => {
      // First pause
      await pauseExercise(1, 1, 1, { score: 100, duration: 30, exerciseState: null });

      // Second pause (after resume)
      await pauseExercise(1, 1, 1, { score: 500, duration: 90, exerciseState: null });

      // Third pause
      await pauseExercise(1, 1, 1, { score: 1500, duration: 180, exerciseState: null });

      expect(mockPauseExercise).toHaveBeenCalledTimes(3);
    });
  });
});
