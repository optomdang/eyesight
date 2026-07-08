/**
 * Formula-level tests for two KPI helpers that previously had only "shape" assertions:
 *   - getVisionRecoveryStats (#10 PHỤC HỒI): verifies the Snellen recovery % + eye-selection rule.
 *   - getCompletionStats: verifies completionRate = (test% + exercise%) / 2.
 * Mocks Patient.findAll and cycle-based helper; no DB.
 */
const { Patient, ExamAssignment, ExamSession, ExamResult, ExerciseAssignment, ExerciseSession, ExerciseResult } =
  require('../../../src/models');
const { getVisionRecoveryStats, getCompletionStats } = require('../../../src/services/dashboard/dashboardUser.service');

jest.mock('../../../src/models', () => ({
  Patient: { findAll: jest.fn() },
  ExamAssignment: { findAll: jest.fn() },
  ExamSession: { findAll: jest.fn() },
  ExamResult: { findAll: jest.fn() },
  ExerciseAssignment: { findAll: jest.fn() },
  ExerciseSession: { findAll: jest.fn() },
  ExerciseResult: { findAll: jest.fn() },
  ExerciseConfig: {},
}));

jest.mock('../../../src/services/dashboard/leaderboardMetrics', () => ({
  computeCenterCombinedCompletionRate: jest.fn(),
}));

const { computeCenterCombinedCompletionRate } = require('../../../src/services/dashboard/leaderboardMetrics');

describe('getVisionRecoveryStats (#10) — Snellen recovery % + eye rule', () => {
  afterEach(() => jest.restoreAllMocks());

  it('averages the representative-eye recovery % across in-treatment patients', () => {
    // FAR_VISION_DENOMINATORS: 14→20 (=100%), 11→40 (=50%), 10→50 (=40%), 7→100 (=20%).
    // A: L14(100% reached) + R11(50%) → exactly one eye reached → the OTHER eye = 50%.
    // B: L7(20%) + R10(40%) → neither reached → BETTER eye = 40%.
    // avg = (50 + 40) / 2 = 45.
    jest.spyOn(Patient, 'findAll').mockResolvedValue([
      { id: 1, examResults: { far: { currentResult: { leftEye: 14, rightEye: 11 } } } },
      { id: 2, examResults: { far: { currentResult: { leftEye: 7, rightEye: 10 } } } },
    ]);

    return getVisionRecoveryStats(1).then((res) => {
      expect(res.patientCount).toBe(2);
      expect(res.avgRecoveryPct).toBe(45);
    });
  });

  it('skips patients with no far currentResult and returns 0 when none qualify', () => {
    jest.spyOn(Patient, 'findAll').mockResolvedValue([
      { id: 1, examResults: {} },
      { id: 2, examResults: { far: { currentResult: { leftEye: null, rightEye: null } } } },
    ]);
    return getVisionRecoveryStats(1).then((res) => {
      expect(res.patientCount).toBe(0);
      expect(res.avgRecoveryPct).toBe(0);
    });
  });
});

describe('getCompletionStats — (test% + exercise%) / 2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Patient.findAll.mockResolvedValue([{ id: 1 }]);
    ExamAssignment.findAll.mockResolvedValue([]);
    ExamSession.findAll.mockResolvedValue([]);
    ExamResult.findAll.mockResolvedValue([]);
    ExerciseAssignment.findAll.mockResolvedValue([]);
    ExerciseSession.findAll.mockResolvedValue([]);
    ExerciseResult.findAll.mockResolvedValue([]);
  });

  it('combines test 70% and exercise 50% into 60%', () => {
    computeCenterCombinedCompletionRate.mockReturnValue({
      completionRate: 60,
      test: { completed: 7, total: 10, pct: 70 },
      exercise: { completed: 5, total: 10, pct: 50 },
    });

    return getCompletionStats(1).then((res) => {
      expect(computeCenterCombinedCompletionRate).toHaveBeenCalled();
      expect(res.test.pct).toBe(70);
      expect(res.exercise.pct).toBe(50);
      expect(res.completionRate).toBe(60);
    });
  });

  it('treats a category with zero sessions as 0% (no divide-by-zero)', () => {
    computeCenterCombinedCompletionRate.mockReturnValue({
      completionRate: 50,
      test: { completed: 0, total: 0, pct: 0 },
      exercise: { completed: 4, total: 4, pct: 100 },
    });

    return getCompletionStats(1).then((res) => {
      expect(res.test.pct).toBe(0);
      expect(res.exercise.pct).toBe(100);
      expect(res.completionRate).toBe(50);
    });
  });

  it('returns zeros when no in-treatment patients', () => {
    Patient.findAll.mockResolvedValue([]);

    return getCompletionStats(1).then((res) => {
      expect(computeCenterCombinedCompletionRate).not.toHaveBeenCalled();
      expect(res).toEqual({
        completionRate: 0,
        test: { completed: 0, total: 0, pct: 0 },
        exercise: { completed: 0, total: 0, pct: 0 },
      });
    });
  });
});
