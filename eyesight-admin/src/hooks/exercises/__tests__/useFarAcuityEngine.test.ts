import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFarAcuityEngine, FAR_LEVEL_MAX, CONTRAST_LEVEL_MAX, CONTRAST_LEVEL_MIN } from '../useFarAcuityEngine';
import { contrastVisionLevels, farVisionLevels } from 'src/utils/constant';

vi.mock('src/utils/visionUtils', () => {
  let seq = 0;
  return {
    generateRandomText: vi.fn((count: number, char: string) => {
      seq += 1;
      return Array.from({ length: count }, (_, i) => ({
        char,
        display: `L${seq}_${i}`,
        answer: undefined,
      }));
    }),
  };
});

vi.mock('src/utils/examUtils', () => ({
  evaluateAnswer: vi.fn((item: any) => ({ ...item, result: item.answer === item.display })),
}));

/** Fill `correct` answers correctly, rest wrong. */
function fill(result: { current: ReturnType<typeof useFarAcuityEngine> }, correct: number) {
  const { state, setAnswer } = result.current;
  act(() => {
    state.letters.forEach((l, i) => {
      setAnswer(i, i < correct ? l.display : '_WRONG_');
    });
  });
}

describe('useFarAcuityEngine', () => {
  describe('initialisation', () => {
    it('starts at provided farLevel and contrastLevel=1', () => {
      const { result } = renderHook(() => useFarAcuityEngine({ initialFarLevel: 10 }));
      expect(result.current.state.farLevel).toBe(10);
      expect(result.current.state.contrastLevel).toBe(1);
    });

    it('clamps initialFarLevel to valid range', () => {
      const { result } = renderHook(() => useFarAcuityEngine({ initialFarLevel: 99 }));
      expect(result.current.state.farLevel).toBe(FAR_LEVEL_MAX);
    });
  });

  describe('pass — contrast axis', () => {
    it('pass: contrastLevel 1→2, letters regenerated', () => {
      const { result } = renderHook(() => useFarAcuityEngine({ initialFarLevel: 10 }));
      const displayBefore = result.current.state.letters.map((l) => l.display);

      fill(result, 4);
      act(() => {
        result.current.submitRound();
      });

      expect(result.current.state.contrastLevel).toBe(2);
      expect(result.current.state.letters.map((l) => l.display)).not.toEqual(displayBefore);
    });

    it('second pass at same combo: contrastLevel 2→3', () => {
      const { result } = renderHook(() => useFarAcuityEngine({ initialFarLevel: 10 }));

      fill(result, 4);
      act(() => { result.current.submitRound(); }); // 1→2, passStreak=1

      fill(result, 4);
      act(() => { result.current.submitRound(); }); // 2→3, passStreak=2

      expect(result.current.state.contrastLevel).toBe(3);
    });
  });

  describe('fail — contrast axis', () => {
    it('fail at 20/50 + logCS 1.35 (contrastLevel=10): contrastLevel → 9, new letters', () => {
      expect(contrastVisionLevels[9].score).toBe('1.35');
      expect(contrastVisionLevels[8].score).toBe('1.20');

      const { result } = renderHook(() =>
        useFarAcuityEngine({ initialFarLevel: 10, initialContrastLevel: 10 })
      );
      const displayBefore = result.current.state.letters.map((l) => l.display);
      fill(result, 2);
      act(() => {
        result.current.submitRound();
      });

      expect(result.current.state.contrastLevel).toBe(9);
      expect(result.current.state.farLevel).toBe(10);
      expect(result.current.state.letters.map((l) => l.display)).not.toEqual(displayBefore);
    });
  });

  describe('fail — size axis', () => {
    it('fail at contrastLevel=1: farLevel 10→9 (20/50→20/63)', () => {
      expect(farVisionLevels[9].score).toBe('20/50');
      expect(farVisionLevels[8].score).toBe('20/63');

      const { result } = renderHook(() =>
        useFarAcuityEngine({ initialFarLevel: 10, initialContrastLevel: 1 })
      );
      fill(result, 2);
      act(() => { result.current.submitRound(); });

      expect(result.current.state.farLevel).toBe(9);
      expect(result.current.state.contrastLevel).toBe(CONTRAST_LEVEL_MIN);
    });

    it('fail at minimum far level: stays at farLevel=1, contrastLevel=1', () => {
      const { result } = renderHook(() =>
        useFarAcuityEngine({ initialFarLevel: 1, initialContrastLevel: 1 })
      );
      fill(result, 0);
      act(() => { result.current.submitRound(); });

      expect(result.current.state.farLevel).toBe(1);
      expect(result.current.state.contrastLevel).toBe(1);
    });
  });

  describe('pass at maximum contrast level', () => {
    it('pass at contrastLevel=12 (logCS 1.65): farLevel+1, contrastLevel reset to 1', () => {
      expect(contrastVisionLevels[CONTRAST_LEVEL_MAX - 1].score).toBe('1.65');

      const { result } = renderHook(() =>
        useFarAcuityEngine({ initialFarLevel: 10, initialContrastLevel: CONTRAST_LEVEL_MAX })
      );
      fill(result, 4);
      act(() => { result.current.submitRound(); });

      expect(result.current.state.farLevel).toBe(11);
      expect(result.current.state.contrastLevel).toBe(1);
    });

    it('pass at max contrast AND farLevel=20: stays at maximum', () => {
      const { result } = renderHook(() =>
        useFarAcuityEngine({ initialFarLevel: 20, initialContrastLevel: CONTRAST_LEVEL_MAX })
      );
      fill(result, 4);
      act(() => { result.current.submitRound(); });

      expect(result.current.state.farLevel).toBe(FAR_LEVEL_MAX);
      expect(result.current.state.contrastLevel).toBe(CONTRAST_LEVEL_MAX);
    });

    it('clamps initialContrastLevel above max to logCS 1.65', () => {
      const { result } = renderHook(() =>
        useFarAcuityEngine({ initialFarLevel: 10, initialContrastLevel: 16 })
      );
      expect(result.current.state.contrastLevel).toBe(CONTRAST_LEVEL_MAX);
    });
  });

  describe('accuracy boundary', () => {
    it('3/5 = 60% is pass', () => {
      const { result } = renderHook(() => useFarAcuityEngine({ initialFarLevel: 10 }));
      fill(result, 3);
      act(() => { result.current.submitRound(); });
      expect(result.current.state.contrastLevel).toBe(2); // pass → harder
    });

    it('2/5 = 40% is fail', () => {
      const { result } = renderHook(() =>
        useFarAcuityEngine({ initialFarLevel: 10, initialContrastLevel: 5 })
      );
      fill(result, 2);
      act(() => { result.current.submitRound(); });
      expect(result.current.state.contrastLevel).toBe(4); // fail → easier
    });
  });

  describe('peak tracking', () => {
    it('records peak farLevel and contrastLevel across rounds', () => {
      const { result } = renderHook(() =>
        useFarAcuityEngine({ initialFarLevel: 10, initialContrastLevel: CONTRAST_LEVEL_MAX - 1 })
      );
      fill(result, 4); // pass → contrastLevel 11→12
      act(() => { result.current.submitRound(); });

      fill(result, 4); // pass at 12 → farLevel 10→11, contrast reset to 1
      act(() => { result.current.submitRound(); });

      expect(result.current.state.peakFarLevel).toBe(11);
      expect(result.current.state.peakContrastLevel).toBe(CONTRAST_LEVEL_MAX);
    });
  });

  describe('pause/restore', () => {
    it('restoreFromSnapshot sets state back to snapshot', () => {
      const { result } = renderHook(() => useFarAcuityEngine({ initialFarLevel: 5 }));
      const snapshot = result.current.serializeForPause();

      fill(result, 4);
      act(() => { result.current.submitRound(); });
      expect(result.current.state.roundsCompleted).toBe(1);

      act(() => { result.current.restoreFromSnapshot(snapshot); });
      expect(result.current.state.roundsCompleted).toBe(0);
      expect(result.current.state.farLevel).toBe(5);
    });
  });

  describe('allAnswered', () => {
    it('false when no answers', () => {
      const { result } = renderHook(() => useFarAcuityEngine());
      expect(result.current.allAnswered).toBe(false);
    });

    it('true when all 5 filled', () => {
      const { result } = renderHook(() => useFarAcuityEngine({ initialFarLevel: 10 }));
      fill(result, 5);
      expect(result.current.allAnswered).toBe(true);
    });
  });
});
