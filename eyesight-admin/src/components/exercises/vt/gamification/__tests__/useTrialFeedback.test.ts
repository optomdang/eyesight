import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrialFeedback } from '../useTrialFeedback';
import type { VtTrial } from 'src/types/core/vtQuest';

const trial: VtTrial = {
  trialIndex: 0,
  world: 'gabor',
  signalSide: 'left',
  response: null,
  correct: null,
  difficultyValue: 0.4,
  reactionTimeMs: null,
};

describe('useTrialFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays submitResponse until feedback animation completes', () => {
    const submit = vi.fn();
    const { result } = renderHook(() =>
      useTrialFeedback(submit, {
        currentTrial: trial,
        currentCombo: 0,
        enableSound: false,
      })
    );

    act(() => {
      result.current.handleTrialResponse('left');
    });

    expect(submit).not.toHaveBeenCalled();
    expect(result.current.feedback?.correct).toBe(true);
    expect(result.current.responseBlocked).toBe(true);

    act(() => {
      vi.advanceTimersByTime(720);
    });

    expect(submit).toHaveBeenCalledWith('left');
    expect(result.current.feedback).toBeNull();
    expect(result.current.responseBlocked).toBe(false);
  });

  it('marks incorrect response in feedback state', () => {
    const submit = vi.fn();
    const { result } = renderHook(() =>
      useTrialFeedback(submit, {
        currentTrial: trial,
        currentCombo: 2,
        enableSound: false,
      })
    );

    act(() => {
      result.current.handleTrialResponse('right');
    });

    expect(result.current.feedback?.correct).toBe(false);

    act(() => {
      vi.advanceTimersByTime(580);
    });

    expect(submit).toHaveBeenCalledWith('right');
  });
});
