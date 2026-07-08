import { describe, it, expect } from 'vitest';
import {
  computeTrialReward,
  computeStageCompletionBonus,
  isStreakMilestone,
  STREAK_MILESTONES,
  STREAK_BONUS_COINS,
} from '../rewards';

describe('rewards', () => {
  it('isStreakMilestone matches defined milestones only', () => {
    expect(isStreakMilestone(3)).toBe(true);
    expect(isStreakMilestone(5)).toBe(true);
    expect(isStreakMilestone(35)).toBe(true);
    expect(isStreakMilestone(4)).toBe(false);
    expect(isStreakMilestone(6)).toBe(false);
  });

  it('computeTrialReward adds streak bonus at milestones', () => {
    const normal = computeTrialReward(2);
    expect(normal.totalCoins).toBe(10);
    expect(normal.streakBonus).toBe(0);

    const at3 = computeTrialReward(3);
    expect(at3.streakBonus).toBe(STREAK_BONUS_COINS[3]);
    expect(at3.totalCoins).toBe(10 + STREAK_BONUS_COINS[3]);
    expect(at3.isStreakMilestone).toBe(true);

    const at35 = computeTrialReward(35);
    expect(at35.streakBonus).toBe(STREAK_BONUS_COINS[35]);
  });

  it('every milestone has a bonus defined', () => {
    for (const m of STREAK_MILESTONES) {
      expect(STREAK_BONUS_COINS[m]).toBeGreaterThan(0);
    }
  });

  it('computeStageCompletionBonus scales with accuracy', () => {
    expect(computeStageCompletionBonus(1)).toBe(25);
    expect(computeStageCompletionBonus(0.8)).toBe(20);
    expect(computeStageCompletionBonus(0)).toBe(0);
  });
});
