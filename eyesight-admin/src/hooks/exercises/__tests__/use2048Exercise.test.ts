/**
 * Unit Tests for Unified use2048Exercise Hook
 * Tests session management and API integration logic
 *
 * CRITICAL: These tests verify session tracking matches original useGameSession behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { use2048Exercise, ExerciseMode } from '../use2048Exercise';

// Mock dependencies
vi.mock('src/utils/request', () => ({
  getData: vi.fn(),
  postData: vi.fn(),
}));

vi.mock('src/contexts/authGuard/useAuth', () => ({
  default: () => ({
    user: { id: 1, name: 'Test User' },
  }),
}));

import { getData, postData } from 'src/utils/request';

describe('Unified use2048Exercise Hook - Session Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Standalone Mode', () => {
    it('should initialize in standalone mode without API calls', () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      expect(result.current.session).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(getData).not.toHaveBeenCalled();
    });

    it('should have basic game state in standalone mode', () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      expect(result.current.gameState).toBeDefined();
      expect(result.current.gameState.board).toHaveLength(4);
      expect(result.current.gameState.score).toBe(0);
    });

    it('should allow starting session in standalone mode', async () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      await act(async () => {
        await result.current.startSession();
      });

      expect(result.current.session).not.toBeNull();
      expect(result.current.session?.startTime).toBeDefined();
      expect(result.current.session?.movesCount).toBe(0);
      expect(result.current.session?.maxScore).toBe(0);
    });

    it('should track moves correctly in standalone mode', async () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      await act(async () => {
        await result.current.startSession();
      });

      act(() => {
        result.current.trackMove();
        result.current.trackMove();
        result.current.trackMove();
      });

      expect(result.current.session?.movesCount).toBe(3);
    });

    it('should update score correctly in standalone mode', async () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      await act(async () => {
        await result.current.startSession();
      });

      act(() => {
        result.current.updateScore(100);
      });

      expect(result.current.session?.maxScore).toBe(100);

      act(() => {
        result.current.updateScore(200);
      });

      expect(result.current.session?.maxScore).toBe(200);
    });

    it('should track scoring moves correctly', async () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      await act(async () => {
        await result.current.startSession();
      });

      // First score update - should be a scoring move
      act(() => {
        result.current.updateScore(100);
      });
      expect(result.current.session?.scoringMoves).toBe(1);

      // Same score - should NOT be a scoring move
      act(() => {
        result.current.updateScore(100);
      });
      expect(result.current.session?.scoringMoves).toBe(1);

      // Higher score - should be a scoring move
      act(() => {
        result.current.updateScore(200);
      });
      expect(result.current.session?.scoringMoves).toBe(2);

      // Lower score - should NOT be a scoring move
      act(() => {
        result.current.updateScore(150);
      });
      expect(result.current.session?.scoringMoves).toBe(2);
    });
  });

  describe('Integrated Mode', () => {
    const mockAssignment = {
      id: 1,
      exerciseConfig: {
        exerciseId: 10,
        fontSize: 20,
        contrast: 80,
        colorScheme: {
          preset: 'blueWhite',
          textColor: '#003366',
          backgroundColor: '#e6f3ff',
        },
      },
      visionLevel: 5,
    };

    beforeEach(() => {
      vi.mocked(getData).mockResolvedValue(mockAssignment);
      vi.mocked(postData).mockResolvedValue({ success: true });
    });

    it('should load assignment in integrated mode', async () => {
      const { result } = renderHook(() =>
        use2048Exercise({
          mode: 'integrated',
          assignmentId: 1,
        })
      );

      await waitFor(() => {
        expect(getData).toHaveBeenCalledWith('/me/assignments/1');
      });
    });

    it('should extract visual settings from assignment config', async () => {
      const { result } = renderHook(() =>
        use2048Exercise({
          mode: 'integrated',
          assignmentId: 1,
        })
      );

      await waitFor(() => {
        expect(result.current.visualSettings.fontSize).toBe(20);
        expect(result.current.visualSettings.contrast).toBe(80);
      });
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(getData).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        use2048Exercise({
          mode: 'integrated',
          assignmentId: 1,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Không thể tải thông tin bài tập');
      });
    });
  });

  describe('Session Lifecycle', () => {
    it('should start session with correct initial values', async () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      const beforeStart = Date.now();

      await act(async () => {
        await result.current.startSession();
      });

      const afterStart = Date.now();

      expect(result.current.session).not.toBeNull();
      expect(result.current.session!.startTime).toBeGreaterThanOrEqual(beforeStart);
      expect(result.current.session!.startTime).toBeLessThanOrEqual(afterStart);
      expect(result.current.session!.movesCount).toBe(0);
      expect(result.current.session!.scoringMoves).toBe(0);
      expect(result.current.session!.maxScore).toBe(0);
      expect(result.current.session!.completed).toBe(false);
    });

    it('should end session and mark as completed', async () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      await act(async () => {
        await result.current.startSession();
      });

      act(() => {
        result.current.updateScore(500);
        result.current.trackMove();
        result.current.trackMove();
      });

      await act(async () => {
        await result.current.endSession({
          score: 500,
          moves: 2,
          highestTile: 64,
          efficiency: 250,
        });
      });

      expect(result.current.session?.completed).toBe(true);
      expect(result.current.session?.score).toBe(500);
    });

    it('should prevent duplicate session end calls', async () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      await act(async () => {
        await result.current.startSession();
      });

      await act(async () => {
        await result.current.endSession({
          score: 100,
          moves: 1,
          highestTile: 4,
          efficiency: 100,
        });
      });

      // Try to end again
      await act(async () => {
        await result.current.endSession({
          score: 200,
          moves: 2,
          highestTile: 8,
          efficiency: 100,
        });
      });

      // Score should remain from first end call (duplicate end is prevented)
      expect(result.current.session?.score).toBe(100);
    });

    it('should call onGameComplete callback when session ends', async () => {
      const onGameComplete = vi.fn();

      const { result } = renderHook(() =>
        use2048Exercise({
          mode: 'standalone',
          onGameComplete,
        })
      );

      await act(async () => {
        await result.current.startSession();
      });

      await act(async () => {
        await result.current.endSession({
          score: 100,
          moves: 1,
          highestTile: 4,
          efficiency: 100,
        });
      });

      expect(onGameComplete).toHaveBeenCalledWith({
        score: 100,
        moves: 1,
        highestTile: 4,
        efficiency: 100,
      });
    });
  });

  describe('Helper Functions', () => {
    it('isCompleted should return correct status', async () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      expect(result.current.isCompleted()).toBe(false);

      await act(async () => {
        await result.current.startSession();
      });

      expect(result.current.isCompleted()).toBe(false);

      await act(async () => {
        await result.current.endSession({
          score: 100,
          moves: 1,
          highestTile: 4,
          efficiency: 100,
        });
      });

      expect(result.current.isCompleted()).toBe(true);
    });

    it('getScore should return max score', async () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      expect(result.current.getScore()).toBe(0);

      await act(async () => {
        await result.current.startSession();
      });

      act(() => {
        result.current.updateScore(100);
        result.current.updateScore(200);
        result.current.updateScore(150); // Lower, should not update max
      });

      expect(result.current.getScore()).toBe(200);
    });

    it('getExerciseResult should return current state', async () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      await act(async () => {
        await result.current.startSession();
      });

      act(() => {
        result.current.updateScore(300);
        result.current.trackMove();
        result.current.trackMove();
      });

      const exerciseResult = result.current.getExerciseResult();

      expect(exerciseResult.score).toBe(300);
      expect(exerciseResult.moves).toBe(2);
    });
  });

  describe('Visual Settings', () => {
    it('should initialize with default visual settings', () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      expect(result.current.visualSettings).toBeDefined();
      expect(result.current.visualSettings.colorScheme).toBeDefined();
      expect(result.current.visualSettings.contrast).toBe(100);
      expect(result.current.visualSettings.fontSize).toBe(16);
    });

    it('should accept initial visual settings', () => {
      const customSettings = {
        colorScheme: {
          preset: 'redGreen' as const,
          textColor: '#ff0000',
          backgroundColor: '#00ff00',
        },
        contrast: 80,
        fontSize: 24,
      };

      const { result } = renderHook(() =>
        use2048Exercise({
          mode: 'standalone',
          visualSettings: customSettings,
        })
      );

      expect(result.current.visualSettings.contrast).toBe(80);
      expect(result.current.visualSettings.fontSize).toBe(24);
    });

    it('should update visual settings', () => {
      const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

      act(() => {
        result.current.updateVisualSettings({ fontSize: 32 });
      });

      expect(result.current.visualSettings.fontSize).toBe(32);
      // Other settings should remain unchanged
      expect(result.current.visualSettings.contrast).toBe(100);
    });
  });
});

describe('Unified use2048Exercise Hook - Original useGameSession Compatibility', () => {
  /**
   * These tests verify that the unified hook maintains exact compatibility
   * with the original useGameSession.ts behavior
   */

  it('should match original session state structure', async () => {
    const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

    await act(async () => {
      await result.current.startSession();
    });

    const session = result.current.session!;

    // Original useGameSession properties
    expect(session).toHaveProperty('startTime');
    expect(session).toHaveProperty('movesCount');
    expect(session).toHaveProperty('scoringMoves');
    expect(session).toHaveProperty('maxScore');
    expect(session).toHaveProperty('completed');
    expect(session).toHaveProperty('exerciseId');
    expect(session).toHaveProperty('sessionId');
    expect(session).toHaveProperty('level');

    // Game2048Result properties
    expect(session).toHaveProperty('score');
    expect(session).toHaveProperty('moves');
    expect(session).toHaveProperty('highestTile');
    expect(session).toHaveProperty('efficiency');
  });

  it('should track moves exactly like original useGameSession', async () => {
    const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

    await act(async () => {
      await result.current.startSession();
    });

    // Original: movesCount: (sessionRef.current.movesCount || 0) + 1
    expect(result.current.session?.movesCount).toBe(0);

    act(() => {
      result.current.trackMove();
    });
    expect(result.current.session?.movesCount).toBe(1);

    act(() => {
      result.current.trackMove();
    });
    expect(result.current.session?.movesCount).toBe(2);
  });

  it('should update score exactly like original useGameSession', async () => {
    const { result } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

    await act(async () => {
      await result.current.startSession();
    });

    // Original logic:
    // const isScoringScoringMove = newScore > currentMaxScore;
    // maxScore: Math.max(currentMaxScore, newScore),
    // scoringMoves: isScoringScoringMove ? scoringMoves + 1 : scoringMoves

    act(() => {
      result.current.updateScore(50);
    });
    expect(result.current.session?.maxScore).toBe(50);
    expect(result.current.session?.scoringMoves).toBe(1);

    act(() => {
      result.current.updateScore(30); // Lower - not a scoring move
    });
    expect(result.current.session?.maxScore).toBe(50); // Max unchanged
    expect(result.current.session?.scoringMoves).toBe(1); // Not incremented

    act(() => {
      result.current.updateScore(100); // Higher - scoring move
    });
    expect(result.current.session?.maxScore).toBe(100);
    expect(result.current.session?.scoringMoves).toBe(2);
  });
});
