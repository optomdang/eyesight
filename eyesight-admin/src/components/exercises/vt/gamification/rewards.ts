/**
 * VT Quest — Gamification rewards logic.
 * Pure functions; no React/DOM deps.
 */

import type { VtStageResult, VtWorld } from 'src/types/core/vtQuest';

export interface ComboState {
  current: number;
  max: number;
}

/** Consecutive-correct milestones that grant bonus coins. */
export const STREAK_MILESTONES = [3, 5, 10, 15, 20, 25, 30, 35] as const;

/** Base coins per correct trial. */
export const BASE_TRIAL_COINS = 10;

/** Bonus coins when hitting an exact streak milestone. */
export const STREAK_BONUS_COINS: Record<number, number> = {
  3: 20,
  5: 35,
  10: 60,
  15: 90,
  20: 120,
  25: 150,
  30: 180,
  35: 220,
};

export interface TrialReward {
  baseCoins: number;
  streakBonus: number;
  totalCoins: number;
  isStreakMilestone: boolean;
  comboAfter: number;
}

/** Update combo counter after a trial response. */
export function updateCombo(combo: ComboState, correct: boolean): ComboState {
  if (correct) {
    const newCurrent = combo.current + 1;
    return { current: newCurrent, max: Math.max(combo.max, newCurrent) };
  }
  return { ...combo, current: 0 };
}

/** Whether combo count hits a streak bonus milestone. */
export function isStreakMilestone(combo: number): boolean {
  return combo > 0 && (STREAK_MILESTONES as readonly number[]).includes(combo);
}

/** @deprecated Use isStreakMilestone — kept for gradual migration. */
export function isComboMilestone(combo: number): boolean {
  return isStreakMilestone(combo);
}

/** Coins earned for one correct trial (base + optional streak bonus). */
export function computeTrialReward(comboAfter: number): TrialReward {
  const isMilestone = isStreakMilestone(comboAfter);
  const streakBonus = isMilestone ? (STREAK_BONUS_COINS[comboAfter] ?? 0) : 0;
  const baseCoins = BASE_TRIAL_COINS;
  return {
    baseCoins,
    streakBonus,
    totalCoins: baseCoins + streakBonus,
    isStreakMilestone: isMilestone,
    comboAfter,
  };
}

/** One-time stage completion bonus (accuracy); streak bonuses are per-trial. */
export function computeStageCompletionBonus(accuracy: number): number {
  return Math.round(accuracy * 25);
}

/** Calculate coins earned at stage end (completion bonus only — trial coins added live). */
export function computeCoins(accuracy: number, _maxCombo: number): number {
  return computeStageCompletionBonus(accuracy);
}

/** Map stars across all completed stages to a progress label shown on HUD. */
export function computeTotalProgress(stages: VtStageResult[]): {
  stars: number;
  coins: number;
  maxPossibleStars: number;
} {
  const stars = stages.reduce((sum, s) => sum + s.stars, 0);
  const coins = stages.reduce((sum, s) => sum + s.coinsEarned, 0);
  return { stars, coins, maxPossibleStars: stages.length * 3 };
}

/** Map a threshold value (0–1 contrast) to a "power level" 0–100 for child UI. */
export function thresholdToPowerLevel(threshold: number | null, world: VtWorld): number {
  if (threshold === null) return 50;
  if (world === 'gabor') {
    const clamped = Math.min(0.5, Math.max(0.02, threshold));
    return Math.round(100 - ((clamped - 0.02) / (0.5 - 0.02)) * 100);
  }
  if (world === 'stereopsis' || world === 'vernier') {
    const clamped = Math.min(800, Math.max(20, threshold));
    return Math.round(100 - ((clamped - 20) / (800 - 20)) * 100);
  }
  return 50;
}

/** Convert star count (0–max) to a percentage for progress bar. */
export function starsToPercent(stars: number, maxStars: number): number {
  if (maxStars === 0) return 0;
  return Math.round((stars / maxStars) * 100);
}
