/**
 * E2E (REAL DB, realistic mock data) — Exercise progress chart pipeline.
 *
 * Proves the 4-chỉ-số data pipeline end-to-end:
 *   - startExercise → resolveAssignmentDifficultyLevel ghi ExerciseResult.level từ
 *     patient.examResults (theo visionType + eye) khi không override
 *   - completeExercise → updateSessionStats snapshot session.visionLevel +
 *     session.duration = Σ result.duration (+ averageScore, focusScore)
 *   - getPatientExerciseSessions → trả đúng các cột snapshot cho chart, include config
 *     (visionType/name/eye/frequency), KHÔNG include results, chỉ status='completed'
 *
 * Gated by RUN_DB_INTEGRATION=1; synthetic high centerId; cleans up its own rows only.
 * Yêu cầu DB test đã chạy migration (cột ExerciseSessions.visionLevel + ExerciseResults.level).
 */
const RUN = process.env.RUN_DB_INTEGRATION === '1';
const describeDb = RUN ? describe : describe.skip;

jest.setTimeout(60000);

const models = require('../../src/models');
const { generateTestId } = require('../utils/setupTestDB');
const exerciseResultService = require('../../src/services/exercise/exerciseResult.service');
const exerciseSessionService = require('../../src/services/exercise/exerciseSession.service');

const { sequelize } = models;

const created = [];
const track = (Model, row) => {
  created.push({ Model, id: row.id });
  return row;
};

