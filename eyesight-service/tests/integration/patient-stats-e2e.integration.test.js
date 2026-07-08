/**
 * E2E (REAL DB, realistic mock data) — getPatientStatistics KPI accuracy.
 *
 * Seeds a small but realistic center and asserts the core patient-dashboard KPIs match
 * the BU spec exactly (#3 tỷ lệ cải thiện, #4 mức cải thiện, #5 độ tuổi). Proves the
 * vision-improvement algorithm + treatmentStatus enum end-to-end.
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

describeDb('getPatientStatistics E2E (real DB, mock data)', () => {
  const centerId = 2000000000 + (generateTestId() % 100000);
  const now = Date.now();

  // examResults builders
  const farResult = (iL, iR, cL, cR) => ({
    far: { initialResult: { leftEye: iL, rightEye: iR }, currentResult: { leftEye: cL, rightEye: cR } },
  });
  const withNear = (er, iL, cL) => ({
    ...er,
    near: { initialResult: { leftEye: iL, rightEye: iL }, currentResult: { leftEye: cL, rightEye: cL } },
  });

  // Seed one patient with a given status, examResults, dob, causes (codes).
  const mkPatient = async (label, { status, examResults, dob, causes = [] }) => {
    const uid = generateTestId();
    track(
      models.User,
      await models.User.create({
        id: uid,
        email: `e2e_${label}_${centerId}@t.com`,
        password: 'Test1234',
        name: `E2E ${label}`,
        phoneNumber: `0${String(uid).padStart(9, '0').slice(-9)}`,
        userType: 'patient',
        centerId,
        roleId: 1,
        isEmailVerified: true,
        active: true,
        deleted: false,
        dateOfBirth: dob,
      })
    );
    const pid = generateTestId();
    track(
      models.Patient,
      await models.Patient.create({
        id: pid,
        code: `P_${label}_${centerId}`,
        userId: uid,
        centerId,
        deleted: false,
        treatmentStatus: status,
        activeFrom: new Date(now - 60 * 864e5),
        activeTo: new Date(now + 60 * 864e5),
        examResults,
        causes,
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
      await models.Center.create({ id: centerId, code: `C_${now}`, name: 'C', active: true, deleted: false })
    );

    // P1 active, far improved 7→10 (both eyes) → improved; far delta +3. Age 10. cause: refractive_error
    await mkPatient('p1', {
      status: 'active',
      examResults: farResult(7, 7, 10, 10),
      dob: new Date('2016-01-01'),
      causes: ['refractive_error'],
    });
    // P2 completed, far flat 9→9 but near improved 5→7 → improved (near); far delta 0. Age 12. cause: strabismus
    await mkPatient('p2', {
      status: 'completed',
      examResults: withNear(farResult(9, 9, 9, 9), 5, 7),
      dob: new Date('2014-01-01'),
      causes: ['strabismus'],
    });
    // P3 active, everything flat → NOT improved. Age 8. cause: refractive_error
    await mkPatient('p3', {
      status: 'active',
      examResults: farResult(8, 8, 8, 8),
      dob: new Date('2018-01-01'),
      causes: ['refractive_error'],
    });
    // P4 not_started → excluded from everTreated. (improved data but not counted)
    await mkPatient('p4', { status: 'not_started', examResults: farResult(5, 5, 12, 12), dob: new Date('2015-01-01') });
  });

  afterAll(async () => {
    for (let i = created.length - 1; i >= 0; i -= 1) {
      const { Model, id } = created[i];
      // eslint-disable-next-line no-await-in-loop
      await Model.destroy({ where: { id }, force: true });
    }
    await sequelize.close();
  });

  it('#1/#2 BỆNH NHÂN / ĐANG ĐIỀU TRỊ', async () => {
    const res = await dashboardUser.getTotalPatientsStats(centerId);
    expect(res.totalPatients).toBe(4); // all 4
    expect(res.activePatients).toBe(2); // P1, P3
    expect(res.completedPatients).toBe(1); // P2
  });

  it('#3 TỶ LỆ CẢI THIỆN, #4 MỨC ĐỘ CẢI THIỆN, #5 ĐỘ TUỔI', async () => {
    const s = await dashboardUser.getPatientImprovementStats(centerId);

    // everTreated = active|paused|completed = P1,P2,P3 (P4 not_started excluded) = 3
    expect(s.totalTreated).toBe(3);
    // improved = P1 (far), P2 (near) = 2 → 66.67%
    expect(s.improvedCount).toBe(2);
    expect(s.improvementRate).toBe(66.67);
    // #4 far line-delta over improved {P1:+3, P2:0} → avg 1.5
    expect(s.avgImprovementLevel).toBe(1.5);
    // #5 age over improved {P1:10, P2:12} → min10 max12 avg11
    expect(s.ageStats.minAge).toBe(10);
    expect(s.ageStats.maxAge).toBe(12);
    expect(s.ageStats.avgAge).toBe(11);

    // #12-15 — % cải thiện theo loại trên everTreated(3): far=P1(1/3), near=P2(1/3), khác=0
    expect(s.improvementByType.far).toBe(33.33);
    expect(s.improvementByType.near).toBe(33.33);
    expect(s.improvementByType.contrast).toBe(0);
    expect(s.improvementByType.stereopsis).toBe(0);
  });

  it('#9 lọc theo nhóm nguyên nhân (causes overlap trên CODE, không phải label)', async () => {
    // refractive_error → everTreated trong nhóm này = P1 (active, improved) + P3 (active, flat) = 2.
    // (P4 dù refractive-ish nhưng not_started → loại; ở đây P4 không gán causes.)
    const refractive = await dashboardUser.getPatientImprovementStats(centerId, null, ['refractive_error']);
    expect(refractive.totalTreated).toBe(2); // P1, P3
    expect(refractive.improvedCount).toBe(1); // chỉ P1 cải thiện
    expect(refractive.improvementRate).toBe(50); // 1/2

    // strabismus → chỉ P2 (completed, near improved).
    const strabismus = await dashboardUser.getPatientImprovementStats(centerId, null, ['strabismus']);
    expect(strabismus.totalTreated).toBe(1);
    expect(strabismus.improvedCount).toBe(1);
    expect(strabismus.improvementRate).toBe(100);

    // Nhóm không ai mắc → rỗng, rate 0 (không chia cho 0).
    const none = await dashboardUser.getPatientImprovementStats(centerId, null, ['cataract']);
    expect(none.totalTreated).toBe(0);
    expect(none.improvementRate).toBe(0);
  });
});
