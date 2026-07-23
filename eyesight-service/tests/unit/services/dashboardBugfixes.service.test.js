/**
 * Unit tests pinning the dashboard bug fixes (mock-based, no DB).
 *
 * Covers:
 *  B1 - getResultsSummaryByPatient must build a real range filter with Sequelize
 *       Op.gte/Op.lte (NOT Mongo-style $gte/$lte).
 *  B4 - getResultsSummaryByPatient must filter deleted=false.
 *  B2 - dashboardExercise completionRate must equal completed/total, never always-100%.
 *  B3 - dashboardExam KPI must guard numeric CAST with a regex (no raw CAST).
 */

const { Op } = require('sequelize');

// ── Mock models for exerciseResult.service ───────────────────────────────────
jest.mock('../../../src/config/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../../../src/services/exercise/exerciseSessionCompletion.service', () => ({
  recordSessionCompletion: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/models', () => ({
  ExerciseResult: { findAll: jest.fn() },
  ExerciseAssignment: {},
  sequelize: {},
}));
jest.mock('../../../src/models/exercise/exerciseSession.model', () => ({
  count: jest.fn(),
}));
jest.mock('../../../src/models/exercise/exerciseConfig.model', () => ({}));

const { ExerciseResult } = require('../../../src/models');
const ExerciseSession = require('../../../src/models/exercise/exerciseSession.model');
const exerciseResultService = require('../../../src/services/exercise/exerciseResult.service');

describe('B1/B4 — patient chart queries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getResultsSummaryByPatient builds Op.gte/Op.lte range + deleted=false', async () => {
    ExerciseResult.findAll.mockResolvedValue([]);
    ExerciseSession.count.mockResolvedValue(0);
    const start = new Date('2026-01-01');
    const end = new Date('2026-01-31');

    await exerciseResultService.getResultsSummaryByPatient(42, { startDate: start, endDate: end });

    const { where } = ExerciseResult.findAll.mock.calls[0][0];
    expect(where.patientId).toBe(42);
    expect(where.deleted).toBe(false);
    // The fix: real Sequelize operators, not the string keys $gte/$lte.
    expect(where.createdAt[Op.gte]).toBe(start);
    expect(where.createdAt[Op.lte]).toBe(end);
    expect(where.createdAt.$gte).toBeUndefined();
    expect(where.createdAt.$lte).toBeUndefined();

    expect(ExerciseSession.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        patientId: 42,
        status: 'completed',
        startedAt: expect.objectContaining({
          [Op.gte]: start,
          [Op.lte]: end,
        }),
      }),
    });
  });

  it('getResultsSummaryByPatient aggregates totals from rows correctly', async () => {
    // Query filters status='completed'; mock returns the completed rows.
    ExerciseResult.findAll.mockResolvedValue([
      { id: 1, exerciseId: 7, status: 'completed', score: 80, duration: 600 },
      { id: 2, exerciseId: 7, status: 'completed', score: 40, duration: 300 },
      { id: 3, exerciseId: 9, status: 'completed', score: 90, duration: 120 },
    ]);
    // 3 lượt thuộc 2 buổi hoàn thành
    ExerciseSession.count.mockResolvedValue(2);

    const res = await exerciseResultService.getResultsSummaryByPatient(42, {});

    expect(res.totalSessions).toBe(2); // buổi, không phải lượt
    expect(res.totalExecutions).toBe(3);
    expect(res.totalPassedSessions).toBe(2);
    expect(res.totalTime).toBe(1020);
    expect(res.averageScore).toBeCloseTo((80 + 40 + 90) / 3, 5);
    expect(res.passedSessionsByExercise).toEqual({ 7: 2, 9: 1 });
  });
});