describeDb('Exercise progress chart E2E (real DB, mock data)', () => {
  const centerId = 2000000000 + (generateTestId() % 100000);
  const userId = generateTestId();
  const patientId = generateTestId();
  const exerciseId = generateTestId();
  const configId = generateTestId();
  const assignmentId = generateTestId();
  const sessionId = generateTestId();
  const incompleteSessionId = generateTestId();

  beforeAll(async () => {
    const host = process.env.DB_HOST || '';
    if (/supabase|pooler|amazonaws|rds\./i.test(host) && process.env.ALLOW_PROD_DB !== '1') {
      throw new Error(`Refusing prod-looking host "${host}". Set ALLOW_PROD_DB=1 if certain.`);
    }
    await sequelize.sync({ force: false });

    track(
      models.Center,
      await models.Center.create({ id: centerId, code: `C_${centerId}`, name: 'C', active: true, deleted: false })
    );

    track(
      models.User,
      await models.User.create({
        id: userId,
        email: `e2e_chart_${centerId}@t.com`,
        password: 'Test1234',
        name: 'E2E Chart',
        phoneNumber: `0${String(userId).padStart(9, '0').slice(-9)}`,
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
      await models.Patient.create({
        id: patientId,
        code: `P_chart_${centerId}`,
        userId,
        centerId,
        deleted: false,
        treatmentStatus: 'active',
        activeFrom: new Date(),
        // far/left = 12 → độ khó kỳ vọng cho config far/left khi không override
        examResults: {
          far: { initialResult: { leftEye: 8, rightEye: 7 }, currentResult: { leftEye: 12, rightEye: 9 } },
        },
      })
    );

    track(
      models.Exercise,
      await models.Exercise.create({
        id: exerciseId,
        code: `EX_${centerId}`,
        name: '2048',
        exerciseType: '2048',
        centerId,
        active: true,
        deleted: false,
      })
    );

    track(
      models.ExerciseConfig,
      await models.ExerciseConfig.create({
        id: configId,
        exerciseId,
        configType: 'system',
        name: 'Config xa',
        eye: 'left',
        distance: 0.5,
        duration: 10, // phút/lượt
        frequency: 'daily',
        executionCount: 1, // 1 lượt → session hoàn thành sau 1 result
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
        complianceStatus: 'on_track',
        sessionsCompleted: 0,
        currentLevel: 1,
        levelOverride: false,
        visionLevel: null, // không override → dùng exam level
        centerId,
      })
    );

    // Session sẽ được hoàn thành qua flow start/complete
    track(
      models.ExerciseSession,
      await models.ExerciseSession.create({
        id: sessionId,
        code: `SS_${sessionId}`,
        exerciseAssignmentId: assignmentId,
        patientId,
        status: 'incomplete',
        startedAt: new Date(),
        centerId,
        executionCount: 1,
        executionDuration: 10,
      })
    );

    // Session incomplete khác → phải BỊ LOẠI khỏi query status='completed'
    track(
      models.ExerciseSession,
      await models.ExerciseSession.create({
        id: incompleteSessionId,
        code: `SS_${incompleteSessionId}`,
        exerciseAssignmentId: assignmentId,
        patientId,
        status: 'incomplete',
        startedAt: new Date(),
        centerId,
        executionCount: 1,
        executionDuration: 10,
      })
    );
  });

  afterAll(async () => {
    // Xóa result phát sinh trong flow trước (con của session)
    await models.ExerciseResult.destroy({ where: { patientId }, force: true });
    for (let i = created.length - 1; i >= 0; i -= 1) {
      const { Model, id } = created[i];
      // eslint-disable-next-line no-await-in-loop
      await Model.destroy({ where: { id }, force: true });
    }
    await sequelize.close();
  });

  it('startExercise resolves difficulty from patient exam level (far/left → 12)', async () => {
    const { action, result } = await exerciseResultService.startExercise(
      sessionId,
      assignmentId,
      patientId,
      centerId,
      userId
    );

    expect(action).toBe('new');
    expect(result.level).toBe(12); // far/left currentResult
  });

  it('completeExercise snapshots session.visionLevel + duration = Σ result.duration', async () => {
    const pending = await models.ExerciseResult.findOne({
      where: { exerciseSessionId: sessionId, status: 'incomplete' },
    });
    expect(pending).toBeTruthy();

    await exerciseResultService.completeExercise(pending.id, {
      score: 250,
      duration: 540, // 9 phút (≤ 10 phút giao → không bị clamp)
      movesCount: 30,
      accuracy: 0.8,
    });

    const session = await models.ExerciseSession.findByPk(sessionId);
    expect(session.status).toBe('completed');
    expect(session.duration).toBe(540);
    expect(session.visionLevel).toBe(12);
    expect(Number(session.averageScore)).toBe(250);
    expect(session.focusScore).toBe(100); // không pause/inactivity
  });

  it('getPatientExerciseSessions returns chart-ready snapshot, includes config, excludes results & incomplete', async () => {
    const res = await exerciseSessionService.getPatientExerciseSessions({ patientId, status: 'completed' }, { limit: 100 });

    const rows = res.rows || res.results || res;
    const row = rows.find((r) => r.id === sessionId);
    expect(row).toBeTruthy();

    // Chỉ status='completed' → session incomplete bị loại
    expect(rows.some((r) => r.id === incompleteSessionId)).toBe(false);

    // 4 chỉ số đọc từ session
    expect(Number(row.averageScore)).toBe(250); // Chỉ số 1
    expect(row.duration).toBe(540); // Chỉ số 2 — tử
    expect(Number(row.executionDuration)).toBe(10); // Chỉ số 2 — mẫu (phút/lượt; DECIMAL → string)
    expect(Number(row.executionCount)).toBe(1); // Chỉ số 2 — mẫu (số lượt)
    expect(row.focusScore).toBe(100); // Chỉ số 3
    expect(row.visionLevel).toBe(12); // Chỉ số 4

    // Config metadata cho hiển thị
    const cfg = row.exerciseAssignment.exerciseConfig;
    expect(cfg.visionType).toBe('far');
    expect(cfg.eye).toBe('left');
    expect(cfg.frequency).toBe('daily');
    expect(cfg.name).toBe('Config xa');

    // KHÔNG include results
    expect(row.results).toBeUndefined();
  });
});
