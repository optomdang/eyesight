/**
 * Validation: Patient.causes must be stored as canonical CODES (not Vietnamese labels).
 * Guards the storage/query contract for dashboard #9 (cause-group filter).
 */
const { updateMedicalRecord } = require('../../../src/validations/clinic/patient.validation');
const { CAUSE_CODES } = require('../../../src/config/causes');

const validateBody = (body) => updateMedicalRecord.body.validate(body, { abortEarly: false });

describe('patient updateMedicalRecord — causes codes', () => {
  it('accepts an array of valid cause codes', () => {
    const { error } = validateBody({ causes: ['refractive_error', 'strabismus'] });
    expect(error).toBeUndefined();
  });

  it('accepts every canonical code', () => {
    const { error } = validateBody({ causes: [...CAUSE_CODES] });
    expect(error).toBeUndefined();
  });

  it('rejects the old Vietnamese label (must be a code now)', () => {
    const { error } = validateBody({ causes: ['Tật khúc xạ (đơn thuần)'] });
    expect(error).toBeDefined();
  });

  it('rejects an unknown code', () => {
    const { error } = validateBody({ causes: ['not_a_real_cause'] });
    expect(error).toBeDefined();
  });
});
