/**
 * Unit tests for dashboardExam.getExamStats — Tab 2 metrics.
 *   #11 testComplianceRate (cycle-based), #16 breakdown, #17 trend.
 */

const QueryTypes = { SELECT: 'SELECT' };
const mockQuery = jest.fn();
jest.mock('../../../src/config/db', () => ({
  sequelize: { query: (...args) => mockQuery(...args), QueryTypes },
}));

jest.mock('../../../src/models', () => ({
  Patient: { findAll: jest.fn() },
  ExamAssignment: { findAll: jest.fn() },
  ExamSession: { findAll: jest.fn() },
}));

jest.mock('../../../src/services/dashboard/leaderboardMetrics', () => ({
  computeCenterExamComplianceRate: jest.fn(),
}));

const { Patient, ExamAssignment, ExamSession } = require('../../../src/models');
const { computeCenterExamComplianceRate } = require('../../../src/services/dashboard/leaderboardMetrics');
const { getExamStats } = require('../../../src/services/dashboard/dashboardExam.service');

const route =
  (custom = {}) =>
  (sql) => {
    if (sql.includes('avgSpherical'))
      return Promise.resolve([
        custom.kpi || {
          totalExams: 0,
          uniquePatients: 0,
          completedCount: 0,
          pendingCount: 0,
          avgSpherical: 0,
          avgCylinder: 0,
        },
      ]);
    if (sql.includes('avgVisionImprovement')) return Promise.resolve([{ avgVisionImprovement: 0 }]);
    if (sql.includes('date_trunc')) return Promise.resolve(custom.trend || []);
    if (sql.includes('GROUP BY er."examType"')) return Promise.resolve(custom.breakdown || []);
    return Promise.resolve([]);
  };

describe('getExamStats — Tab 2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Patient.findAll.mockResolvedValue([{ id: 1 }]);
    ExamAssignment.findAll.mockResolvedValue([]);
    ExamSession.findAll.mockResolvedValue([]);
    computeCenterExamComplianceRate.mockReturnValue({
      testComplianceRate: 37.5,
      totalSessions: 8,
      completedSessions: 3,
    });
  });

  it('#11 testComplianceRate from cycle-based helper', async () => {
    mockQuery.mockImplementation(route());

    const res = await getExamStats(1, new Date('2026-01-01'), new Date('2026-01-31'));
    expect(computeCenterExamComplianceRate).toHaveBeenCalled();
    expect(res.kpi.totalSessions).toBe(8);
    expect(res.kpi.completedSessions).toBe(3);
    expect(res.kpi.testComplianceRate).toBe(37.5);
  });

  it('testComplianceRate is 0 when no in-treatment patients', async () => {
    Patient.findAll.mockResolvedValue([]);
    computeCenterExamComplianceRate.mockReturnValue({
      testComplianceRate: 0,
      totalSessions: 0,
      completedSessions: 0,
    });
    mockQuery.mockImplementation(route());

    const res = await getExamStats(1, new Date('2026-01-01'), new Date('2026-01-31'));
    expect(res.kpi.testComplianceRate).toBe(0);
  });

  it('#16 breakdown exposes notCompleted = total - completed per examType', async () => {
    mockQuery.mockImplementation(
      route({
        breakdown: [
          { type: 'far', count: 10, completedCount: 7 },
          { type: 'near', count: 4, completedCount: 4 },
        ],
      })
    );

    const res = await getExamStats(1, new Date('2026-01-01'), new Date('2026-01-31'));
    expect(res.breakdown).toEqual([
      { type: 'far', total: 10, completed: 7, notCompleted: 3, completionRate: 70 },
      { type: 'near', total: 4, completed: 4, notCompleted: 0, completionRate: 100 },
    ]);
  });

  it('#17 trend buckets by the requested period and echoes the resolved granularity', async () => {
    mockQuery.mockImplementation(route({ trend: [{ bucket: '2026-01-01T00:00:00.000Z', count: 5, completedCount: 4 }] }));

    const res = await getExamStats(1, new Date('2026-01-01'), new Date('2026-03-31'), null, 'quarter');
    expect(res.trendPeriod).toBe('quarter');
    const trendSql = mockQuery.mock.calls.map((c) => c[0]).find((s) => s.includes('date_trunc'));
    expect(trendSql).toContain("date_trunc('quarter'");
    expect(res.trend[0]).toMatchObject({
      date: '2026-01-01T00:00:00.000Z',
      totalExams: 5,
      completedExams: 4,
      completionRate: 80,
    });
  });

  it('#17 whitelists the period — an unknown/injection value falls back to day', async () => {
    mockQuery.mockImplementation(route());
    const res = await getExamStats(1, new Date('2026-01-01'), new Date('2026-01-31'), null, "month'); DROP TABLE x;--");
    expect(res.trendPeriod).toBe('day');
    const trendSql = mockQuery.mock.calls.map((c) => c[0]).find((s) => s.includes('date_trunc'));
    expect(trendSql).toContain("date_trunc('day'");
    expect(trendSql).not.toContain('DROP TABLE');
  });
});
