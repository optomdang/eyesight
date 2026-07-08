/**
 * E2E (REAL DB) — closes ZERO-coverage gaps for the dashboard LIST/TABLE endpoints:
 *   getInactivePatients (#5), getExamDetails (#18), getExerciseDetails (#27), getComplianceDetails.
 *
 * Seeds a small scoped center and asserts: correct rows, center scoping, in-treatment + login
 * filtering for inactive patients, and pagination shape. Gated by RUN_DB_INTEGRATION=1.
 */
const RUN = process.env.RUN_DB_INTEGRATION === '1';
const describeDb = RUN ? describe : describe.skip;

jest.setTimeout(60000);

const models = require('../../src/models');
const { generateTestId } = require('../utils/setupTestDB');
const dashboardUser = require('../../src/services/dashboard/dashboardUser.service');
const dashboardExam = require('../../src/services/dashboard/dashboardExam.service');
const dashboardExercise = require('../../src/services/dashboard/dashboardExercise.service');
const dashboardCompliance = require('../../src/services/dashboard/dashboardCompliance.service');

const { sequelize } = models;
const DAY = 864e5;

const created = [];
const track = (Model, row) => {
  created.push({ Model, id: row.id });
  return row;
};

describeDb('Dashboard list/table endpoints (real DB)', () => {
  const centerId = 2000000000 + (generateTestId() % 100000);
  const now = Date.now();
  const start = new Date(now - 30 * DAY);
  const end = new Date(now + DAY);

  let doctorId;
  let inactivePatient;
  let assignment;

  const mkUser = async (label, lastLoginAt, userType = 'patient') => {
    const uid = generateTestId();
    return track(
      models.User,
      await models.User.create({
        id: uid,
        email: `tbl_${label}_${centerId}@t.com`,
        password: 'Test1234',
        name: `TBL ${label}`,
        phoneNumber: `0${String(uid).padStart(9, '0').slice(-9)}`,
        userType,
        centerId,
        roleId: 1,
        isEmailVerified: true,
        active: true,
        deleted: false,
        lastLoginAt,
      })
    );
  };

  const mkPatient = async (label, { status, lastLoginAt }) => {
    const u = await mkUser(label, lastLoginAt);
    return track(
      models.Patient,
      await models.Patient.create({
        id: generateTestId(),
        code: `TBLP_${label}`,
        userId: u.id,
        doctorId,
        centerId,
        deleted: false,
        treatmentStatus: status,
        activeFrom: new Date(now - 20 * DAY),
        activeTo: new Date(now + 60 * DAY),
      })
    );
  };

  beforeAll(async () => {
    const host = process.env.DB_HOST || '';
    if (/supabase|pooler|amazonaws|rds\./i.test(host) && process.env.ALLOW_PROD_DB !== '1') {
      throw new Error(`Refusing prod-looking host "${host}". Set ALLOW_PROD_DB=1 if certain.`);
    }
    await sequelize.sync({ force: false });
    await models.Patient.destroy({ where: { centerId }, force: true });

    track(
      models.Center,
      await models.Center.create({ id: centerId, code: `TBLC_${now}`, name: 'C', active: true, deleted: false })
    );

    const docUser = await mkUser('doc', new Date(now), 'doctor');
    const doctor = track(
      models.Doctor,
      await models.Doctor.create({ code: `TBLD_${now}`, userId: docUser.id, centerId, deleted: false })
    );
    doctorId = doctor.id;

    // Active + stale login (30d ago) → SHOULD appear in inactive list.
    inactivePatient = await mkPatient('inactive', { status: 'active', lastLoginAt: new Date(now - 30 * DAY) });
    // Active + logged in today → should NOT appear.
    await mkPatient('recent', { status: 'active', lastLoginAt: new Date(now) });
    // Paused (not in treatment) → should NOT appear even though login is stale.
    await mkPatient('paused', { status: 'paused', lastLoginAt: new Date(now - 30 * DAY) });

    // Exercise chain for the inactive patient (feeds getExerciseDetails + getComplianceDetails).
    const exercise = track(
      models.Exercise,
      await models.Exercise.create({
        id: generateTestId(),
        code: `TBLE_${now}`,
        name: '2048',
        exerciseType: '2048',
        centerId,
        deleted: false,
      })
    );
    const config = track(
      models.ExerciseConfig,
      await models.ExerciseConfig.create({
        id: generateTestId(),
        exerciseId: exercise.id,
        configType: 'system',
        name: 'cfg',
        eye: 'both',
        distance: 0.5,
        duration: 10,
        frequency: 'daily',
        executionCount: 3,
        visionType: 'far',
        centerId,
        deleted: false,
      })
    );
    assignment = track(
      models.ExerciseAssignment,
      await models.ExerciseAssignment.create({
        id: generateTestId(),
        patientId: inactivePatient.id,
        exerciseConfigId: config.id,
        assignedBy: docUser.id,
        status: 'active',
        currentLevel: 2,
        centerId,
        deleted: false,
        createdAt: new Date(now - 10 * DAY),
      })
    );
    const session = track(
      models.ExerciseSession,
      await models.ExerciseSession.create({
        id: generateTestId(),
        code: `TBLXS_${now}`,
        exerciseAssignmentId: assignment.id,
        patientId: inactivePatient.id,
        status: 'completed',
        startedAt: new Date(now - 5 * DAY),
        executionCount: 3,
        executionDuration: 10,
        centerId,
        createdAt: new Date(now - 5 * DAY),
      })
    );
    await models.ExerciseResult.bulkCreate(
      [
        {
          patientId: inactivePatient.id,
          exerciseId: exercise.id,
          exerciseAssignmentId: assignment.id,
          exerciseSessionId: session.id,
          status: 'completed',
          score: 1024,
          duration: 300,
          focusScore: 90,
          centerId,
          deleted: false,
          createdAt: new Date(now - 5 * DAY),
        },
        {
          patientId: inactivePatient.id,
          exerciseId: exercise.id,
          exerciseAssignmentId: assignment.id,
          exerciseSessionId: session.id,
          status: 'incomplete',
          score: 200,
          duration: 60,
          focusScore: 80,
          centerId,
          deleted: false,
          createdAt: new Date(now - 5 * DAY),
        },
      ],
      { hooks: false, returning: true }
    ).then((rows) => rows.forEach((r) => track(models.ExerciseResult, r)));

    // Exam chain (feeds getExamDetails).
    const examSession = track(
      models.ExamSession,
      await models.ExamSession.create({
        id: generateTestId(),
        code: `TBLES_${now}`,
        patientId: inactivePatient.id,
        examType: 'far',
        status: 'completed',
        centerId,
        createdAt: new Date(now - 4 * DAY),
      })
    );
    track(
      models.ExamResult,
      await models.ExamResult.create(
        {
          code: `TBLER_${now}`,
          patientId: inactivePatient.id,
          examSessionId: examSession.id,
          examType: 'far',
          status: 'completed',
          leftEyeLevel: 12,
          rightEyeLevel: 12,
          centerId,
          completedAt: new Date(now - 4 * DAY),
          createdAt: new Date(now - 4 * DAY),
        },
        { hooks: false }
      )
    );
  });

  afterAll(async () => {
    for (let i = created.length - 1; i >= 0; i -= 1) {
      const { Model, id } = created[i];
      // eslint-disable-next-line no-await-in-loop
      await Model.destroy({ where: { id }, force: true });
    }
    await sequelize.close();
  });

  it('#5 getInactivePatients — only active patients with stale/empty login', async () => {
    const res = await dashboardUser.getInactivePatients(centerId, 7, { limit: 50, page: 1 });
    const codes = res.rows.map((r) => r.code);
    expect(codes).toContain('TBLP_inactive');
    expect(codes).not.toContain('TBLP_recent'); // logged in today
    expect(codes).not.toContain('TBLP_paused'); // not in treatment
    const row = res.rows.find((r) => r.code === 'TBLP_inactive');
    expect(row.daysInactive).toBeGreaterThanOrEqual(29);
  });

  it('#18 getExamDetails — paginated exam rows scoped to the center', async () => {
    const res = await dashboardExam.getExamDetails(centerId, 1, 10, start, end);
    expect(res.total).toBeGreaterThanOrEqual(1);
    const row = res.data.find((d) => d.patientName === 'TBL inactive');
    expect(row).toBeDefined();
    expect(row.examType).toBe('far');
    expect(row.status).toBe('completed');
  });

  it('#27 getExerciseDetails — paginated exercise rows scoped to the center', async () => {
    const res = await dashboardExercise.getExerciseDetails(centerId, 1, 10, start, end);
    expect(res.total).toBeGreaterThanOrEqual(2); // 1 completed + 1 incomplete
    const completed = res.data.find((d) => d.status === 'completed' && d.patientName === 'TBL inactive');
    expect(completed).toBeDefined();
    expect(completed.exerciseType).toBe('2048');
  });

  it('getComplianceDetails — per-assignment compliance row', async () => {
    const res = await dashboardCompliance.getComplianceDetails(centerId, 1, 10, start, end);
    expect(res.total).toBeGreaterThanOrEqual(1);
    const row = res.data.find((d) => d.id === assignment.id);
    expect(row).toBeDefined();
    expect(row.patientCode).toBe('TBLP_inactive');
    expect(row.totalSessions).toBe(1); // one session in window
    expect(row.completedSessions).toBe(1);
    expect(row.complianceRate).toBe(100);
  });
});
