/**
 * Unit tests for exerciseSession.service — focus on getPatientExerciseSessions
 * (the query that powers the progress chart) and confirming dead code removal.
 */

jest.mock('../../../src/config/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../../../src/config/db', () => ({
  sequelize: {
    fn: jest.fn((name, col) => ({ fn: name, col })),
    col: jest.fn((name) => name),
  },
}));

jest.mock('../../../src/models', () => ({
  ExerciseSession: { __name: 'ExerciseSession' },
  ExerciseAssignment: { __name: 'ExerciseAssignment' },
  ExerciseConfig: { __name: 'ExerciseConfig' },
  Exercise: { __name: 'Exercise' },
  ExerciseResult: { __name: 'ExerciseResult' },
}));

jest.mock('../../../src/utils/patterns', () => ({
  standardQuery: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
}));

jest.mock('../../../src/utils/common', () => ({ generateCode: jest.fn(() => 'SS_TEST') }));
jest.mock('../../../src/services/exercise/exerciseAssignment.service', () => ({
  getAssignmentById: jest.fn(),
}));

const { standardQuery } = require('../../../src/utils/patterns');
const { ExerciseSession, ExerciseResult } = require('../../../src/models');
const sessionService = require('../../../src/services/exercise/exerciseSession.service');

describe('exerciseSession.service — getPatientExerciseSessions', () => {
  beforeEach(() => jest.clearAllMocks());

  const getInclude = () => standardQuery.mock.calls[0][3];

  test('queries ExerciseSession with given filter/options', async () => {
    const filter = { patientId: 7, status: 'completed' };
    const options = { sortBy: 'completedAt:asc', limit: 500 };

    await sessionService.getPatientExerciseSessions(filter, options);

    expect(standardQuery).toHaveBeenCalledTimes(1);
    const [model, passedFilter, passedOptions] = standardQuery.mock.calls[0];
    expect(model).toBe(ExerciseSession);
    expect(passedFilter).toEqual(filter);
    expect(passedOptions).toEqual(options);
  });

  test('includes exerciseConfig with visionType/name/eye/frequency for chart display', async () => {
    await sessionService.getPatientExerciseSessions({}, {});

    const include = getInclude();
    const assignmentInc = include.find((i) => i.as === 'exerciseAssignment');
    expect(assignmentInc).toBeTruthy();

    const configInc = assignmentInc.include.find((i) => i.as === 'exerciseConfig');
    expect(configInc).toBeTruthy();
    expect(configInc.attributes).toEqual(expect.arrayContaining(['name', 'visionType', 'eye', 'frequency']));
  });

  test('does NOT include ExerciseResult — chart reads aggregates from the session', async () => {
    await sessionService.getPatientExerciseSessions({}, {});

    const include = getInclude();
    const hasResults = include.some((i) => i.as === 'results' || i.model === ExerciseResult);
    expect(hasResults).toBe(false);
  });

  test('recalculates focusScore from ended results (fixes stale session snapshots)', async () => {
    standardQuery.mockResolvedValueOnce({
      rows: [{ id: 20, focusScore: 100, toJSON: () => ({ id: 20, focusScore: 100 }) }],
      count: 1,
    });
    ExerciseResult.findAll = jest.fn().mockResolvedValue([
      {
        exerciseSessionId: 20,
        status: 'completed',
        duration: 120,
        movesCount: 0,
        pauseCount: 0,
        inactivityCount: 0,
        exerciseConfig: { inactivityThreshold: 30 },
      },
      {
        exerciseSessionId: 20,
        status: 'completed',
        duration: 60,
        movesCount: 5,
        pauseCount: 1,
        inactivityCount: 0,
        exerciseConfig: { inactivityThreshold: 30 },
      },
    ]);

    const result = await sessionService.getPatientExerciseSessions({ patientId: 1 }, {});

    expect(result.rows[0].focusScore).toBe(98); // Math.round((96 + 99) / 2)
  });
});

describe('exerciseSession.service — dead code removal', () => {
  test('completeExerciseSession is no longer exported (dead code removed)', () => {
    expect(sessionService.completeExerciseSession).toBeUndefined();
  });
});

describe('exerciseSession.service — enrichSessionsWithPlayTimes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('maps MIN/MAX result timestamps onto session rows', async () => {
    ExerciseResult.findAll = jest.fn().mockResolvedValue([
      {
        exerciseSessionId: 10,
        firstPlayedAt: new Date('2026-06-22T10:00:00.000Z'),
        lastPlayedAt: new Date('2026-06-22T10:02:00.000Z'),
      },
    ]);

    const rows = [{ id: 10, startedAt: new Date('2026-06-21T17:00:00.000Z'), completedAt: null }];
    const enriched = await sessionService.enrichSessionsWithPlayTimes(rows);

    expect(enriched[0].firstPlayedAt).toEqual(new Date('2026-06-22T10:00:00.000Z'));
    expect(enriched[0].lastPlayedAt).toEqual(new Date('2026-06-22T10:02:00.000Z'));
  });

  test('getAssignmentSessions enriches rows from standardQuery', async () => {
    standardQuery.mockResolvedValueOnce({
      rows: [{ id: 11, toJSON: () => ({ id: 11, startedAt: '2026-06-21T17:00:00.000Z' }) }],
      count: 1,
      page: 1,
      limit: 10,
    });
    ExerciseResult.findAll = jest.fn().mockResolvedValue([
      {
        exerciseSessionId: 11,
        firstPlayedAt: '2026-06-22T10:00:00.000Z',
        lastPlayedAt: '2026-06-22T10:02:00.000Z',
      },
    ]);

    const result = await sessionService.getAssignmentSessions({ exerciseAssignmentId: 27 }, {});

    expect(result.rows[0].firstPlayedAt).toBe('2026-06-22T10:00:00.000Z');
    expect(result.rows[0].lastPlayedAt).toBe('2026-06-22T10:02:00.000Z');
  });
});
