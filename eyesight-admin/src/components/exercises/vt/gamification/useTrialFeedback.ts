import { useCallback, useEffect, useRef, useState } from 'react';
import type { VtResponseSide, VtTrial, VtTrialResponseInput } from 'src/types/core/vtQuest';
import { isVtResponseCorrect, responseSideOf } from '../core/gaborTaskModes';
import { computeTrialReward } from './rewards';
import { playVtTrialFeedback } from './vtFeedbackSounds';

export interface TrialFeedbackState {
  id: number;
  correct: boolean;
  comboAfter: number;
  /** Set only for side-based responses (2AFC / SF discrimination) */
  chosenSide?: VtResponseSide;
  pointsEarned: number;
  streakBonus: number;
  isStreakMilestone: boolean;
}

const CORRECT_DELAY_MS = 720;
const COMBO_DELAY_MS = 950;
const WRONG_DELAY_MS = 580;

export function useTrialFeedback(
  submitResponse: (response: VtTrialResponseInput) => void,
  options: {
    currentTrial: VtTrial | null;
    currentCombo: number;
    enableSound?: boolean;
  }
) {
  const [feedback, setFeedback] = useState<TrialFeedbackState | null>(null);
  const [responseBlocked, setResponseBlocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTrialRef = useRef(options.currentTrial);
  currentTrialRef.current = options.currentTrial;

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const handleTrialResponse = useCallback(
    (response: VtTrialResponseInput) => {
      const trial = currentTrialRef.current;
      if (responseBlocked || !trial) return;

      const correct = isVtResponseCorrect(trial, response);
      const comboAfter = correct ? options.currentCombo + 1 : 0;
      const reward = correct ? computeTrialReward(comboAfter) : null;
      const streakMilestone = reward?.isStreakMilestone ?? false;

      setResponseBlocked(true);
      setFeedback({
        id: Date.now(),
        correct,
        comboAfter,
        chosenSide: responseSideOf(response),
        pointsEarned: reward?.totalCoins ?? 0,
        streakBonus: reward?.streakBonus ?? 0,
        isStreakMilestone: streakMilestone,
      });

      if (options.enableSound !== false) {
        playVtTrialFeedback(correct, streakMilestone);
      }

      const delay = correct
        ? streakMilestone
          ? COMBO_DELAY_MS
          : CORRECT_DELAY_MS
        : WRONG_DELAY_MS;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setFeedback(null);
        setResponseBlocked(false);
        submitResponse(response);
      }, delay);
    },
    [
      responseBlocked,
      options.currentCombo,
      options.enableSound,
      submitResponse,
    ]
  );

  return { handleTrialResponse, feedback, responseBlocked };
}
