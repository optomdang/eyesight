/**
 * Dashboard accuracy integration tests — REAL DB, realistic seeded data.
 *
 * Proves end-to-end that dashboard numbers match expectations after the bug fixes:
 *   B1 - getResultsSummaryByPatient date filter actually restricts rows (Op range works).
 *   B2 - dashboardExercise completionRate = completed/total (not always 100%).
 *   B3 - dashboardExam KPI survives a malformed rawData row (no crash) and ignores it.
 *
 * SAFETY:
 *   - Skipped unless RUN_DB_INTEGRATION=1.
 *   - Refuses to run against a production-looking host (e.g. supabase/pooler) unless
 *     ALLOW_PROD_DB=1 is ALSO set. Point this at a throwaway local Postgres.
 *   - Cleans up ONLY the exact ids it created (no blanket "id > N" deletes).
 *
 * Run: NODE_ENV=test RUN_DB_INTEGRATION=1 npx jest tests/integration/dashboard-accuracy.integration.test.js
 */

const RUN = process.env.RUN_DB_INTEGRATION === '1';
const describeDb = RUN ? describe : describe.skip;

// Remote Postgres (sync + inserts) is slow; the default 5s timeout is not enough.
jest.setTimeout(60000);

const models = require('../../src/models');
const { generateTestId } = require('../utils/setupTestDB');

const exerciseDash = require('../../src/services/dashboard/dashboardExercise.service');
const examDash = require('../../src/services/dashboard/dashboardExam.service');
const exerciseResultService = require('../../src/services/exercise/exerciseResult.service');
const dashboardUser = require('../../src/services/dashboard/dashboardUser.service');

const { sequelize } = models;

// Track created rows for precise teardown: { Model: [ids] }
const created = [];
const track = (Model, row) => {
  created.push({ Model, id: row.id });
  return row;
};

