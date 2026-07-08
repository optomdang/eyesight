/**
 * Validation schema tests for exam result routes.
 * Ensures params schemas match actual route shapes — prevents regression
 * where patientId was incorrectly required on flat routes.
 */

const {
  getExamResult,
  getExamResultById,
  updateExamResult,
  deleteExamResult,
  getExamResults,
} = require('../../../src/validations/exam/examResult.validation');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const validate = (schema, value) => {
  const { error, value: validated } = schema.validate(value, { abortEarly: false });
  return { error, value: validated };
};

// ---------------------------------------------------------------------------
// GET /exam-results/:resultId  (flat route — no patientId)
// ---------------------------------------------------------------------------
describe('getExamResultById (flat route: /exam-results/:resultId)', () => {
  it('accepts valid resultId', () => {
    const { error } = validate(getExamResultById.params, { resultId: 253 });
    expect(error).toBeUndefined();
  });

  it('rejects missing resultId', () => {
    const { error } = validate(getExamResultById.params, {});
    expect(error).toBeDefined();
  });

  it('does NOT require patientId', () => {
    // If patientId was required this would fail — regression guard
    const { error } = validate(getExamResultById.params, { resultId: 1 });
    expect(error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// GET /patients/:patientId/exam-results/:resultId  (nested route)
// ---------------------------------------------------------------------------
describe('getExamResult (nested route: /patients/:patientId/exam-results/:resultId)', () => {
  it('accepts both patientId and resultId', () => {
    const { error } = validate(getExamResult.params, { patientId: 1, resultId: 253 });
    expect(error).toBeUndefined();
  });

  it('rejects missing patientId', () => {
    const { error } = validate(getExamResult.params, { resultId: 253 });
    expect(error).toBeDefined();
  });

  it('rejects missing resultId', () => {
    const { error } = validate(getExamResult.params, { patientId: 1 });
    expect(error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// PATCH /exam-results/:resultId  (flat route — no patientId)
// ---------------------------------------------------------------------------
describe('updateExamResult (flat route: PATCH /exam-results/:resultId)', () => {
  it('accepts valid resultId', () => {
    const { error } = validate(updateExamResult.params, { resultId: 253 });
    expect(error).toBeUndefined();
  });

  it('does NOT require patientId — regression guard', () => {
    // Before fix: schema had patientId: standardId (required), causing 400
    const { error } = validate(updateExamResult.params, { resultId: 1 });
    expect(error).toBeUndefined();
  });

  it('rejects missing resultId', () => {
    const { error } = validate(updateExamResult.params, {});
    expect(error).toBeDefined();
  });

  it('accepts valid body fields', () => {
    const { error } = validate(updateExamResult.body, { status: 'completed' });
    expect(error).toBeUndefined();
  });

  it('rejects empty body', () => {
    const { error } = validate(updateExamResult.body, {});
    expect(error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// DELETE /exam-results/:resultId  (flat route — no patientId)
// ---------------------------------------------------------------------------
describe('deleteExamResult (flat route: DELETE /exam-results/:resultId)', () => {
  it('accepts valid resultId', () => {
    const { error } = validate(deleteExamResult.params, { resultId: 253 });
    expect(error).toBeUndefined();
  });

  it('does NOT require patientId — regression guard', () => {
    // Before fix: schema had patientId: standardId (required), causing 400
    const { error } = validate(deleteExamResult.params, { resultId: 1 });
    expect(error).toBeUndefined();
  });

  it('rejects missing resultId', () => {
    const { error } = validate(deleteExamResult.params, {});
    expect(error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// GET /exam-results  (list — patientId optional query param)
// ---------------------------------------------------------------------------
describe('getExamResults (list route)', () => {
  it('accepts empty query', () => {
    const { error } = validate(getExamResults.query, {});
    expect(error).toBeUndefined();
  });

  it('accepts optional patientId as query param', () => {
    const { error } = validate(getExamResults.query, { patientId: 1 });
    expect(error).toBeUndefined();
  });
});
