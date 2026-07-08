const {
  examSessionCompletionPct,
  exerciseSlotCompletionPct,
  computePatientCompletionPct,
  computeCenterExerciseStats,
  computeCenterExamComplianceRate,
  computePatientFocusPct,
  computeSessionFocusScore,
  resolveInactivityCountOnComplete,
  isExerciseSlotFullyComplete,
  COMPLETION_TIME_THRESHOLD_PCT,
} = require('../../../src/services/dashboard/leaderboardMetrics');

describe('leaderboardMetrics', () => {
  describe('examSessionCompletionPct', () => {
    it('far: 2 mắt đủ → 100%, 1 mắt → 50%', () => {
      expect(
        examSessionCompletionPct({ leftEyeLevel: 7, rightEyeLevel: 8 }, 'far')
      ).toBe(100);
      expect(examSessionCompletionPct({ leftEyeLevel: 7, rightEyeLevel: null }, 'far')).toBe(50);
      expect(examSessionCompletionPct(null, 'far')).toBe(0);
    });

    it('stereopsis: chỉ bothEye', () => {
      expect(examSessionCompletionPct({ bothEyeLevel: 10 }, 'stereopsis')).toBe(100);
      expect(examSessionCompletionPct({ bothEyeLevel: null }, 'stereopsis')).toBe(0);
    });
  });

  describe('exerciseSlotCompletionPct', () => {
    it('maps duration to % of assigned time', () => {
      expect(exerciseSlotCompletionPct(180, 5)).toBe(60); // 3p / 5p
      expect(exerciseSlotCompletionPct(240, 5)).toBe(80);
      expect(exerciseSlotCompletionPct(300, 5)).toBe(100);
    });

    it('80% threshold marks full completion', () => {
      expect(isExerciseSlotFullyComplete(240, 5)).toBe(true);
      expect(isExerciseSlotFullyComplete(239, 5)).toBe(false);
      expect(COMPLETION_TIME_THRESHOLD_PCT).toBe(80);
    });
  });

  describe('computePatientCompletionPct', () => {
    it('TB % trên test (theo mắt) + lượt tập (theo thời gian) — legacy khi không có assignment', () => {
      const pct = computePatientCompletionPct({
        examSessions: [{ id: 1, examType: 'far' }],
        examResultBySessionId: {
          1: { leftEyeLevel: 7, rightEyeLevel: null },
        },
        exerciseSessions: [{ id: 10, executionCount: 2, executionDuration: 5 }],
        exerciseResultsBySessionId: {
          10: [
            { status: 'completed', duration: 300, pauseCount: 0, inactivityCount: 0 },
            { status: 'incomplete', duration: 150, pauseCount: 0, inactivityCount: 0 },
          ],
        },
      });
      expect(pct).toBeCloseTo(66.67, 1);
    });

    it('tính 0% cho chu kỳ không tập (9 ngày giao, 2 lượt/ngày, chỉ 1 ngày làm đủ)', () => {
      const assignedAt = new Date('2026-06-22T08:00:00+07:00');
      const now = new Date('2026-06-30T12:00:00+07:00');
      const pct = computePatientCompletionPct({
        exerciseAssignments: [
          {
            id: 27,
            assignedAt,
            frequency: 'daily',
            executionCount: 2,
          },
        ],
        exerciseSessions: [
          {
            id: 156,
            exerciseAssignmentId: 27,
            executionCount: 2,
            executionDuration: 1,
            startedAt: new Date('2026-06-30T00:00:00+07:00'),
          },
        ],
        exerciseResultsBySessionId: {
          156: [
            { status: 'completed', duration: 60 },
            { status: 'completed', duration: 60 },
          ],
        },
        now,
      });
      // 9 ngày × 2 lượt = 18 đơn vị; chỉ 2 lượt 100% hôm nay → 200/18 ≈ 11.11
      expect(pct).toBeCloseTo(11.11, 1);
    });
  });

  describe('computeCenterExerciseStats', () => {
    it('tính #21/#22 center với chu kỳ bỏ lỡ', () => {
      const assignedAt = new Date('2026-06-22T08:00:00+07:00');
      const stats = computeCenterExerciseStats({
        exerciseAssignments: [
          {
            id: 1,
            patientId: 10,
            assignedAt,
            frequency: 'daily',
            executionCount: 2,
            executionDuration: 1,
            exerciseType: '2048',
          },
        ],
        exerciseSessions: [
          {
            id: 100,
            exerciseAssignmentId: 1,
            executionCount: 2,
            executionDuration: 1,
            startedAt: new Date('2026-06-30T00:00:00+07:00'),
          },
        ],
        exerciseResultsBySessionId: {
          100: [
            { status: 'completed', duration: 60 },
            { status: 'completed', duration: 60 },
          ],
        },
        windowStart: assignedAt,
        windowEnd: new Date('2026-06-30T12:00:00+07:00'),
      });
      expect(stats.countComplianceRate).toBeCloseTo(11.11, 1);
      expect(stats.timeCompletionRate).toBeCloseTo(11.11, 1);
    });
  });

  describe('computeCenterExamComplianceRate', () => {
    it('đếm phiên kỳ vọng kể cả ngày không có ExamSession', () => {
      const createdAt = new Date('2026-06-22T08:00:00+07:00');
      const result = computeCenterExamComplianceRate({
        examAssignments: [
          { patientId: 5, examType: 'far', frequency: 'daily', createdAt },
        ],
        examSessions: [
          {
            patientId: 5,
            examType: 'far',
            scheduledDate: new Date('2026-06-30T00:00:00+07:00'),
            status: 'completed',
          },
        ],
        windowStart: createdAt,
        windowEnd: new Date('2026-06-30T12:00:00+07:00'),
      });
      expect(result.totalSessions).toBe(9);
      expect(result.completedSessions).toBe(1);
      expect(result.testComplianceRate).toBeCloseTo(11.11, 1);
    });
  });

  describe('computePatientFocusPct', () => {
    it('TB focusScore = 100 − pause − inactivity (30s = −1%)', () => {
      const avg = computePatientFocusPct([
        { status: 'completed', duration: 60, pauseCount: 2, inactivityCount: 3 },
        { status: 'incomplete', duration: 30, pauseCount: 0, inactivityCount: 1 },
      ]);
      expect(avg).toBe((95 + 99) / 2);
    });

    it('infers idle from movesCount=0 when inactivityCount was not stored (legacy rows)', () => {
      const avg = computePatientFocusPct([
        {
          status: 'completed',
          duration: 120,
          movesCount: 0,
          pauseCount: 0,
          inactivityCount: 0,
          exerciseConfig: { inactivityThreshold: 30 },
        },
      ]);
      expect(avg).toBe(96); // 120s / 30s = 4 idle events → 100 − 4
    });
  });

  describe('computeSessionFocusScore', () => {
    it('TB focusScore các lượt trong buổi (chart theo ngày)', () => {
      const { pauseCount, inactivityCount, focusScore } = computeSessionFocusScore([
        { status: 'completed', duration: 60, pauseCount: 1, inactivityCount: 0 },
        { status: 'completed', duration: 60, pauseCount: 0, inactivityCount: 2 },
      ]);
      expect(pauseCount).toBe(1);
      expect(inactivityCount).toBe(2);
      expect(focusScore).toBe(99); // Math.round((99 + 98) / 2)
    });

    it('returns 100 when no ended lượt', () => {
      expect(computeSessionFocusScore([]).focusScore).toBe(100);
    });
  });

  describe('resolveInactivityCountOnComplete', () => {
    it('infers idle events when movesCount is 0 and duration exceeds threshold', () => {
      const count = resolveInactivityCountOnComplete(
        { inactivityCount: 0, exerciseConfig: { inactivityThreshold: 30 } },
        { movesCount: 0, durationSec: 60 }
      );
      expect(count).toBe(2);
    });

    it('keeps higher tracked inactivity when FE already recorded more', () => {
      const count = resolveInactivityCountOnComplete(
        { inactivityCount: 3, exerciseConfig: { inactivityThreshold: 30 } },
        { movesCount: 0, durationSec: 60 }
      );
      expect(count).toBe(3);
    });
  });
});
