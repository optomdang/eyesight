/**
 * Unit tests for dashboardUser.getPatientStatistics (mock-based, no DB).
 *
 * getPatientStatistics fans out many queries in parallel:
 *   - Patient.count x3      (getTotalPatientsStats)
 *   - Patient.findAll       (getPatientImprovementStats, getVisionRecoveryStats)
 *   - AuditLog.findAll      (getUserActivityTrend)
 *   - sequelize.query       (getCompletionStats x2, getAgeStats, training KPI, top performers)
 *
 * These tests mock sequelize.query by branching on SQL CONTENT (not call order, which
 * is non-deterministic inside Promise.all) and mock the ORM calls, then assert the
 * service's actual response contract.
 */

const { sequelize } = require('../../../src/config/db');
const {
  getPatientStatistics,
  getUserActivityTrend,
  getLeaderboard,
} = require('../../../src/services/dashboard/dashboardUser.service');
const { Patient, ExamSession, ExamResult, ExerciseSession, ExerciseResult, ExerciseAssignment, ExamAssignment } = require('../../../src/models');

// Route a raw SQL query to a canned result based on a recognisable fragment.
const routeQuery = (sql, custom = {}) => {
  if (sql.includes('training_days')) return custom.training || [{ training_days: 0, total_hours: 0, total_exercises: 0 }];
  if (sql.includes('"exDone"')) return custom.leaderboard || []; // getLeaderboard (#7)
  if (sql.includes('FROM "ExamSessions"')) return [{ completed: 0, total: 0 }];
  if (sql.includes('FROM "ExerciseSessions"')) return [{ completed: 0, total: 0 }];
  if (sql.includes('min_age')) return [{ min_age: null, max_age: null, avg_age: null }];
  if (sql.includes("action = 'auth.login'")) return custom.loginTrend || []; // getUserActivityTrend (now raw SQL)
  return [];
};

describe('Dashboard User Service - getPatientStatistics', () => {
  let queryMock;

  beforeEach(() => {
    queryMock = jest.spyOn(sequelize, 'query').mockImplementation((sql) => Promise.resolve(routeQuery(sql)));
    jest.spyOn(Patient, 'findAndCountAll').mockResolvedValue({ rows: [], count: 0 });
    jest.spyOn(Patient, 'count').mockResolvedValue(0);
    jest.spyOn(Patient, 'findAll').mockResolvedValue([]); // improvement + recovery
  });

  afterEach(() => jest.restoreAllMocks());

  it("training KPI query filters status = 'completed' (no pass/fail)", async () => {
    await getPatientStatistics({ centerId: 1, trendDays: 30 });

    const sqls = queryMock.mock.calls.map((c) => c[0]);
    const trainingQuery = sqls.find((s) => s.includes('training_days'));

    expect(trainingQuery).toBeDefined();
    expect(trainingQuery).toContain("'completed'");
    expect(trainingQuery).not.toMatch(/'passed'|'failed'/);
  });

  it('returns the documented KPI contract', async () => {
    queryMock.mockImplementation((sql) =>
      Promise.resolve(routeQuery(sql, { training: [{ training_days: 78, total_hours: 98.5, total_exercises: 204 }] }))
    );

    const result = await getPatientStatistics({ centerId: 1, trendDays: 30 });

    expect(result).toHaveProperty('kpi.trainingDays', 78);
    expect(result).toHaveProperty('kpi.totalTrainingHours', 98.5);
    expect(result).toHaveProperty('kpi.totalExercises', 204);
    expect(result).toHaveProperty('kpi.totalPatients');
    expect(result).toHaveProperty('kpi.activePatients');
    expect(result).toHaveProperty('kpi.improvedCount');
    expect(result).toHaveProperty('kpi.minAge');
    expect(result).toHaveProperty('kpi.maxAge');
    expect(result).toHaveProperty('kpi.avgAge');
    // Current contract (post-refactor) — these replaced the old `improvementLevel`.
    expect(result).toHaveProperty('kpi.avgRecoveryPct');
    expect(result).toHaveProperty('kpi.avgImprovementLevel');
    expect(result).toHaveProperty('kpi.improvementRate');
    expect(result).toHaveProperty('kpi.completionRate');
    expect(result).toHaveProperty('topPerformers');
    expect(Array.isArray(result.topPerformers)).toBe(true);
  });

  it('filters every raw query by the given centerId', async () => {
    await getPatientStatistics({ centerId: 123, trendDays: 30 });

    const replacements = queryMock.mock.calls.map((c) => c[1]?.replacements).filter((r) => r && r.centerId !== undefined);
    expect(replacements.length).toBeGreaterThan(0);
    replacements.forEach((r) => expect(r.centerId).toBe(123));

    // The activity trend (#6) is a raw SQL query over completed results, scoped by centerId.
    const trendQuery = queryMock.mock.calls.map((c) => c[0]).find((s) => s.includes('COUNT(DISTINCT "patientId")'));
    expect(trendQuery).toBeDefined();
    expect(trendQuery).toContain("AT TIME ZONE 'UTC'");
  });

  it('#7 leaderboard ranks Hoàn thành → Tập trung → Cải thiện, capped at 10', async () => {
    jest.spyOn(Patient, 'findAll').mockResolvedValue([
      {
        id: 1,
        code: 'A',
        examResults: {
          far: { initialResult: { leftEye: 7, rightEye: 7 }, currentResult: { leftEye: 10, rightEye: 10 } },
        },
        user: { name: 'A' },
      },
      { id: 2, code: 'B', examResults: null, user: { name: 'B' } },
    ]);
    jest.spyOn(ExamSession, 'findAll').mockResolvedValue([]);
    jest.spyOn(ExamResult, 'findAll').mockResolvedValue([]);
    jest.spyOn(ExerciseAssignment, 'findAll').mockResolvedValue([]);
    jest.spyOn(ExamAssignment, 'findAll').mockResolvedValue([]);
    jest.spyOn(ExerciseSession, 'findAll').mockResolvedValue([
      { id: 100, patientId: 1, exerciseAssignmentId: 1, executionCount: 4, executionDuration: 5, startedAt: new Date('2026-01-01') },
      { id: 101, patientId: 2, exerciseAssignmentId: 2, executionCount: 4, executionDuration: 5, startedAt: new Date('2026-01-01') },
    ]);
    jest.spyOn(ExerciseResult, 'findAll').mockResolvedValue([
      ...[1, 2, 3, 4].map((i) => ({
        patientId: 1,
        exerciseSessionId: 100,
        status: 'completed',
        duration: 300,
        pauseCount: 10,
        inactivityCount: 0,
        focusScore: 90,
        createdAt: new Date(`2026-01-0${i}`),
      })),
      {
        patientId: 2,
        exerciseSessionId: 101,
        status: 'completed',
        duration: 300,
        pauseCount: 0,
        inactivityCount: 0,
        focusScore: 99,
        createdAt: new Date('2026-01-01'),
      },
      {
        patientId: 2,
        exerciseSessionId: 101,
        status: 'completed',
        duration: 300,
        pauseCount: 0,
        inactivityCount: 0,
        focusScore: 99,
        createdAt: new Date('2026-01-02'),
      },
    ]);

    const board = await getLeaderboard(1);

    expect(board[0].patientCode).toBe('A');
    expect(board[0].completionRate).toBe(100);
    expect(board[0].focusScore).toBe(90);
    expect(board[0].improvementLines).toBe(3);
    expect(board[1].patientCode).toBe('B');
    expect(board[1].completionRate).toBe(50);
    expect(board.length).toBeLessThanOrEqual(10);
  });

  it('handles null aggregate values by defaulting to 0', async () => {
    queryMock.mockImplementation((sql) =>
      Promise.resolve(routeQuery(sql, { training: [{ training_days: null, total_hours: null, total_exercises: null }] }))
    );

    const result = await getPatientStatistics({ centerId: 1, trendDays: 30 });

    expect(result.kpi.trainingDays).toBe(0);
    expect(result.kpi.totalTrainingHours).toBe(0);
    expect(result.kpi.totalExercises).toBe(0);
  });
});

