/**
 * Far Acuity — gamification (coins, combo, round feedback) reusing VT Quest rewards/sounds.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BASE_TRIAL_COINS, computeTrialReward } from 'src/components/exercises/vt/gamification/rewards';
import { playVtTrialFeedback } from 'src/components/exercises/vt/gamification/vtFeedbackSounds';

export interface FarAcuityGamificationState {
  totalCoins: number;
  currentCombo: number;
  maxCombo: number;
}

export interface RoundFeedbackState {
  id: number;
  correct: boolean;
  correctCount: number;
  comboAfter: number;
  pointsEarned: number;
  streakBonus: number;
  isStreakMilestone: boolean;
}

const CORRECT_DELAY_MS = 720;
const COMBO_DELAY_MS = 950;
const WRONG_DELAY_MS = 580;

export function useFarAcuityGamification(enableSound = true) {
  const [gamification, setGamification] = useState<FarAcuityGamificationState>({
    totalCoins: 0,
    currentCombo: 0,
    maxCombo: 0,
  });
  const [feedback, setFeedback] = useState<RoundFeedbackState | null>(null);
  const [feedbackBlocked, setFeedbackBlocked] = useState(false);
  const comboRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const restoreGamification = useCallback((snapshot: FarAcuityGamificationState) => {
    comboRef.current = snapshot.currentCombo;
    setGamification(snapshot);
  }, []);

  const getGamificationSnapshot = useCallback(
    (): FarAcuityGamificationState => gamification,
    [gamification]
  );

  const processRound = useCallback(
    (correctCount: number, passed: boolean): Promise<void> =>
      new Promise((resolve) => {
        const comboAfter = passed ? comboRef.current + 1 : 0;
        let streakBonus = 0;
        let isStreakMilestone = false;
        let pointsEarned = 0;

        if (passed) {
          const reward = computeTrialReward(comboAfter);
          streakBonus = reward.streakBonus;
          isStreakMilestone = reward.isStreakMilestone;
          pointsEarned = correctCount * BASE_TRIAL_COINS + streakBonus;
        }

        comboRef.current = comboAfter;
        setGamification((prev) => ({
          totalCoins: prev.totalCoins + pointsEarned,
          currentCombo: comboAfter,
          maxCombo: Math.max(prev.maxCombo, comboAfter),
        }));

        setFeedbackBlocked(true);
        setFeedback({
          id: Date.now(),
          correct: passed,
          correctCount,
          comboAfter,
          pointsEarned,
          streakBonus,
          isStreakMilestone,
        });

        if (enableSound) {
          playVtTrialFeedback(passed, isStreakMilestone);
        }

        const delay = passed
          ? isStreakMilestone
            ? COMBO_DELAY_MS
            : CORRECT_DELAY_MS
          : WRONG_DELAY_MS;

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setFeedback(null);
          setFeedbackBlocked(false);
          resolve();
        }, delay);
      }),
    [enableSound]
  );

  return {
    totalCoins: gamification.totalCoins,
    currentCombo: gamification.currentCombo,
    maxCombo: gamification.maxCombo,
    feedback,
    feedbackBlocked,
    processRound,
    restoreGamification,
    getGamificationSnapshot,
  };
}
