/**
 * Unit tests for the cause-group analysis (#9) path of getPatientImprovementStats.
 *   - causes are filtered with Op.overlap on the STORED CODES (not labels).
 *   - improved / declined / stable counts follow the per-type/per-eye vision rule.
 * Mocks Patient.findAll; no DB.
 */
const { Op } = require('sequelize');
const { Patient, User } = require('../../../src/models');
const { getPatientImprovementStats } = require('../../../src/services/dashboard/dashboardUser.service');

// Build a patient row stub (Sequelize instances expose attributes directly).
// getPatientImprovementStats reads only examResults + user.dateOfBirth, so no id is needed.
const mkPatient = (examResults, dob = '2015-01-01') => ({ examResults, user: { dateOfBirth: dob } });

const far = (iL, iR, cL, cR) => ({
  far: { initialResult: { leftEye: iL, rightEye: iR }, currentResult: { leftEye: cL, rightEye: cR } },
});

describe('getPatientImprovementStats — cause group (#9)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('passes causes to the WHERE clause as Op.overlap on codes', async () => {
    const spy = jest.spyOn(Patient, 'findAll').mockResolvedValue([]);
    jest.spyOn(User, 'findAll').mockResolvedValue([]); // safety if referenced

    await getPatientImprovementStats(1, null, ['strabismus', 'cataract']);

    const { where } = spy.mock.calls[0][0];
    expect(where.centerId).toBe(1);
    expect(where.causes).toBeDefined();
    expect(where.causes[Op.overlap]).toEqual(['strabismus', 'cataract']);
  });

  it('does NOT add a causes filter when none given', async () => {
    const spy = jest.spyOn(Patient, 'findAll').mockResolvedValue([]);
    await getPatientImprovementStats(1, null, null);
    expect(spy.mock.calls[0][0].where.causes).toBeUndefined();
  });

  it('classifies improved / declined / stable across the filtered set', async () => {
    // 2 improved (far up), 1 declined (far down), 1 stable (flat) → rate 50%
    jest.spyOn(Patient, 'findAll').mockResolvedValue([
      mkPatient(far(7, 7, 10, 10)), // improved
      mkPatient(far(8, 8, 9, 9)), // improved
      mkPatient(far(12, 12, 9, 9)), // declined
      mkPatient(far(10, 10, 10, 10)), // stable
    ]);

    const res = await getPatientImprovementStats(1, null, ['strabismus']);

    expect(res.totalTreated).toBe(4);
    expect(res.improved).toBe(2);
    expect(res.declined).toBe(1);
    expect(res.stable).toBe(1);
    expect(res.improvementRate).toBe(50); // 2/4
    expect(res.improvementByType.far).toBe(50); // 2/4 improved in far
  });
});
