/**
 * Property-Based Tests for Unified use2048Exercise Hook
 *
 * **Feature: frontend-optimization, Property 1: Hook Mode Behavior**
 * - Test standalone mode makes no API calls for any game operation
 * - Test integrated mode makes correct API calls with valid assignmentId
 *
 * **Validates: Requirements 1.2, 1.3, 1.6**
 *
 * Uses fast-check for property-based testing with minimum 100 iterations
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { use2048Exercise, ExerciseMode, GameResult } from '../use2048Exercise';

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

// Arbitrary for score values (positive integers)
const scoreArb = fc.integer({ min: 0, max: 100000 });

// Arbitrary for game result
const gameResultArb: fc.Arbitrary<GameResult> = fc.record({
  score: fc.integer({ min: 0, max: 100000 }),
  moves: fc.integer({ min: 0, max: 10000 }),
  highestTile: fc.constantFrom(2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096),
  efficiency: fc.float({ min: 0, max: 1000 }),
});

// Arbitrary for valid assignment IDs
const assignmentIdArb = fc.integer({ min: 1, max: 1000000 });

// Arbitrary for visual settings updates
const visualSettingsUpdateArb = fc.record({
  fontSize: fc.integer({ min: 8, max: 72 }),
  contrast: fc.integer({ min: 0, max: 100 }),
});

// Arbitrary for sequence of game operations (simplified for sync execution)
type GameOperation =
  | { type: 'trackMove' }
  | { type: 'updateScore'; score: number }
  | { type: 'updateVisualSettings'; settings: { fontSize: number; contrast: number } };

const gameOperationArb: fc.Arbitrary<GameOperation> = fc.oneof(
  fc.constant({ type: 'trackMove' as const }),
  fc.record({ type: fc.constant('updateScore' as const), score: scoreArb }),
  fc.record({
    type: fc.constant('updateVisualSettings' as const),
    settings: visualSettingsUpdateArb,
  })
);

const gameOperationSequenceArb = fc.array(gameOperationArb, { minLength: 1, maxLength: 20 });

describe('Property 1: Hook Mode Behavior', () => {
  /**
   * **Feature: frontend-optimization, Property 1: Hook Mode Behavior**
   *
   * *For any* exercise hook instance with mode='standalone', *no* API calls
   * should be made during game operations (move, restart, initializeBoard).
   * *For any* hook instance with mode='integrated' and valid assignmentId,
   * session operations should trigger appropriate API calls.
   *
   * **Validates: Requirements 1.2, 1.3, 1.6**
   */

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock responses
    vi.mocked(getData).mockResolvedValue({
      id: 1,
      exerciseConfig: {
        exerciseId: 10,
        fontSize: 16,
        contrast: 100,
      },
      visionLevel: 5,
    });
    vi.mocked(postData).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Standalone Mode - No API Calls Property', () => {
    it('should never make API calls for any game operation sequence in standalone mode', async () => {
      /**
       * Property: For all sequences of game operations in standalone mode,
       * no API calls (getData, postData) should ever be made.
       */
      await fc.assert(
        fc.asyncProperty(gameOperationSequenceArb, async (operations) => {
          vi.clearAllMocks();

          const { result, unmount } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

          // Start session first
          await act(async () => {
            await result.current.startSession();
          });

          // Execute all operations synchronously within a single act
          act(() => {
            for (const op of operations) {
              switch (op.type) {
                case 'trackMove':
                  result.current.trackMove();
                  break;
                case 'updateScore':
                  result.current.updateScore(op.score);
                  break;
                case 'updateVisualSettings':
                  result.current.updateVisualSettings(op.settings);
                  break;
              }
            }
          });

          // Verify no API calls were made
          const getDataCalls = vi.mocked(getData).mock.calls.length;
          const postDataCalls = vi.mocked(postData).mock.calls.length;

          unmount();

          return getDataCalls === 0 && postDataCalls === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should never make API calls when ending session in standalone mode', async () => {
      /**
       * Property: For all game results in standalone mode,
       * ending the session should not trigger any API calls.
       */
      await fc.assert(
        fc.asyncProperty(gameResultArb, async (gameResult) => {
          vi.clearAllMocks();

          const { result, unmount } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

          await act(async () => {
            await result.current.startSession();
          });

          // Simulate some game activity
          act(() => {
            result.current.trackMove();
            result.current.updateScore(gameResult.score);
          });

          // End session
          await act(async () => {
            await result.current.endSession(gameResult);
          });

          // Verify no API calls were made
          const getDataCalls = vi.mocked(getData).mock.calls.length;
          const postDataCalls = vi.mocked(postData).mock.calls.length;

          unmount();

          return getDataCalls === 0 && postDataCalls === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain session state correctly for any operation sequence in standalone mode', async () => {
      /**
       * Property: For all operation sequences in standalone mode,
       * the session state should be consistent and correctly updated.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.oneof(
              fc.constant({ type: 'trackMove' as const }),
              fc.record({ type: fc.constant('updateScore' as const), score: scoreArb })
            ),
            { minLength: 1, maxLength: 50 }
          ),
          async (operations) => {
            const { result, unmount } = renderHook(() => use2048Exercise({ mode: 'standalone' }));

            await act(async () => {
              await result.current.startSession();
            });

            let expectedMoves = 0;
            let expectedMaxScore = 0;
            let expectedScoringMoves = 0;

            // Execute operations and track expected state
            act(() => {
              for (const op of operations) {
                if (op.type === 'trackMove') {
                  result.current.trackMove();
                  expectedMoves++;
                } else if (op.type === 'updateScore') {
                  const prevMax = expectedMaxScore;
                  result.current.updateScore(op.score);
                  if (op.score > prevMax) {
                    expectedMaxScore = op.score;
                    expectedScoringMoves++;
                  }
                }
              }
            });

            // Verify state consistency
            const actualMoves = result.current.session?.movesCount ?? -1;
            const actualMaxScore = result.current.session?.maxScore ?? -1;
            const actualScoringMoves = result.current.session?.scoringMoves ?? -1;

            unmount();

            return (
              actualMoves === expectedMoves &&
              actualMaxScore === expectedMaxScore &&
              actualScoringMoves === expectedScoringMoves
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Integrated Mode - API Calls Property', () => {
    it('should make getData call with correct URL for any valid assignmentId', async () => {
      /**
       * Property: For all valid assignment IDs in integrated mode,
       * getData should be called with the correct endpoint URL.
       */
      await fc.assert(
        fc.asyncProperty(assignmentIdArb, async (assignmentId) => {
          vi.clearAllMocks();

          const { unmount } = renderHook(() =>
            use2048Exercise({
              mode: 'integrated',
              assignmentId,
            })
          );

          // Wait for the effect to run
          await waitFor(() => {
            expect(getData).toHaveBeenCalled();
          });

          const calls = vi.mocked(getData).mock.calls;
          const expectedUrl = `/me/assignments/${assignmentId}`;
          const hasCorrectCall = calls.some((call) => call[0] === expectedUrl);

          unmount();

          return hasCorrectCall;
        }),
        { numRuns: 100 }
      );
    });

    it('should make postData call with correct payload when ending session in integrated mode', async () => {
      /**
       * Property: For all game results in integrated mode with valid assignment,
       * postData should be called with the correct endpoint and payload structure.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            assignmentId: assignmentIdArb,
            gameResult: gameResultArb,
          }),
          async ({ assignmentId, gameResult }) => {
            vi.clearAllMocks();

            const mockAssignment = {
              id: assignmentId,
              exerciseConfig: {
                exerciseId: 10,
                fontSize: 16,
                contrast: 100,
              },
              visionLevel: 5,
            };

            vi.mocked(getData).mockResolvedValue(mockAssignment);
            vi.mocked(postData).mockResolvedValue({ success: true });

            const { result, unmount } = renderHook(() =>
              use2048Exercise({
                mode: 'integrated',
                assignmentId,
              })
            );

            // Wait for assignment to load
            await waitFor(() => {
              expect(getData).toHaveBeenCalled();
            });

            // Start session
            await act(async () => {
              await result.current.startSession();
            });

            // Simulate game activity
            act(() => {
              result.current.trackMove();
              result.current.updateScore(gameResult.score);
            });

            // End session
            await act(async () => {
              await result.current.endSession(gameResult);
            });

            // Verify postData was called
            const postDataCalls = vi.mocked(postData).mock.calls;

            if (postDataCalls.length === 0) {
              unmount();
              return false;
            }

            const lastCall = postDataCalls[postDataCalls.length - 1];
            const url = lastCall[0] as string;
            const payload = lastCall[1] as Record<string, unknown>;

            // Verify URL pattern matches /me/assignments/{id}/sessions/{sessionId}/results
            const urlPattern = /^\/me\/assignments\/\d+\/sessions\/\d+\/results$/;
            const urlMatches = urlPattern.test(url);

            // Verify payload structure
            const hasRequiredFields =
              payload.exerciseAssignmentId === assignmentId &&
              payload.score === gameResult.score &&
              payload.completed === true;

            unmount();

            return urlMatches && hasRequiredFields;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Mode Invariants', () => {
    it('should have consistent return interface regardless of mode', async () => {
      /**
       * Property: For all modes, the hook should return the same interface structure.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('standalone', 'integrated') as fc.Arbitrary<ExerciseMode>,
          async (mode) => {
            vi.clearAllMocks();

            const options = mode === 'integrated' ? { mode, assignmentId: 1 } : { mode };

            const { result, unmount } = renderHook(() => use2048Exercise(options));

            // Verify all expected properties exist
            const hasAllProperties =
              'gameState' in result.current &&
              'isLoading' in result.current &&
              'error' in result.current &&
              'session' in result.current &&
              'startSession' in result.current &&
              'endSession' in result.current &&
              'visualSettings' in result.current &&
              'updateVisualSettings' in result.current &&
              'getExerciseResult' in result.current &&
              'trackMove' in result.current &&
              'updateScore' in result.current &&
              'isCompleted' in result.current &&
              'getScore' in result.current;

            // Verify functions are callable
            const functionsAreCallable =
              typeof result.current.startSession === 'function' &&
              typeof result.current.endSession === 'function' &&
              typeof result.current.trackMove === 'function' &&
              typeof result.current.updateScore === 'function' &&
              typeof result.current.isCompleted === 'function' &&
              typeof result.current.getScore === 'function' &&
              typeof result.current.getExerciseResult === 'function' &&
              typeof result.current.updateVisualSettings === 'function';

            unmount();

            return hasAllProperties && functionsAreCallable;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should initialize with null session regardless of mode', async () => {
      /**
       * Property: For all modes, initial session should be null.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('standalone', 'integrated') as fc.Arbitrary<ExerciseMode>,
          async (mode) => {
            vi.clearAllMocks();

            const options = mode === 'integrated' ? { mode, assignmentId: 1 } : { mode };

            const { result, unmount } = renderHook(() => use2048Exercise(options));

            const sessionIsNull = result.current.session === null;

            unmount();

            return sessionIsNull;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
