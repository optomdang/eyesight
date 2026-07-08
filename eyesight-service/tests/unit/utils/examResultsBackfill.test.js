const { rebuildExamResults, isFull, applyCompletedExamToPatientCache } = require('../../../src/utils/examResultsBackfill');

describe('examResultsBackfill.rebuildExamResults (P6)', () => {
  const farFull = (l, r, at) => ({ examType: 'far', leftEyeLevel: l, rightEyeLevel: r, completedAt: at });

  it('rebuilds initial (first full) + current (last full) for an empty cache', () => {
    const exams = [farFull('7', '7', '2026-01-01'), farFull('9', '8', '2026-02-01'), farFull('10', '10', '2026-03-01')];
    const { examResults, changed } = rebuildExamResults({}, exams);

    expect(changed).toBe(true);
    expect(examResults.far.initialResult).toEqual({ leftEye: '7', rightEye: '7', bothEye: null });
    expect(examResults.far.currentResult).toEqual({ leftEye: '10', rightEye: '10', bothEye: null });
    expect(examResults.far.lastExamDate).toBe('2026-03-01');
  });

  it('does NOT overwrite a type that already has currentResult data', () => {
    const existing = { far: { initialResult: { leftEye: '5' }, currentResult: { leftEye: '6' } } };
    const exams = [farFull('7', '7', '2026-01-01')];
    const { examResults, changed } = rebuildExamResults(existing, exams);

    expect(changed).toBe(false);
    expect(examResults.far.currentResult).toEqual({ leftEye: '6' });
  });

  it('keeps an existing initialResult but refreshes empty currentResult', () => {
    const existing = { far: { initialResult: { leftEye: '5', rightEye: '5', bothEye: null } } };
    const exams = [farFull('8', '9', '2026-02-01')];
    const { examResults } = rebuildExamResults(existing, exams);

    expect(examResults.far.initialResult).toEqual({ leftEye: '5', rightEye: '5', bothEye: null });
    expect(examResults.far.currentResult).toEqual({ leftEye: '8', rightEye: '9', bothEye: null });
  });

  it('stereopsis uses bothEye; non-full exams ignored', () => {
    const exams = [
      { examType: 'stereopsis', bothEyeLevel: '12', completedAt: '2026-01-01' },
      { examType: 'far', leftEyeLevel: '7', rightEyeLevel: '', completedAt: '2026-01-02' }, // not full (missing right)
    ];
    const { examResults } = rebuildExamResults({}, exams);

    expect(examResults.stereopsis.currentResult).toEqual({ leftEye: null, rightEye: null, bothEye: '12' });
    expect(examResults.far).toBeUndefined(); // far exam was not full
  });

  it('isFull: far needs both eyes; stereopsis needs bothEye', () => {
    expect(isFull({ examType: 'far', leftEyeLevel: '7', rightEyeLevel: '8' })).toBe(true);
    expect(isFull({ examType: 'far', leftEyeLevel: '7', rightEyeLevel: '' })).toBe(false);
    expect(isFull({ examType: 'stereopsis', bothEyeLevel: '10' })).toBe(true);
    expect(isFull({ examType: 'stereopsis', bothEyeLevel: null })).toBe(false);
  });

  it('applyCompletedExamToPatientCache updates currentResult even when cache was empty', () => {
    const completed = {
      examType: 'far',
      status: 'completed',
      leftEyeLevel: 8,
      rightEyeLevel: 10,
      completedAt: '2026-06-22T00:00:00.000Z',
    };
    const { examResults, changed } = applyCompletedExamToPatientCache({}, completed);

    expect(changed).toBe(true);
    expect(examResults.far.currentResult).toEqual({ leftEye: 8, rightEye: 10, bothEye: null });
    expect(examResults.far.initialResult).toEqual({ leftEye: 8, rightEye: 10, bothEye: null });
  });

  it('applyCompletedExamToPatientCache refreshes currentResult on re-test', () => {
    const existing = {
      far: {
        initialResult: { leftEye: 5, rightEye: 5, bothEye: null },
        currentResult: { leftEye: 5, rightEye: 5, bothEye: null },
      },
    };
    const completed = {
      examType: 'far',
      status: 'completed',
      leftEyeLevel: 9,
      rightEyeLevel: 11,
      completedAt: '2026-06-22T12:00:00.000Z',
    };
    const { examResults, changed } = applyCompletedExamToPatientCache(existing, completed);

    expect(changed).toBe(true);
    expect(examResults.far.initialResult).toEqual({ leftEye: 5, rightEye: 5, bothEye: null });
    expect(examResults.far.currentResult).toEqual({ leftEye: 9, rightEye: 11, bothEye: null });
  });
});
