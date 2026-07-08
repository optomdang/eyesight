/**
 * Unit tests for dashboardExercise.getExerciseStats — Tab 3 charts (#25, #26)
 * and the doctor-scope SQL wiring. Mocks sequelize.query + models, no DB.
 */

const QueryTypes = { SELECT: 'SELECT' };
const mockQuery = jest.fn();
jest.mock('../../../src/config/db', () => ({
  sequelize: { query: (...args) => mockQuery(...args), QueryTypes },
}));

jest.mock('../../../src/models', () => ({
  Patient: { findAll: jest.fn() },
  ExerciseAssignment: { findAll: jest.fn() },
  ExerciseSession: { findAll: jest.fn() },
  ExerciseResult: { findAll: jest.fn() },
}));

jest.mock('../../../src/services/dashboard/leaderboardMetrics', () => ({
  computeCenterExerciseStats: jest.fn(),
}));

const { Patient, ExerciseAssignment, ExerciseSession, ExerciseResult } = require('../../../src/models');
const { computeCenterExerciseStats } = require('../../../src/services/dashboard/leaderboardMetrics');
const { getExerciseStats } = require('../../../src/services/dashboard/dashboardExercise.service');

const route =
  (custom = {}) =>
  (sql) => {
    if (sql.includes('"inUseExercises"'))
      return Promise.resolve([
        custom.usage || { totalExercises: 0, inUseExercises: 0, totalConfigs: 0 },
      ]);
    if (sql.includes('COUNT(er.id) AS "count"')) return Promise.resolve(custom.distribution || []);
    return Promise.resolve([]);
  };

describe('getExerciseStats — Tab 3 distribution & compliance by type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Patient.findAll.mockResolvedValue([{ id: 1 }]);
    ExerciseAssignment.findAll.mockResolvedValue([]);
    ExerciseSession.findAll.mockResolvedValue([]);
    ExerciseResult.findAll.mockResolvedValue([]);
    computeCenterExerciseStats.mockReturnValue({
      timeCompletionRate: 70,
      countComplianceRate: 70,
      excellentPatientsCount: 0,
      complianceByType: [
        { exerciseType: '2048', assigned: 16, completed: 12, complianceRate: 75 },
        { exerciseType: 'memory', assigned: 4, completed: 3, complianceRate: 75 },
        { exerciseType: 'visual', assigned: 0, completed: 0, complianceRate: 0 },
      ],
    });
  });

  it('#25 maps distribution rows; #26 uses cycle-based complianceByType from helper', async () => {
    mockQuery.mockImplementation(
      route({
        distribution: [
          { exerciseType: '2048', count: 12 },
          { exerciseType: 'memory', count: 3 },
        ],
      })
    );

    const res = await getExerciseStats(1, new Date('2026-01-01'), new Date('2026-01-31'));

    expect(computeCenterExerciseStats).toHaveBeenCalled();
    expect(res.distributionByType).toEqual([
      { exerciseType: '2048', count: 12 },
      { exerciseType: 'memory', count: 3 },
    ]);
    expect(res.complianceByType).toEqual([
      { exerciseType: '2048', assigned: 16, completed: 12, complianceRate: 75 },
      { exerciseType: 'memory', assigned: 4, completed: 3, complianceRate: 75 },
      { exerciseType: 'visual', assigned: 0, completed: 0, complianceRate: 0 },
    ]);
    expect(res.kpi.timeCompletionRate).toBe(70);
    expect(res.kpi.countComplianceRate).toBe(70);
  });

  it('adds the doctor patient-scope filter only when a doctorId is given', async () => {
    mockQuery.mockImplementation(route());
    await getExerciseStats(1, new Date('2026-01-01'), new Date('2026-01-31'), 42);

    const sqls = mockQuery.mock.calls.map((c) => c[0]);
    const usageSql = sqls.find((s) => s.includes('"inUseExercises"'));
    expect(usageSql).toContain('p."doctorId" = :doctorId');
    mockQuery.mock.calls.forEach((c) => expect(c[1].replacements.doctorId).toBe(42));
    expect(Patient.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ doctorId: 42 }) })
    );
  });

  it('omits the doctor filter when no doctorId (center-wide)', async () => {
    mockQuery.mockImplementation(route());
    await getExerciseStats(7, new Date('2026-01-01'), new Date('2026-01-31'));

    const sqls = mockQuery.mock.calls.map((c) => c[0]);
    sqls.forEach((s) => expect(s).not.toContain('p."doctorId"'));
    mockQuery.mock.calls.forEach((c) => expect(c[1].replacements.doctorId).toBeUndefined());
    expect(Patient.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ doctorId: expect.anything() }) })
    );
  });
});
