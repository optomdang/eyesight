/**
 * E2E (REAL DB, realistic mock data) — getLeaderboard (#7 BẢNG XẾP HẠNG).
 *
 * Seeds active patients with KNOWN exercise sessions/results + examResults and asserts the
 * BU ranking end-to-end:
 *   HOÀN THÀNH% (#8) = (test full + lượt tập completed) / (test giao + lượt tập giao)
 *   TẬP TRUNG%  (#9) = AVG(focusScore) các lượt completed
 *   CẢI THIỆN        = far line-delta (số dòng xa)
 *   PHỤC HỒI%   (#10)= hiển thị, không xếp hạng
 *   Sort: HOÀN THÀNH → TẬP TRUNG → CẢI THIỆN → patientCode (khóa phụ ổn định)
 *
 * Gated by RUN_DB_INTEGRATION=1; synthetic high centerId; cleans up its own rows only.
 */
const RUN = process.env.RUN_DB_INTEGRATION === '1';
const describeDb = RUN ? describe : describe.skip;

jest.setTimeout(60000);

const models = require('../../src/models');
const { generateTestId } = require('../utils/setupTestDB');
const dashboardUser = require('../../src/services/dashboard/dashboardUser.service');

const { sequelize } = models;

const created = [];
const track = (Model, row) => {
  created.push({ Model, id: row.id });
  return row;
};

describeDb('getLeaderboard E2E (real DB, mock data)', () => {
  const centerId = 2000000000 + (generateTestId() % 100000);
  const now = Date.now();
  let exerciseId;
  let configId;

  // far examResults builder (left/right initial → current)
  const farResult = (iL, iR, cL, cR) => ({
    far: { initialResult: { leftEye: iL, rightEye: iR }, currentResult: { leftEye: cL, rightEye: cR } },
  });

  /**
   * Seed an ACTIVE patient with one exercise session (assigned = executionCount lượt),
   * `completedCount` completed results at `focus`, and optional far examResults.
   */
  const mkPatient = async (label, { assigned, completedCount, focus, examResults }) => {
    const uid = generateTestId();
    track(
      models.User,
      await models.User.create({
        id: uid,
        email: `lb_${label}_${centerId}@t.com`,
        password: 'Test1234',
        name: `LB ${label}`,
        phoneNumber: `0${String(uid).padStart(9, '0').slice(-9)}`,
        userType: 'patient',
        centerId,
        roleId: 1,
        isEmailVerified: true,
        active: true,
        deleted: false,
      })
    );
    const pid = generateTestId();
    const patient = track(
      models.Patient,
      await models.Patient.create({
        id: pid,
        code: `LB_${label}`,
        userId: uid,
        centerId,
        deleted: false,
        treatmentStatus: 'active',
        activeFrom: new Date(now - 30 * 864e5),
        activeTo: new Date(now + 60 * 864e5),
        examResults: examResults || {},
      })
    );

    const assignment = track(
      models.ExerciseAssignment,
      await models.ExerciseAssignment.create({
        id: generateTestId(),
        patientId: pid,
        exerciseConfigId: configId,
        assignedBy: 1,
        status: 'active',
        currentLevel: 1,
        centerId,
        deleted: false,
      })
    );

    const session = track(
      models.ExerciseSession,
      await models.ExerciseSession.create({
        id: generateTestId(),
        code: `LBS_${label}_${now}`,
        exerciseAssignmentId: assignment.id,
        patientId: pid,
        status: 'completed',
        startedAt: new Date(now - 1 * 864e5),
        executionCount: assigned,
        executionDuration: 5,
        centerId,
      })
    );

    // `completedCount` completed results at the given focusScore (full 5min = 100%).
    for (let i = 0; i < completedCount; i += 1) {
      track(
        models.ExerciseResult,
        // eslint-disable-next-line no-await-in-loop
        await models.ExerciseResult.create({
          id: generateTestId(),
          patientId: pid,
          exerciseId,
          exerciseAssignmentId: assignment.id,
          exerciseSessionId: session.id,
          status: 'completed',
          score: 100,
          duration: 300,
          focusScore: focus,
          centerId,
          deleted: false,
          createdAt: new Date(now - 1 * 864e5),
        })
      );
    }
    return patient;
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
      await models.Center.create({ id: centerId, code: `LBC_${now}`, name: 'C', active: true, deleted: false })
    );
    exerciseId = generateTestId();
    track(
      models.Exercise,
      await models.Exercise.create({
        id: exerciseId,
        code: `LBE_${now}`,
        name: '2048',
        exerciseType: '2048',
        centerId,
        deleted: false,
      })
    );
    configId = generateTestId();
    track(
      models.ExerciseConfig,
      await models.ExerciseConfig.create({
        id: configId,
        exerciseId,
        configType: 'system',
        name: `LBcfg_${now}`,
        eye: 'both',
        distance: 0.5,
        duration: 5,
        frequency: 'daily',
        executionCount: 4,
        visionType: 'far',
        centerId,
        deleted: false,
      })
    );

    // A: 4/4 = 100%, focus 90, far 7→10 (+3)
    await mkPatient('A', { assigned: 4, completedCount: 4, focus: 90, examResults: farResult(7, 7, 10, 10) });
    // B: 2/4 = 50%, focus 99
    await mkPatient('B', { assigned: 4, completedCount: 2, focus: 99 });
    // C: 1/4 = 25%, focus 80
    await mkPatient('C', { assigned: 4, completedCount: 1, focus: 80 });
    // D & E: identical 50% / focus 99 / no improvement → tie broken by patientCode (D before E)
    await mkPatient('E', { assigned: 4, completedCount: 2, focus: 99 });
    await mkPatient('D', { assigned: 4, completedCount: 2, focus: 99 });
  });

  afterAll(async () => {
    for (let i = created.length - 1; i >= 0; i -= 1) {
      const { Model, id } = created[i];
      // eslint-disable-next-line no-await-in-loop
      await Model.destroy({ where: { id }, force: true });
    }
    await sequelize.close();
  });

  it('ranks HOÀN THÀNH → TẬP TRUNG → CẢI THIỆN, with stable patientCode tiebreak', async () => {
    const board = await dashboardUser.getLeaderboard(centerId);
    const codes = board.map((b) => b.patientCode);

    // A (100%) first; then the 50% group ordered by focus then code: B,D,E all focus 99 → by code;
    // C (25%) last. Tie among B/D/E (same completion 50, focus 99, improvement 0) → patientCode asc.
    expect(codes).toEqual(['LB_A', 'LB_B', 'LB_D', 'LB_E', 'LB_C']);

    const a = board[0];
    expect(a.completionRate).toBe(100); // 4 done / 4 giao
    expect(a.focusScore).toBe(90);
    expect(a.improvementLines).toBe(3); // far 7→10
    expect(a.recoveryPct).not.toBeNull(); // far level 10 → a recovery %

    const b = board[1];
    expect(b.completionRate).toBe(50); // 2/4
    expect(b.focusScore).toBe(99);
    expect(b.improvementLines).toBe(0); // no examResults

    const c = board[board.length - 1];
    expect(c.patientCode).toBe('LB_C');
    expect(c.completionRate).toBe(25); // 1/4
  });

  it('caps the board at 10 entries', async () => {
    const board = await dashboardUser.getLeaderboard(centerId);
    expect(board.length).toBeLessThanOrEqual(10);
  });
});
