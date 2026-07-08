/**
 * Regression + equivalence test for getPatientCompliance (REAL DB).
 *
 * Pins the summary + topPerformers numbers for a known seed so the upcoming
 * query refactor (drop correlated subquery / unused details / full-table scan)
 * can be proven equivalent. Runs against the SAME seed before and after.
 *
 * SAFETY: gated by RUN_DB_INTEGRATION=1; refuses prod-looking hosts unless ALLOW_PROD_DB=1;
 * uses a synthetic high centerId and cleans up only its own rows.
 *
 * Run: NODE_ENV=test RUN_DB_INTEGRATION=1 npx jest tests/integration/dashboard-compliance.integration.test.js
 */

const RUN = process.env.RUN_DB_INTEGRATION === '1';
const describeDb = RUN ? describe : describe.skip;

jest.setTimeout(60000);

const models = require('../../src/models');
const { generateTestId } = require('../utils/setupTestDB');
const { getPatientCompliance } = require('../../src/services/dashboard/dashboardCompliance.service');

const { sequelize } = models;

const created = [];
const track = (Model, row) => {
  created.push({ Model, id: row.id });
  return row;
};

describeDb('getPatientCompliance accuracy (real DB)', () => {
  const centerId = 2000000000 + (generateTestId() % 100000);
  const patientId = generateTestId();
  const userId = generateTestId();
  const exerciseId = generateTestId();
  const configId = generateTestId();

  // Window for the report.
  const startDate = new Date('2026-03-01T00:00:00Z');
  const endDate = new Date('2026-03-31T23:59:59Z');
  const inWindow = new Date('2026-03-10T10:00:00Z');

  beforeAll(async () => {
    const host = process.env.DB_HOST || '';
    if (/supabase|pooler|amazonaws|rds\./i.test(host) && process.env.ALLOW_PROD_DB !== '1') {
      throw new Error(`Refusing to run against production-looking host "${host}". Set ALLOW_PROD_DB=1 if certain.`);
    }
    await sequelize.sync({ force: false });

    // deterministic clean slate for this synthetic center
    await models.ExerciseSession.destroy({ where: { centerId }, force: true });
    await models.ExerciseResult.destroy({ where: { centerId }, force: true });
    await models.ExerciseAssignment.destroy({ where: { centerId }, force: true });

    const uniq = `${Date.now()}_${centerId}`;
    track(
      models.Center,
      await models.Center.create({ id: centerId, code: `C_${uniq}`, name: 'C', active: true, deleted: false })
    );
    track(
      models.User,
      await models.User.create({
        id: userId,
        email: `cmp_${uniq}@t.com`,
        password: 'Test1234',
        name: 'Cmp Patient',
        phoneNumber: `0${String(centerId).padStart(9, '0').slice(-9)}`,
        userType: 'patient',
        centerId,
        roleId: 1,
        isEmailVerified: true,
        active: true,
        deleted: false,
      })
    );
    track(
      models.Patient,
      await models.Patient.create({ id: patientId, code: `P_${uniq}`, userId, centerId, deleted: false })
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

    // Helper: assignment with N sessions, C of them completed (rest incomplete).
    // Each assignment gets its own config — there is a unique (patientId, exerciseConfigId, centerId).
    let startedSeq = 0;
    const mkAssignment = async (total, completed) => {
      const cfgId = generateTestId();
      track(
        models.ExerciseConfig,
        await models.ExerciseConfig.create({
          id: cfgId,
          exerciseId,
          configType: 'system',
          name: `cfg_${cfgId}`,
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
      const aId = generateTestId();
      track(
        models.ExerciseAssignment,
        await models.ExerciseAssignment.create({
          id: aId,
          patientId,
          exerciseConfigId: cfgId,
          assignedBy: 1,
          status: 'active',
          currentLevel: 1,
          centerId,
          deleted: false,
          createdAt: startDate,
        })
      );
      for (let i = 0; i < total; i += 1) {
        startedSeq += 1;
        const startedAt = new Date(inWindow.getTime() + startedSeq * 60000);
        // eslint-disable-next-line no-await-in-loop
        const s = await models.ExerciseSession.create({
          code: `ES_${aId}_${i}`,
          patientId,
          exerciseAssignmentId: aId,
          centerId,
          status: i < completed ? 'completed' : 'incomplete',
          averageScore: 50,
          focusScore: 90,
          bestScore: 60,
          startedAt,
          createdAt: inWindow,
        });
        track(models.ExerciseSession, s);
      }
      return aId;
    };

    await mkAssignment(4, 3); // rate 75 → compliant
    await mkAssignment(4, 2); // rate 50 → not compliant
    await mkAssignment(0, 0); // rate 0  → not compliant
  });

  afterAll(async () => {
    for (let i = created.length - 1; i >= 0; i -= 1) {
      const { Model, id } = created[i];
      // eslint-disable-next-line no-await-in-loop
      await Model.destroy({ where: { id }, force: true });
    }
    await sequelize.close();
  });

  it('summary numbers match the seed exactly', async () => {
    const { summary } = await getPatientCompliance(centerId, startDate, endDate);

    expect(summary.totalPatients).toBe(3); // 3 assignments
    expect(summary.compliantPatients).toBe(1); // only the 75% one (>=75)
    expect(summary.overallComplianceRate).toBe(33.33); // 1/3
    expect(summary.totalScheduledSessions).toBe(8); // 4 + 4 + 0
    expect(summary.completedSessions).toBe(5); // 3 + 2 + 0
    expect(summary.sessionCompletionRate).toBe(62.5); // 5/8
  });

  it('topPerformers are ranked by compliance rate, capped at 10', async () => {
    const { topPerformers } = await getPatientCompliance(centerId, startDate, endDate);

    expect(topPerformers.length).toBe(3);
    expect(topPerformers.map((p) => p.complianceRate)).toEqual([75, 50, 0]);
    expect(topPerformers[0].sessionsCompleted).toBe(3);
  });
});