describe('getUserActivityTrend (SQL group-by + gap-fill)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('maps SQL-grouped day counts into a continuous, zero-filled trend', async () => {
    const days = 7;

    // First, discover the exact date keys the gap-fill generates (TZ-independent:
    // these are whatever the implementation emits), by returning no counts.
    const spy = jest.spyOn(sequelize, 'query').mockResolvedValue([]);
    const zeroTrend = await getUserActivityTrend(1, days);
    expect(zeroTrend).toHaveLength(days);
    zeroTrend.forEach((t) => expect(t.loginCount).toBe(0));

    // Now attach counts to two of those exact dates and assert they land correctly.
    const dA = zeroTrend[2].date;
    const dB = zeroTrend[5].date;
    spy.mockResolvedValue([
      { date: dA, count: 5 },
      { date: dB, count: 2 },
    ]);

    const trend = await getUserActivityTrend(1, days);
    expect(trend).toHaveLength(days);
    const byDate = Object.fromEntries(trend.map((t) => [t.date, t.loginCount]));
    expect(byDate[dA]).toBe(5);
    expect(byDate[dB]).toBe(2);
    expect(trend.filter((t) => t.loginCount === 0)).toHaveLength(days - 2);
  });

  it('counts distinct patients who started exam/exercise per day, scoped by centerId (any status)', async () => {
    const spy = jest.spyOn(sequelize, 'query').mockResolvedValue([]);
    await getUserActivityTrend(77, 30);

    const [sql, opts] = spy.mock.calls[0];
    expect(sql).toContain('COUNT(DISTINCT "patientId")');
    expect(sql).toContain('FROM "ExerciseResults"');
    expect(sql).toContain('FROM "ExamResults"');
    expect(sql).toContain('COALESCE(er."startedAt", er."createdAt")');
    expect(sql).toContain('COALESCE(ex."startedAt", ex."createdAt")');
    expect(sql).not.toContain("status = 'completed'");
    expect(sql).not.toMatch(/auth\.login/);
    expect(opts.replacements.centerId).toBe(77);
    expect(opts.replacements.doctorId).toBeUndefined();
  });

  it('adds the doctor patient-scope filter only when a doctorId is given', async () => {
    const spy = jest.spyOn(sequelize, 'query').mockResolvedValue([]);
    await getUserActivityTrend(1, 30, 42);

    const [sql, opts] = spy.mock.calls[0];
    expect(sql).toContain('"doctorId" = :doctorId');
    expect(opts.replacements.doctorId).toBe(42);
  });

  it('gap-fill ends on today (UTC) and maps SQL day keys correctly', async () => {
    const now = new Date();
    const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;

    jest.spyOn(sequelize, 'query').mockResolvedValue([{ date: todayKey, count: 2 }]);

    const trend = await getUserActivityTrend(1, 30);
    expect(trend).toHaveLength(30);
    expect(trend[trend.length - 1].date).toBe(todayKey);
    expect(trend[trend.length - 1].loginCount).toBe(2);
  });
});
