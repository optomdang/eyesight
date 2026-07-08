/**
 * E2E (REAL DB) — #9 lọc cải thiện theo NHÓM NGUYÊN NHÂN (causes Op.overlap) + #10 getAgeCorrelation.
 *
 * This closes a real coverage gap: the `causes` filter and getAgeCorrelation had ZERO tests.
 * Causes are stored/queried as CODES (config/causes.js); the FE maps code → Vietnamese label.
 *
 * Gated by RUN_DB_INTEGRATION=1; synthetic high centerId; cleans up its own rows only.
 */
const RUN = process.env.RUN_DB_INTEGRATION === '1';
const describeDb = RUN ? describe : describe.skip;

jest.setTimeout(60000);

const models = require('../../src/models');
const { generateTestId } = require('../utils/setupTestDB');
const dashboardUser = require('../../src/services/dashboard/dashboardUser.service');
const dashboardPatient = require('../../src/services/dashboard/dashboardPatient.service');

const { sequelize } = models;

// Stored CODES (config/causes.js). FE maps these to Vietnamese labels for display.
const CAUSE = {
  refractive: 'refractive_error',
  strabismus: 'strabismus',
  ptosis: 'ptosis',
  cataract: 'cataract',
  cornea: 'corneal_disease',
  retina: 'fundus_disease',
};

const created = [];
const track = (Model, row) => {
  created.push({ Model, id: row.id });
  return row;
};

describeDb('#9 causes filter + #10 age correlation (real DB)', () => {
  const centerId = 2000000000 + (generateTestId() % 100000);
  const now = Date.now();

  const farResult = (iL, iR, cL, cR) => ({
    far: { initialResult: { leftEye: iL, rightEye: iR }, currentResult: { leftEye: cL, rightEye: cR } },
  });
  // dob giving a clean floor(age): subtract age years + 60 days so we are safely past the birthday.
  const dobForAge = (age) => new Date(now - (age * 365.25 + 60) * 864e5);

  const mkPatient = async (label, { causes, examResults, age }) => {
    const uid = generateTestId();
    track(
      models.User,
      await models.User.create({
        id: uid,
        email: `cz_${label}_${centerId}@t.com`,
        password: 'Test1234',
        name: `CZ ${label}`,
        phoneNumber: `0${String(uid).padStart(9, '0').slice(-9)}`,
        userType: 'patient',
        centerId,
        roleId: 1,
        isEmailVerified: true,
        active: true,
        deleted: false,
        dateOfBirth: dobForAge(age),
      })
    );
    track(
      models.Patient,
      await models.Patient.create({
        id: generateTestId(),
        code: `CZ_${label}`,
        userId: uid,
        centerId,
        deleted: false,
        treatmentStatus: 'active',
        activeFrom: new Date(now - 30 * 864e5),
        activeTo: new Date(now + 60 * 864e5),
        causes,
        examResults,
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
      await models.Center.create({ id: centerId, code: `CZC_${now}`, name: 'C', active: true, deleted: false })
    );

    // P1 strabismus, far 7→10 → IMPROVED, age 8
    await mkPatient('P1', { causes: [CAUSE.strabismus], examResults: farResult(7, 7, 10, 10), age: 8 });
    // P2 strabismus, far 10→7 → DECLINED, age 8
    await mkPatient('P2', { causes: [CAUSE.strabismus], examResults: farResult(10, 10, 7, 7), age: 8 });
    // P3 ptosis, far 8→8 → STABLE, age 10
    await mkPatient('P3', { causes: [CAUSE.ptosis], examResults: farResult(8, 8, 8, 8), age: 10 });
    // P4 refractive + strabismus, far 9→11 → IMPROVED, age 25 (>18 bucket)
    await mkPatient('P4', {
      causes: [CAUSE.refractive, CAUSE.strabismus],
      examResults: farResult(9, 9, 11, 11),
      age: 25,
    });
  });

  afterAll(async () => {
    for (let i = created.length - 1; i >= 0; i -= 1) {
      const { Model, id } = created[i];
      // eslint-disable-next-line no-await-in-loop
      await Model.destroy({ where: { id }, force: true });
    }
    await sequelize.close();
  });

  it('#9 no filter → counts all everTreated (improved/declined/stable)', async () => {
    const s = await dashboardUser.getPatientImprovementStats(centerId);
    expect(s.totalTreated).toBe(4);
    expect(s.improved).toBe(2); // P1, P4
    expect(s.declined).toBe(1); // P2
    expect(s.stable).toBe(1); // P3
    expect(s.improvementRate).toBe(50);
  });

  it('#9 causes=[Lác/Lé] → Op.overlap keeps only patients with that cause', async () => {
    const s = await dashboardUser.getPatientImprovementStats(centerId, null, [CAUSE.strabismus]);
    // P1, P2, P4 carry 'Lác/Lé' (P4 via multi-cause overlap); P3 (ptosis) excluded.
    expect(s.totalTreated).toBe(3);
    expect(s.improved).toBe(2); // P1, P4
    expect(s.declined).toBe(1); // P2
    expect(s.stable).toBe(0);
    expect(s.improvementRate).toBe(66.67);
  });

  it('#9 causes=[Sụp mi] → only the ptosis patient (stable)', async () => {
    const s = await dashboardUser.getPatientImprovementStats(centerId, null, [CAUSE.ptosis]);
    expect(s.totalTreated).toBe(1);
    expect(s.improved).toBe(0);
    expect(s.stable).toBe(1);
    expect(s.improvementRate).toBe(0);
  });

  it('#9 causes with no matching patients → empty set, 0%', async () => {
    const s = await dashboardUser.getPatientImprovementStats(centerId, null, [CAUSE.cataract]);
    expect(s.totalTreated).toBe(0);
    expect(s.improvementRate).toBe(0);
  });

  it('#9 multi-cause filter overlaps if ANY cause matches', async () => {
    const s = await dashboardUser.getPatientImprovementStats(centerId, null, [CAUSE.ptosis, CAUSE.strabismus]);
    expect(s.totalTreated).toBe(4); // P1,P2,P4 (strabismus) + P3 (ptosis)
  });

  it('#10 getAgeCorrelation buckets by age with correct improvement counts', async () => {
    const { data } = await dashboardPatient.getAgeCorrelation(centerId);
    const byAge = Object.fromEntries(data.map((g) => [g.ageGroup, g]));

    // age 8: P1 (improved) + P2 (declined) → 2 total, 1 improved
    expect(byAge['8'].totalPatients).toBe(2);
    expect(byAge['8'].improvedPatients).toBe(1);
    expect(byAge['8'].improvementRate).toBe(50);
    // age 10: P3 (stable) → 1 total, 0 improved
    expect(byAge['10'].totalPatients).toBe(1);
    expect(byAge['10'].improvedPatients).toBe(0);
    // >18: P4 (improved) → 1 total, 1 improved
    expect(byAge['>18'].totalPatients).toBe(1);
    expect(byAge['>18'].improvedPatients).toBe(1);
  });
});
