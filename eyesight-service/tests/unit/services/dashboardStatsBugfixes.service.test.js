/**
 * Unit tests for dashboard stat-query bug fixes (mock sequelize, no DB).
 *  B2 - dashboardExercise Tab 3 KPIs (#21 % thời gian, #22 % số lần) are real ratios, never always-100%.
 *  B3 - dashboardExam KPI guards numeric CAST with a regex instead of raw CAST.
 */

const QueryTypes = { SELECT: 'SELECT' };

// Shared mock for sequelize.query; each test installs its own implementation.
// Must be prefixed with `mock` so jest.mock's hoisted factory may reference it.
const mockQuery = jest.fn();
jest.mock('../../../src/config/db', () => ({
  sequelize: { query: (...args) => mockQuery(...args), QueryTypes },
}));

const exerciseService = require('../../../src/services/dashboard/dashboardExercise.service');
const examService = require('../../../src/services/dashboard/dashboardExam.service');

describe('B2 — dashboardExercise Tab 3 completion KPIs', () => {
  beforeEach(() => jest.clearAllMocks());

  // Route each parallel query by a recognisable fragment of its SELECT list.
  const route =
    (custom = {}) =>
    (sql) => {
      if (sql.includes('"actualSeconds"')) return Promise.resolve([custom.time || { actualSeconds: 0, assignedSeconds: 0 }]);
      if (sql.includes('"completedCount"') && sql.includes('"assignedCount"'))
        return Promise.resolve([custom.count || { completedCount: 0, assignedCount: 0 }]);
      if (sql.includes('"inUseExercises"'))
        return Promise.resolve([custom.usage || { totalExercises: 0, inUseExercises: 0, totalConfigs: 0 }]);
      if (sql.includes('"excellentCount"')) return Promise.resolve([custom.excellent || { excellentCount: 0 }]);
      return Promise.resolve([]); // distributionByType, complianceByType
    };

  it('#21 timeCompletionRate = Σactual/Σassigned, #22 countComplianceRate = completed/assigned (never always-100%)', async () => {
    mockQuery.mockImplementation(
      route({
        time: { actualSeconds: 900, assignedSeconds: 2400 }, // 15p / 40p = 37.5%
        count: { completedCount: 3, assignedCount: 4 }, // 3/4 = 75%
        usage: { totalExercises: 10, inUseExercises: 4, totalConfigs: 6 }, // 40%
        excellent: { excellentCount: 2 },
      })
    );

    const res = await exerciseService.getExerciseStats(1, new Date('2026-01-01'), new Date('2026-01-31'));

    expect(res.kpi.timeCompletionRate).toBe(37.5);
    expect(res.kpi.countComplianceRate).toBe(75);
    expect(res.kpi.inUsePct).toBe(40);
    expect(res.kpi.inUseExercises).toBe(4);
    expect(res.kpi.totalConfigs).toBe(6);
    expect(res.kpi.excellentPatientsCount).toBe(2);
    expect(res.kpi.timeCompletionRate).not.toBe(100);
  });

  it('rates are 0 (not NaN/100) when nothing was assigned', async () => {
    mockQuery.mockImplementation(route());

    const res = await exerciseService.getExerciseStats(1, new Date('2026-01-01'), new Date('2026-01-31'));
    expect(res.kpi.timeCompletionRate).toBe(0);
    expect(res.kpi.countComplianceRate).toBe(0);
    expect(res.kpi.inUsePct).toBe(0);
  });
});

describe('B3 — dashboardExam KPI numeric CAST guard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('KPI query guards spherical/cylinder with a numeric regex and drops the unguarded CAST', async () => {
    let kpiSql = '';
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('avgSpherical')) {
        kpiSql = sql;
        return Promise.resolve([
          { totalExams: 0, uniquePatients: 0, completedCount: 0, pendingCount: 0, avgSpherical: 0, avgCylinder: 0 },
        ]);
      }
      if (sql.includes('avgVisionImprovement')) return Promise.resolve([{ avgVisionImprovement: 0 }]);
      return Promise.resolve([]); // trend, breakdown
    });

    await examService.getExamStats(1, new Date('2026-01-01'), new Date('2026-01-31'));

    // Guarded: regex numeric check present.
    expect(kpiSql).toMatch(/~ '\^-\?\[0-9\]/);
    // Not the old crash-prone form.
    expect(kpiSql).not.toContain("CAST(\"rawData\"->'leftEye'->>'spherical' AS FLOAT)");
  });
});