describeDb('Dashboard accuracy (real DB)', () => {
  // Generate all ids up-front (before any await) so a slow/timing-out hook never
  // leaves an id undefined and triggers a not-null FK violation.
  // centerId is placed in a synthetic high range (well above any real dev row, below INT4 max)
  // so the per-center pre-clean below can never touch real data.
  const centerId = 2000000000 + (generateTestId() % 100000);
  const patientId = generateTestId();
  const userId = generateTestId();
  const configId = generateTestId();
  const exerciseId = generateTestId();
  const assignmentId = generateTestId();

  beforeAll(async () => {
    const host = process.env.DB_HOST || '';
    if (/supabase|pooler|amazonaws|rds\./i.test(host) && process.env.ALLOW_PROD_DB !== '1') {
      throw new Error(
        `Refusing to run DB integration tests against production-looking host "${host}". ` +
          `Use a throwaway Postgres, or set ALLOW_PROD_DB=1 if you are certain.`
      );
    }
    await sequelize.sync({ force: false });

    // Clean any leftover rows for this synthetic center from prior interrupted runs,
    // so absolute-count assertions are deterministic. Scoped to the synthetic centerId only.
    await models.ExerciseResult.destroy({ where: { centerId }, force: true });
    await models.ExamResult.destroy({ where: { centerId }, force: true });
    await models.ExerciseSession.destroy({ where: { centerId }, force: true });
    await models.ExamSession.destroy({ where: { centerId }, force: true });
    await models.AuditLog.destroy({ where: { centerId } });

    const uniq = `${Date.now()}_${centerId}`;

    track(
      models.Center,
      await models.Center.create({ id: centerId, code: `C_${uniq}`, name: 'IT Center', active: true, deleted: false })
    );
    const phoneNumber = `0${String(centerId).padStart(9, '0').slice(-9)}`; // matches /^0\d{9}$/
    track(
      models.User,
      await models.User.create({
        id: userId,
        email: `it_${uniq}@t.com`,
        password: 'Test1234',
        name: 'IT Patient',
        phoneNumber,
        userType: 'patient',
        centerId,
        roleId: 1,
        isEmailVerified: true,
        active: true,
        deleted: false,
        dateOfBirth: new Date('2010-01-01'),
      })
    );
    track(
      models.Patient,
      await models.Patient.create({
        id: patientId,
        code: `P_${uniq}`,
        userId,
        centerId,
        treatmentStatus: 'active',
        activeFrom: new Date(Date.now() - 30 * 864e5),
        activeTo: new Date(Date.now() + 365 * 864e5),
        deleted: false,
      })
    );
    track(
      models.Exercise,
      await models.Exercise.create({
        id: exerciseId,
        code: `E_${uniq}`,
        name: '2048',
        exerciseType: '2048',
        centerId,
        deleted: false,
      })
    );
    track(
      models.ExerciseConfig,
      await models.ExerciseConfig.create({
        id: configId,
        exerciseId,
        configType: 'system',
        name: 'cfg',
        eye: 'both',
        distance: 0.5,
        duration: 15,
        frequency: 'daily',
        executionCount: 3,
        visionType: 'far',
        centerId,
        deleted: false,
      })
    );
    track(
      models.ExerciseAssignment,
      await models.ExerciseAssignment.create({
        id: assignmentId,
        patientId,
        exerciseConfigId: configId,
        assignedBy: 1,
        status: 'active',
        currentLevel: 1,
        centerId,
        deleted: false,
        assignedAt: new Date('2026-03-01T00:00:00Z'),
        createdAt: new Date('2026-03-01T00:00:00Z'),
      })
    );
  });

  afterAll(async () => {
    // Delete children-first by reversing creation order.
    for (let i = created.length - 1; i >= 0; i -= 1) {
      const { Model, id } = created[i];
      // eslint-disable-next-line no-await-in-loop
      await Model.destroy({ where: { id }, force: true });
    }
    await sequelize.close();
  });

  it('Tab 3 — #21 % thời gian, #22 % số lần, #19/#20 danh mục, #25/#26 theo loại', async () => {
    const at = new Date('2026-03-10T10:00:00Z');

    // One session snapshots "số giao": 10 lượt × 1 phút/lượt → giao = 10 lượt, 600s.
    const session = track(
      models.ExerciseSession,
      await models.ExerciseSession.create({
        id: generateTestId(),
        code: `XS_${Date.now()}_${centerId}`,
        patientId,
        exerciseAssignmentId: assignmentId,
        status: 'completed',
        executionCount: 10,
        executionDuration: 1,
        startedAt: at,
        centerId,
        createdAt: at,
      })
    );

    const base = {
      patientId,
      exerciseId,
      exerciseSessionId: session.id,
      exerciseAssignmentId: assignmentId,
      centerId,
      deleted: false,
      duration: 60, // 7 × 60 = 420s thực
      score: 50,
    };
    const rows = [];
    // status chỉ còn incomplete | completed: 7 completed + 3 incomplete.
    for (let i = 0; i < 7; i += 1) rows.push({ ...base, status: 'completed', createdAt: at });
    for (let i = 0; i < 3; i += 1) rows.push({ ...base, status: 'incomplete', createdAt: at });
    const inserted = await models.ExerciseResult.bulkCreate(rows, { hooks: false, returning: true });
    inserted.forEach((r) => track(models.ExerciseResult, r));

    const stats = await exerciseDash.getExerciseStats(centerId, new Date('2026-03-01'), new Date('2026-03-31T23:59:59Z'));

    // #21/#22 theo chu kỳ: 31 ngày tháng 3 — 1 ngày có session (10 lượt, 7 completed) + 30 ngày bỏ (3 lượt/ngày)
    // assigned = 10 + 30×3 = 100; completed = 7 → 7%; thời gian = 420 / 6000 = 7%
    expect(stats.kpi.timeCompletionRate).toBe(7);
    expect(stats.kpi.countComplianceRate).toBe(7);
    // #19 ĐANG SỬ DỤNG = 1/1 Exercise đã giao
    expect(stats.kpi.inUseExercises).toBe(1);
    expect(stats.kpi.totalExercises).toBe(1);
    expect(stats.kpi.inUsePct).toBe(100);
    // #20 SỐ PHÁC ĐỒ TẬP
    expect(stats.kpi.totalConfigs).toBe(1);
    // #23 BN Xuất Sắc: 7% ≤ 80% → 0
    expect(stats.kpi.excellentPatientsCount).toBe(0);
    // #25 phân bổ theo loại
    const dist2048 = stats.distributionByType.find((d) => d.exerciseType === '2048');
    expect(dist2048.count).toBe(7);
    // #26 tuân thủ theo loại
    const comp2048 = stats.complianceByType.find((d) => d.exerciseType === '2048');
    expect(comp2048).toMatchObject({ assigned: 100, completed: 7, complianceRate: 7 });
  });

  it('B1 — getResultsSummaryByPatient date window restricts rows (range filter works)', async () => {
    const summary = await exerciseResultService.getResultsSummaryByPatient(patientId, {
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-31T23:59:59Z'),
    });
    // Only the 7 completed are counted; incomplete excluded; all within window.
    expect(summary.totalSessions).toBe(7);
    expect(summary.totalPassedSessions).toBe(7);

    // A window with no data must return zero — proves it is a real range, not equality to garbage.
    const empty = await exerciseResultService.getResultsSummaryByPatient(patientId, {
      startDate: new Date('2020-01-01'),
      endDate: new Date('2020-01-02'),
    });
    expect(empty.totalSessions).toBe(0);
  });

  it('B3 — exam KPI ignores malformed rawData and does not crash', async () => {
    const uniq = `${Date.now()}_${centerId}`;
    const session = track(
      models.ExamSession,
      await models.ExamSession.create({
        id: generateTestId(),
        code: `ES_${uniq}`,
        patientId,
        examType: 'far',
        status: 'completed',
        centerId,
      })
    );
    const at = new Date('2026-03-12T10:00:00Z');
    const examRows = [
      // Valid numeric strings.
      {
        code: `ER_${uniq}_1`,
        patientId,
        examSessionId: session.id,
        examType: 'far',
        status: 'completed',
        centerId,
        rawData: { leftEye: { spherical: '-1.5', cylinder: '0' }, rightEye: { spherical: '-2.5', cylinder: '0' } },
        createdAt: at,
        deleted: false,
      },
      // Malformed: empty string would crash the old unguarded CAST.
      {
        code: `ER_${uniq}_2`,
        patientId,
        examSessionId: session.id,
        examType: 'far',
        status: 'completed',
        centerId,
        rawData: { leftEye: { spherical: '', cylinder: 'N/A' }, rightEye: {} },
        createdAt: at,
        deleted: false,
      },
    ];
    const inserted = await models.ExamResult.bulkCreate(examRows, { hooks: false, returning: true });
    inserted.forEach((r) => track(models.ExamResult, r));

    let stats;
    await expect(
      (async () => {
        stats = await examDash.getExamStats(centerId, new Date('2026-03-01'), new Date('2026-03-31T23:59:59Z'));
      })()
    ).resolves.not.toThrow();

    expect(stats.kpi.totalExams).toBe(2);
    // avgSpherical from the single valid row: (-1.5 + -2.5)/2 = -2.0
    expect(stats.kpi.avgSpherical).toBeCloseTo(-2.0, 5);
  });

  it('Tab 2 — #11 test compliance (session), #16 breakdown stack, #17 bucketed trend', async () => {
    // B3 already created 2 completed far ExamResults in March (feed #16/#17).
    // #11 is session-level: B3's session was created "now" (out of the March window), so
    // create both sessions explicitly inside the window: 1 completed + 1 incomplete → 50%.
    track(
      models.ExamSession,
      await models.ExamSession.create({
        id: generateTestId(),
        code: `ES_done_${Date.now()}_${centerId}`,
        patientId,
        examType: 'far',
        status: 'completed',
        centerId,
        deleted: false,
        createdAt: new Date('2026-03-12T10:00:00Z'),
      })
    );
    track(
      models.ExamSession,
      await models.ExamSession.create({
        id: generateTestId(),
        code: `ES_inc_${Date.now()}_${centerId}`,
        patientId,
        examType: 'near',
        status: 'incomplete',
        centerId,
        deleted: false,
        createdAt: new Date('2026-03-13T10:00:00Z'),
      })
    );

    const stats = await examDash.getExamStats(
      centerId,
      new Date('2026-03-01'),
      new Date('2026-03-31T23:59:59Z'),
      null,
      'month'
    );

    // #11 — 1 completed of 2 sessions = 50%
    expect(stats.kpi.totalSessions).toBe(2);
    expect(stats.kpi.completedSessions).toBe(1);
    expect(stats.kpi.testComplianceRate).toBe(50);

    // #16 — far has 2 results, both completed → notCompleted 0
    const far = stats.breakdown.find((b) => b.type === 'far');
    expect(far).toMatchObject({ total: 2, completed: 2, notCompleted: 0, completionRate: 100 });

    // #17 — monthly bucket: all in 2026-03 → single bucket, granularity echoed
    expect(stats.trendPeriod).toBe('month');
    expect(stats.trend).toHaveLength(1);
    expect(stats.trend[0]).toMatchObject({ totalExams: 2, completedExams: 2, completionRate: 100 });
  });

  it('getTotalPatientsStats counts total/active/completed correctly (parallel counts)', async () => {
    // Existing seeded patient is in-treatment (active). Add a completed and a not-started one.
    const now = Date.now();
    const mkPatient = async (label, patientOverrides) => {
      const uid = generateTestId();
      const phone = `0${String(uid).padStart(9, '0').slice(-9)}`;
      track(
        models.User,
        await models.User.create({
          id: uid,
          email: `it_${label}_${now}@t.com`,
          password: 'Test1234',
          name: `IT ${label}`,
          phoneNumber: phone,
          userType: 'patient',
          centerId,
          roleId: 1,
          isEmailVerified: true,
          active: true,
          deleted: false,
          dateOfBirth: new Date('2012-01-01'),
        })
      );
      const pid = generateTestId();
      track(
        models.Patient,
        await models.Patient.create({
          id: pid,
          code: `P_${label}_${now}`,
          userId: uid,
          centerId,
          deleted: false,
          ...patientOverrides,
        })
      );
    };

    // completed: status enum 'completed'
    await mkPatient('done', {
      treatmentStatus: 'completed',
      activeFrom: new Date(now - 60 * 864e5),
      activeTo: new Date(now - 864e5),
    });
    // not-started: status enum 'not_started'
    await mkPatient('future', {
      treatmentStatus: 'not_started',
      activeFrom: new Date(now + 10 * 864e5),
      activeTo: new Date(now + 40 * 864e5),
    });

    const res = await dashboardUser.getTotalPatientsStats(centerId);

    expect(res.totalPatients).toBe(3); // active (seed) + done + future
    expect(res.activePatients).toBe(1); // only the in-treatment seed patient
    expect(res.completedPatients).toBe(1); // only the "done" patient
  });

  it('getUserActivityTrend counts DISTINCT patients who started test/exercise per day (#6)', async () => {
    // #6: mỗi ngày = số BN distinct đã vào bài (bắt đầu lượt — không cần completed).
    const at = new Date();
    at.setUTCDate(at.getUTCDate() - 3);
    at.setUTCHours(12, 0, 0, 0);

    const rows = [
      {
        patientId,
        exerciseId,
        exerciseAssignmentId: assignmentId,
        centerId,
        deleted: false,
        status: 'completed',
        duration: 60,
        startedAt: at,
        createdAt: at,
      },
      {
        patientId,
        exerciseId,
        exerciseAssignmentId: assignmentId,
        centerId,
        deleted: false,
        status: 'completed',
        duration: 60,
        startedAt: at,
        createdAt: at,
      },
      // incomplete nhưng đã vào bài → vẫn tính
      {
        patientId,
        exerciseId,
        exerciseAssignmentId: assignmentId,
        centerId,
        deleted: false,
        status: 'incomplete',
        duration: 30,
        startedAt: at,
        createdAt: at,
      },
    ];
    const inserted = await models.ExerciseResult.bulkCreate(rows, { hooks: false, returning: true });
    inserted.forEach((r) => track(models.ExerciseResult, r));

    const trend = await dashboardUser.getUserActivityTrend(centerId, 30);

    expect(trend).toHaveLength(30);
    const totalActive = trend.reduce((sum, t) => sum + t.loginCount, 0);
    expect(totalActive).toBe(1); // 1 distinct patient on 1 day (2 completed lượt nhưng cùng BN)
    expect(trend.filter((t) => t.loginCount > 0)).toHaveLength(1);
  });
});
