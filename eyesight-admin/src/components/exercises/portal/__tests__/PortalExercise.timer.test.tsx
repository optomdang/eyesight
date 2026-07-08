/**
 * PortalExercise Timer Logic Tests
 *
 * Test logic xử lý thời gian trong bài tập (không render full component)
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock game session để test logic
interface GameSession {
  startTime: number;
  completed: boolean;
  maxScore: number;
  movesCount: number;
  scoringMoves: number;
}

// Helper functions extracted from PortalExercise logic
class TimerLogic {
  private gameSession: GameSession | null = null;
  private timeRemaining: number | null = null;
  private showTimeUpDialog = false;
  private timeoutStatus: 'idle' | 'submitting' | 'submitted' | 'failed' = 'idle';

  startSession(duration: number): void {
    this.gameSession = {
      startTime: Date.now(),
      completed: false,
      maxScore: 0,
      movesCount: 0,
      scoringMoves: 0,
    };
    this.timeRemaining = duration * 60 * 1000; // Convert to ms
    this.showTimeUpDialog = false;
    this.timeoutStatus = 'idle';
  }

  updateCountdown(currentTime: number, duration: number): void {
    if (!this.gameSession || !duration) {
      this.timeRemaining = null;
      return;
    }

    const durationMs = duration * 60 * 1000;
    const elapsed = currentTime - this.gameSession.startTime;
    const remaining = Math.max(0, durationMs - elapsed);

    if (remaining <= 0) {
      this.timeRemaining = 0;

      // Mark as completed when time up
      if (this.gameSession && !this.gameSession.completed) {
        this.gameSession.completed = true;
        this.showTimeUpDialog = true;
        this.timeoutStatus = 'submitting';
      }
      return;
    }

    this.timeRemaining = remaining;
  }

  canMove(): boolean {
    // Block moves if session is completed
    if (this.gameSession && this.gameSession.completed) {
      return false;
    }
    return true;
  }

  canTickElapsedTime(): boolean {
    return Boolean(this.gameSession && !this.gameSession.completed);
  }

  completeTimeoutSubmission(): void {
    this.timeoutStatus = 'submitted';
  }

  failTimeoutSubmission(): void {
    this.timeoutStatus = 'failed';
  }

  retryTimeoutSubmission(): void {
    this.timeoutStatus = 'submitting';
  }

  getTimeRemaining(): number | null {
    return this.timeRemaining;
  }

  isShowingTimeUpDialog(): boolean {
    return this.showTimeUpDialog;
  }

  isCompleted(): boolean {
    return this.gameSession?.completed ?? false;
  }

  getTimeoutStatus(): 'idle' | 'submitting' | 'submitted' | 'failed' {
    return this.timeoutStatus;
  }
}

describe('PortalExercise Timer Logic', () => {
  let timer: TimerLogic;

  beforeEach(() => {
    timer = new TimerLogic();
  });

  describe('Countdown Timer', () => {
    it('should initialize with correct duration', () => {
      const duration = 1; // 1 minute
      timer.startSession(duration);

      expect(timer.getTimeRemaining()).toBe(60000); // 60 seconds in ms
      expect(timer.isCompleted()).toBe(false);
    });

    it('should countdown from duration to zero', () => {
      const duration = 1; // 1 minute
      timer.startSession(duration);

      const startTime = Date.now();

      // After 30 seconds
      timer.updateCountdown(startTime + 30000, duration);
      expect(timer.getTimeRemaining()).toBe(30000);
      expect(timer.isCompleted()).toBe(false);

      // After 60 seconds (time up)
      timer.updateCountdown(startTime + 60000, duration);
      expect(timer.getTimeRemaining()).toBe(0);
      expect(timer.isCompleted()).toBe(true);
    });

    it('should not go below zero', () => {
      const duration = 1;
      timer.startSession(duration);

      const startTime = Date.now();

      // After 90 seconds (past duration)
      timer.updateCountdown(startTime + 90000, duration);
      expect(timer.getTimeRemaining()).toBe(0);
      expect(timer.isCompleted()).toBe(true);
    });
  });

  describe('Time Up Dialog', () => {
    it('should show dialog when time reaches zero', () => {
      const duration = 1;
      timer.startSession(duration);

      const startTime = Date.now();

      expect(timer.isShowingTimeUpDialog()).toBe(false);

      // Time up
      timer.updateCountdown(startTime + 60000, duration);

      expect(timer.isShowingTimeUpDialog()).toBe(true);
      expect(timer.isCompleted()).toBe(true);
    });

    it('should not show dialog before time up', () => {
      const duration = 1;
      timer.startSession(duration);

      const startTime = Date.now();

      // 30 seconds remaining
      timer.updateCountdown(startTime + 30000, duration);

      expect(timer.isShowingTimeUpDialog()).toBe(false);
      expect(timer.isCompleted()).toBe(false);
    });

    it('should only show dialog once', () => {
      const duration = 1;
      timer.startSession(duration);

      const startTime = Date.now();

      // First time up
      timer.updateCountdown(startTime + 60000, duration);
      expect(timer.isShowingTimeUpDialog()).toBe(true);

      // Update again (should not change)
      timer.updateCountdown(startTime + 61000, duration);
      expect(timer.isShowingTimeUpDialog()).toBe(true);
    });
  });

  describe('Game Blocking', () => {
    it('should allow moves before time up', () => {
      const duration = 1;
      timer.startSession(duration);

      expect(timer.canMove()).toBe(true);
      expect(timer.canTickElapsedTime()).toBe(true);
    });

    it('should block moves when time is up', () => {
      const duration = 1;
      timer.startSession(duration);

      const startTime = Date.now();

      // Time up
      timer.updateCountdown(startTime + 60000, duration);

      expect(timer.canMove()).toBe(false);
      expect(timer.canTickElapsedTime()).toBe(false);
    });

    it('should block moves when completed flag is set', () => {
      const duration = 1;
      timer.startSession(duration);

      const startTime = Date.now();
      timer.updateCountdown(startTime + 60000, duration);

      expect(timer.isCompleted()).toBe(true);
      expect(timer.canMove()).toBe(false);
      expect(timer.canTickElapsedTime()).toBe(false);
    });
  });

  describe('Timeout Submission States', () => {
    it('should enter submitting state when time is up', () => {
      const duration = 1;
      timer.startSession(duration);

      const startTime = Date.now();

      // Time up
      timer.updateCountdown(startTime + 60000, duration);
      expect(timer.isCompleted()).toBe(true);
      expect(timer.canMove()).toBe(false);
      expect(timer.getTimeoutStatus()).toBe('submitting');
    });

    it('should switch to submitted state after successful auto-submit', () => {
      const duration = 1;
      timer.startSession(duration);

      const startTime = Date.now();

      // Time up
      timer.updateCountdown(startTime + 60000, duration);
      expect(timer.isShowingTimeUpDialog()).toBe(true);

      timer.completeTimeoutSubmission();

      expect(timer.isShowingTimeUpDialog()).toBe(true);
      expect(timer.getTimeoutStatus()).toBe('submitted');
    });

    it('should switch to failed state when auto-submit fails', () => {
      const duration = 1;
      timer.startSession(duration);

      const startTime = Date.now();

      // Time up
      timer.updateCountdown(startTime + 60000, duration);
      expect(timer.getTimeoutStatus()).toBe('submitting');

      timer.failTimeoutSubmission();

      expect(timer.getTimeoutStatus()).toBe('failed');
      expect(timer.canMove()).toBe(false);
    });
  });

  describe('No Duration', () => {
    it('should not show timer when duration is 0', () => {
      timer.startSession(0);

      const startTime = Date.now();
      timer.updateCountdown(startTime + 60000, 0);

      expect(timer.getTimeRemaining()).toBeNull();
      expect(timer.isCompleted()).toBe(false);
    });

    it('should allow unlimited play when no duration', () => {
      timer.startSession(0);

      const startTime = Date.now();

      // Advance way past normal duration
      timer.updateCountdown(startTime + 120000, 0);

      expect(timer.canMove()).toBe(true);
      expect(timer.isCompleted()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid countdown updates', () => {
      const duration = 1;
      timer.startSession(duration);

      const startTime = Date.now();

      // Rapid updates
      for (let i = 0; i < 60; i++) {
        timer.updateCountdown(startTime + i * 1000, duration);
      }

      // Should reach time up
      timer.updateCountdown(startTime + 60000, duration);
      expect(timer.isCompleted()).toBe(true);
    });

    it('should keep the session locked after time up', () => {
      const duration = 1;
      timer.startSession(duration);

      const startTime = Date.now();

      // First time up
      timer.updateCountdown(startTime + 60000, duration);
      expect(timer.isCompleted()).toBe(true);
      expect(timer.canMove()).toBe(false);
      expect(timer.getTimeoutStatus()).toBe('submitting');
    });

    it('should not crash with null session', () => {
      // Don't start session
      expect(timer.canMove()).toBe(true);
      expect(timer.isCompleted()).toBe(false);
      expect(timer.getTimeRemaining()).toBeNull();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete flow: start -> countdown -> time up -> submit success', () => {
      const duration = 1;

      // Start
      timer.startSession(duration);
      expect(timer.getTimeRemaining()).toBe(60000);
      expect(timer.canMove()).toBe(true);

      const startTime = Date.now();

      // Countdown
      timer.updateCountdown(startTime + 30000, duration);
      expect(timer.getTimeRemaining()).toBe(30000);
      expect(timer.canMove()).toBe(true);

      // Time up
      timer.updateCountdown(startTime + 60000, duration);
      expect(timer.getTimeRemaining()).toBe(0);
      expect(timer.isShowingTimeUpDialog()).toBe(true);
      expect(timer.canMove()).toBe(false);
      expect(timer.getTimeoutStatus()).toBe('submitting');

      timer.completeTimeoutSubmission();
      expect(timer.isShowingTimeUpDialog()).toBe(true);
      expect(timer.getTimeoutStatus()).toBe('submitted');
      expect(timer.canMove()).toBe(false);
    });

    it('should handle pause before time up', () => {
      const duration = 1;
      timer.startSession(duration);

      const startTime = Date.now();

      // Countdown to 30 seconds
      timer.updateCountdown(startTime + 30000, duration);
      expect(timer.getTimeRemaining()).toBe(30000);

      // Simulate pause (mark as completed)
      if (timer['gameSession']) {
        timer['gameSession'].completed = true;
      }

      // Should block moves
      expect(timer.canMove()).toBe(false);
    });
  });
});
