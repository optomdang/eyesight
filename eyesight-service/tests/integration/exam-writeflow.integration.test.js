/**
 * AUDIT (REAL DB): does completing an exam keep Patient.examResults fresh?
 *
 * Patient.examResults is the read-model the improvement dashboards rely on. It is
 * updated by the ExamResult afterCreate/afterUpdate hook -> updatePatientCompliance.
 * This test documents the data-flow EXACTLY, including the gating condition that
 * makes the cache go stale.
 *
 * SAFETY: gated by RUN_DB_INTEGRATION=1; refuses prod-looking hosts unless ALLOW_PROD_DB=1;
 * synthetic high centerId; cleans up only its own rows.
 */

const RUN = process.env.RUN_DB_INTEGRATION === '1';
const describeDb = RUN ? describe : describe.skip;

jest.setTimeout(60000);

const models = require('../../src/models');
const examResultService = require('../../src/services/exam/examResult.service');

const { sequelize } = models;

const created = [];
const track = (Model, row) => {
  created.push({ Model, id: row.id });
  return row;
};

describeDb('Exam write-flow → Patient.examResults', () => {
  const centerId = 2000000000 + (generateTestIdSafe() % 100000);
  const patientId = generateTestIdSafe();
  const userId = generateTestIdSafe();
  let sessionId;

  // local id generator (kept separate so import order can't matter)
  function generateTestIdSafe() {
    if (!global.__EYESIGHT_TEST_ID_COUNTER__) global.__EYESIGHT_TEST_ID_COUNTER__ = 1000000;
    global.__EYESIGHT_TEST_ID_COUNTER__ += 1;
    return global.__EYESIGHT_TEST_ID_COUNTER__;
  }

  const freshPatient = () => models.Patient.findByPk(patientId, { attributes: ['examResults', 'compliance'], raw: true });

  beforeAll(async () => {
    const host = process.env.DB_HOST || '';
    if (/supabase|pooler|amazonaws|rds\./i.test(host) && process.env.ALLOW_PROD_DB !== '1') {
      throw new Error(`Refusing to run against production-looking host "${host}". Set ALLOW_PROD_DB=1 if certain.`);
    }
    await sequelize.sync({ force: false });
    await models.ExamResult.destroy({ where: { centerId }, force: true });
    await models.ExamAssignment.destroy({ where: { centerId }, force: true });
    await models.ExamSession.destroy({ where: { centerId }, force: true });

    const uniq = `${Date.now()}_${centerId}`;
    track(
      models.Center,
      await models.Center.create({ id: centerId, code: `C_${uniq}`, name: 'C', active: true, deleted: false })
    );
    track(
      models.User,
      await models.User.create({
        id: userId,
        email: `wf_${uniq}@t.com`,
        password: 'Test1234',
        name: 'WF Patient',
        phoneNumber: `0${String(centerId).padStart(9, '0').slice(-9)}`,
        userType: 'patient',
        centerId,
        roleId: 1,
        isEmailVerified: true,
        active: true,
        deleted: false,
      })
    );
    // Patient created with the model's default (empty) examResults.
    track(
      models.Patient,
      await models.Patient.create({ id: patientId, code: `P_${uniq}`, userId, centerId, deleted: false })
    );
    const session = track(
      models.ExamSession,
      await models.ExamSession.create({
        id: generateTestIdSafe(),
        code: `ES_${uniq}`,
        patientId,
        examType: 'far',
        status: 'completed',
        centerId,
      })
    );
    sessionId = session.id;
  });

  afterAll(async () => {
    for (let i = created.length - 1; i >= 0; i -= 1) {
      const { Model, id } = created[i];
      // eslint-disable-next-line no-await-in-loop
      await Model.destroy({ where: { id }, force: true });
    }
    await sequelize.close();
  });

  it('FIXED: a completed exam updates examResults even with no enabled ExamAssignment', async () => {
    const r = track(
      models.ExamResult,
      await examResultService.createExamResult({
        code: `ER_noassign_${Date.now()}`,
        patientId,
        examSessionId: sessionId,
        examType: 'far',
        status: 'completed',
        leftEyeLevel: 14,
        rightEyeLevel: 14,
        centerId,
        updatedBy: userId,
      })
    );
    expect(r.id).toBeTruthy();

    const p = await freshPatient();
    // Vision levels are recorded regardless of any schedule (the fix).
    expect(p.examResults?.far?.currentResult?.leftEye).toBe(14);
    expect(p.examResults?.far?.initialResult?.leftEye).toBe(14);
    // No schedule → compliance for this type is NOT computed.
    expect(p.compliance?.far?.completedExams ?? 0).toBe(0);
  });

  it('with an enabled ExamAssignment, examResults updates AND compliance is computed', async () => {
    track(
      models.ExamAssignment,
      await models.ExamAssignment.create({
        id: generateTestIdSafe(),
        patientId,
        examType: 'far',
        frequency: 'weekly',
        isEnabled: true,
        centerId,
      })
    );

    track(
      models.ExamResult,
      await examResultService.createExamResult({
        code: `ER_assign_${Date.now()}`,
        patientId,
        examSessionId: sessionId,
        examType: 'far',
        status: 'completed',
        leftEyeLevel: 15,
        rightEyeLevel: 15,
        centerId,
        updatedBy: userId,
      })
    );

    const p = await freshPatient();
    expect(p.examResults?.far?.currentResult?.leftEye).toBe(15);
    expect(p.examResults?.far?.currentResult?.rightEye).toBe(15);
    // initialResult stays the first recorded value (14), not overwritten by later exams.
    expect(p.examResults?.far?.initialResult?.leftEye).toBe(14);
    // Compliance for far is now populated (schedule exists).
    expect(p.compliance?.far).toBeDefined();
  });
});
