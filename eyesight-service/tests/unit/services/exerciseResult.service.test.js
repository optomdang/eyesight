jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../../src/services/index', () => ({
  exerciseComplianceService: {
    recordSessionCompletion: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../src/services/exercise/exerciseSessionCompletion.service', () => ({
  recordSessionCompletion: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/models', () => ({
  ExerciseResult: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    increment: jest.fn().mockResolvedValue(undefined),
  },
  Exercise: {},
  ExerciseAssignment: {
    findByPk: jest.fn(),
  },
  Patient: {
    findByPk: jest.fn(),
  },
  sequelize: {},
}));

jest.mock('../../../src/models/exercise/exerciseSession.model', () => ({
  findByPk: jest.fn(),
  increment: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/models/exercise/exerciseConfig.model', () => ({}));

const { ExerciseResult, ExerciseAssignment, Patient } = require('../../../src/models');
const ExerciseSession = require('../../../src/models/exercise/exerciseSession.model');
const { recordSessionCompletion } = require('../../../src/services/exercise/exerciseSessionCompletion.service');
const exerciseResultService = require('../../../src/services/exercise/exerciseResult.service');

// ─── helpers ────────────────────────────────────────────────────────────────

/** Build a minimal ExerciseResult mock with default fields */
const makeResult = (overrides = {}) => ({
  id: 1,
  patientId: 4,
  status: 'incomplete',
  exerciseSessionId: 20,
  score: 0,
  duration: 0,
  movesCount: 0,
  accuracy: 0,
  pauseCount: 0,
  inactivityCount: 0,
  focusScore: 100,
  exerciseConfig: { duration: 5, minScore: 0, minAccuracy: 0 }, // 5 min = 300s limit; pause tests use duration < 300s
  exerciseState: null,
  update: jest.fn().mockImplementation(async function (values) {
    Object.assign(this, values);
  }),
  ...overrides,
});

/** Build a minimal ExerciseSession mock */
const makeSession = (overrides = {}) => ({
  id: 20,
  status: 'incomplete',
  startedAt: new Date(Date.now() - 600000), // started 10 minutes ago
  exerciseAssignmentId: 3,
  pauseCount: 0,
  inactivityCount: 0,
  focusScore: 100,
  endedAt: null,
  exerciseAssignment: {
    exerciseConfig: { executionCount: 1, duration: 5, minScore: 0, minAccuracy: 0 },
  },
  executionDuration: 5,
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// ─── isValidExerciseState ────────────────────────────────────────────────────

describe('isValidExerciseState', () => {
  const validState = {
    grid: { size: 4, cells: [[null, null, null, null]] },
    score: 0,
    over: false,
    won: false,
    keepPlaying: false,
  };

  test('returns true for a valid 2048 game state', () => {
    expect(exerciseResultService.isValidExerciseState(validState)).toBe(true);
  });

  test('returns false for null / undefined', () => {
    expect(exerciseResultService.isValidExerciseState(null)).toBe(false);
    expect(exerciseResultService.isValidExerciseState(undefined)).toBe(false);
  });

  test('returns false when grid is missing', () => {
    expect(exerciseResultService.isValidExerciseState({ score: 0, over: false, won: false })).toBe(false);
  });

  test('returns false when grid.size is not a positive number', () => {
    expect(exerciseResultService.isValidExerciseState({ ...validState, grid: { size: 'bad', cells: [] } })).toBe(false);
    expect(exerciseResultService.isValidExerciseState({ ...validState, grid: { size: 0, cells: [] } })).toBe(false);
  });

  test('returns false when grid.cells is not an array', () => {
    expect(exerciseResultService.isValidExerciseState({ ...validState, grid: { size: 4 } })).toBe(false);
  });

  test('returns false when score is not a number', () => {
    expect(exerciseResultService.isValidExerciseState({ ...validState, score: 'bad' })).toBe(false);
  });

  test('returns false when over / won are not booleans', () => {
    expect(exerciseResultService.isValidExerciseState({ ...validState, over: 'yes' })).toBe(false);
    expect(exerciseResultService.isValidExerciseState({ ...validState, won: 1 })).toBe(false);
  });
});

// evaluatePassConditions removed (BU 2026-06): no more pass/fail, only incomplete|completed.

// ─── startExercise ───────────────────────────────────────────────────────────

describe('startExercise', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates a new result for a fresh session', async () => {
    ExerciseSession.findByPk.mockResolvedValue({ id: 2, status: 'incomplete' });
    ExerciseResult.findOne.mockResolvedValue(null);
    ExerciseAssignment.findByPk.mockResolvedValue({
      levelOverride: false,
      visionLevel: null,
      exerciseConfig: {
        exerciseId: 10,
        visionType: 'far',
        eye: 'left',
        toJSON: () => ({ exerciseId: 10, duration: 5, minScore: 0, minAccuracy: 0 }),
      },
    });
    // Patient has a current far/left exam level → result.level should snapshot it
    Patient.findByPk.mockResolvedValue({
      id: 4,
      examResults: { far: { currentResult: { leftEye: 12, rightEye: 9 } } },
    });
    ExerciseResult.create.mockResolvedValue({ id: 1, status: 'incomplete' });

    const result = await exerciseResultService.startExercise(2, 3, 4, 5, 6);

    expect(result).toEqual({ action: 'new', result: { id: 1, status: 'incomplete' } });
    expect(ExerciseResult.create).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseSessionId: 2, patientId: 4, centerId: 5, createdBy: 6, level: 12 })
    );
  });

  test('resumes a pending result that has saved exercise state', async () => {
    ExerciseSession.findByPk.mockResolvedValue({ id: 2, status: 'incomplete' });
    const pending = { id: 11, status: 'incomplete', exerciseState: { board: [[2]] } };
    ExerciseResult.findOne.mockResolvedValue(pending);

    const result = await exerciseResultService.startExercise(2, 3, 4, 5, 6);

    expect(result).toEqual({ action: 'resume', result: pending });
  });

  test('continues a pending result that has no saved state', async () => {
    ExerciseSession.findByPk.mockResolvedValue({ id: 2, status: 'incomplete' });
    const pending = { id: 12, status: 'incomplete', exerciseState: null };
    ExerciseResult.findOne.mockResolvedValue(pending);

    const result = await exerciseResultService.startExercise(2, 3, 4, 5, 6);

    expect(result).toEqual({ action: 'continue', result: pending });
  });

  test('does not resume a result that was ended early via completeExercise', async () => {
    ExerciseSession.findByPk.mockResolvedValue({ id: 2, status: 'incomplete' });
    // First query: no in-progress pending; second would be create path
    ExerciseResult.findOne.mockResolvedValue(null);
    ExerciseAssignment.findByPk.mockResolvedValue({
      levelOverride: false,
      visionLevel: null,
      exerciseConfig: {
        exerciseId: 10,
        visionType: 'far',
        eye: 'left',
        toJSON: () => ({ exerciseId: 10, duration: 5, minScore: 0, minAccuracy: 0 }),
      },
    });
    Patient.findByPk.mockResolvedValue({ id: 4, examResults: {} });
    ExerciseResult.create.mockResolvedValue({ id: 99, status: 'incomplete' });

    const result = await exerciseResultService.startExercise(2, 3, 4, 5, 6);

    expect(ExerciseResult.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          completedAt: expect.anything(),
        }),
      })
    );
    expect(result.action).toBe('new');
    expect(result.result.id).toBe(99);
  });

  test('blocks start when session is already completed', async () => {
    ExerciseSession.findByPk.mockResolvedValue({ id: 2, status: 'completed' });

    const result = await exerciseResultService.startExercise(2, 3, 4, 5, 6);

    expect(result).toEqual({ action: 'blocked', reason: 'session_completed_not_playable' });
    expect(ExerciseResult.findOne).not.toHaveBeenCalled();
    expect(ExerciseResult.create).not.toHaveBeenCalled();
  });
});

// ─── pauseExercise ───────────────────────────────────────────────────────────

describe('pauseExercise', () => {
  beforeEach(() => jest.clearAllMocks());

  test('saves game state and metrics, increments pauseCount from 0 to 1', async () => {
    const result = makeResult({ pauseCount: 0 });
    ExerciseResult.findOne.mockResolvedValue(result);

    await exerciseResultService.pauseExercise(1, { exerciseState: null, score: 200, duration: 120 });

    expect(result.update).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 200,
        duration: 120,
        pauseCount: 1,
      })
    );
  });

  test('increments pauseCount from existing value (2 → 3)', async () => {
    const result = makeResult({ pauseCount: 2 });
    ExerciseResult.findOne.mockResolvedValue(result);

    await exerciseResultService.pauseExercise(1, { score: 500, duration: 60 });

    expect(result.update).toHaveBeenCalledWith(expect.objectContaining({ pauseCount: 3 }));
  });

  test('treats null pauseCount as 0 (null → 1)', async () => {
    const result = makeResult({ pauseCount: null });
    ExerciseResult.findOne.mockResolvedValue(result);

    await exerciseResultService.pauseExercise(1, { score: 0, duration: 30 });

    expect(result.update).toHaveBeenCalledWith(expect.objectContaining({ pauseCount: 1 }));
  });

  test('allows pause when duration equals configured limit (patient must exit)', async () => {
    const result = makeResult({
      exerciseConfig: { duration: 2 },
      pauseCount: 0,
    });
    ExerciseResult.findOne.mockResolvedValue(result);

    await exerciseResultService.pauseExercise(1, {
      exerciseState: {
        currentWorld: 'crowding',
        stageIndex: 0,
        staircaseState: { trials: [] },
      },
      score: 100,
      duration: 125,
    });

    expect(result.update).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 120,
        pauseCount: 1,
      })
    );
  });

  test('detects VT Quest exerciseState without exerciseType in config snapshot', async () => {
    const result = makeResult({ exerciseConfig: { duration: 5 } });
    ExerciseResult.findOne.mockResolvedValue(result);

    const vtState = {
      currentWorld: 'crowding',
      stageIndex: 0,
      staircaseState: { value: 0.4 },
    };

    await exerciseResultService.pauseExercise(1, {
      exerciseState: vtState,
      score: 0,
      duration: 30,
    });

    expect(result.update).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseState: vtState })
    );
  });

  test('nullifies invalid exerciseState and still pauses', async () => {
    const result = makeResult();
    ExerciseResult.findOne.mockResolvedValue(result);

    await exerciseResultService.pauseExercise(1, {
      exerciseState: { invalid: true }, // missing grid, score, etc.
      score: 100,
      duration: 60,
    });

    expect(result.update).toHaveBeenCalledWith(expect.objectContaining({ exerciseState: null }));
  });

  test('rejects pause when result is already passed', async () => {
    ExerciseResult.findOne.mockResolvedValue(makeResult({ status: 'completed' }));

    await expect(exerciseResultService.pauseExercise(1, { score: 200 }, 4)).rejects.toThrow(
      'Chỉ có thể tạm dừng bài tập đang thực hiện'
    );
  });

  test('rejects pause when patientId does not match', async () => {
    ExerciseResult.findOne.mockResolvedValue(makeResult({ patientId: 99 }));

    await expect(
      exerciseResultService.pauseExercise(1, { score: 200 }, 4) // patientId 4 ≠ 99
    ).rejects.toThrow('Không có quyền');
  });

  test('throws NOT_FOUND when result does not exist', async () => {
    ExerciseResult.findOne.mockResolvedValue(null);

    await expect(exerciseResultService.pauseExercise(999, { score: 0 })).rejects.toThrow('Kết quả bài tập không tồn tại');
  });
});

// ─── trackInactivity ─────────────────────────────────────────────────────────

describe('trackInactivity', () => {
  beforeEach(() => jest.clearAllMocks());

  test('increments inactivityCount on the active result', async () => {
    ExerciseResult.findOne.mockResolvedValue(makeResult({ patientId: 4 }));

    await exerciseResultService.trackInactivity(1, 4);

    expect(ExerciseResult.increment).toHaveBeenCalledWith('inactivityCount', { by: 1, where: { id: 1 } });
  });

  test('throws FORBIDDEN when patientId does not match result owner', async () => {
    ExerciseResult.findOne.mockResolvedValue(makeResult({ patientId: 99 }));

    await expect(exerciseResultService.trackInactivity(1, 4)).rejects.toThrow('Không có quyền');
    expect(ExerciseResult.increment).not.toHaveBeenCalled();
  });

  test('throws BAD_REQUEST when result is not incomplete (already passed)', async () => {
    ExerciseResult.findOne.mockResolvedValue(makeResult({ status: 'completed', patientId: 4 }));

    await expect(exerciseResultService.trackInactivity(1, 4)).rejects.toThrow('Bài tập không còn đang thực hiện');
    expect(ExerciseResult.increment).not.toHaveBeenCalled();
  });

  test('throws NOT_FOUND when result does not exist', async () => {
    ExerciseResult.findOne.mockResolvedValue(null);

    await expect(exerciseResultService.trackInactivity(999, 4)).rejects.toThrow('Kết quả bài tập không tồn tại');
  });
});

// ─── completeExercise ────────────────────────────────────────────────────────

describe('completeExercise', () => {
  beforeEach(() => jest.clearAllMocks());

  test('marks result completed regardless of score (no pass/fail)', async () => {
    const result = makeResult({ exerciseConfig: { duration: 5 } });
    ExerciseResult.findOne.mockResolvedValue(result);
    ExerciseResult.findAll.mockResolvedValue([
      { status: 'completed', score: 600, duration: 300, pauseCount: 0, inactivityCount: 0 },
    ]);
    ExerciseSession.findByPk.mockResolvedValue(makeSession());

    const completed = await exerciseResultService.completeExercise(1, { score: 600, duration: 300 });

    expect(completed.status).toBe('completed');
  });

  test('ending before 80% time keeps status incomplete but saves duration', async () => {
    const result = makeResult({
      exerciseConfig: { duration: 5 },
      exerciseState: { currentWorld: 'gabor', stageIndex: 1, staircaseState: {} },
    });
    ExerciseResult.findOne.mockResolvedValue(result);
    ExerciseResult.findAll.mockResolvedValue([
      { status: 'incomplete', score: 200, duration: 120, pauseCount: 0, inactivityCount: 0 },
    ]);
    ExerciseSession.findByPk.mockResolvedValue(makeSession());

    const ended = await exerciseResultService.completeExercise(1, { score: 200, duration: 120 });

    expect(ended.status).toBe('incomplete');
    expect(ended.duration).toBe(120);
    expect(result.update).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseState: null, completedAt: expect.any(Date) })
    );
  });

  test('ending at or after 80% time marks result completed', async () => {
    const result = makeResult({ exerciseConfig: { duration: 5 } });
    ExerciseResult.findOne.mockResolvedValue(result);
    ExerciseResult.findAll.mockResolvedValue([
      { status: 'completed', score: 600, duration: 300, pauseCount: 0, inactivityCount: 0 },
    ]);
    ExerciseSession.findByPk.mockResolvedValue(makeSession());

    const completed = await exerciseResultService.completeExercise(1, { score: 600, duration: 300 });

    expect(completed.status).toBe('completed');
  });

  test('focusScore computed from result DB values — not from frontend', async () => {
    // Result already has pauseCount=3, inactivityCount=2 from prior API calls
    const result = makeResult({ pauseCount: 3, inactivityCount: 2 });
    ExerciseResult.findOne.mockResolvedValue(result);
    ExerciseResult.findAll.mockResolvedValue([
      { status: 'completed', score: 100, duration: 300, pauseCount: 3, inactivityCount: 2 },
    ]);
    ExerciseSession.findByPk.mockResolvedValue(makeSession());

    await exerciseResultService.completeExercise(1, {
      score: 100,
      duration: 300,
      // frontend does NOT send pauseCount/inactivityCount/focusScore anymore
    });

    // focusScore = max(0, 100 - 3 - 2) = 95
    expect(result.update).toHaveBeenCalledWith(expect.objectContaining({ focusScore: 95 }));
  });

  test('focusScore is 100 when patient never paused or went inactive', async () => {
    const result = makeResult({ pauseCount: 0, inactivityCount: 0 });
    ExerciseResult.findOne.mockResolvedValue(result);
    ExerciseResult.findAll.mockResolvedValue([
      { status: 'completed', score: 500, duration: 300, pauseCount: 0, inactivityCount: 0 },
    ]);
    ExerciseSession.findByPk.mockResolvedValue(makeSession());

    await exerciseResultService.completeExercise(1, { score: 500, duration: 300 });

    expect(result.update).toHaveBeenCalledWith(expect.objectContaining({ focusScore: 100 }));
  });

  test('focusScore never goes below 0 (floor at 0)', async () => {
    // 200 pauses + inactivity events — still clamps at 0
    const result = makeResult({ pauseCount: 150, inactivityCount: 100 });
    ExerciseResult.findOne.mockResolvedValue(result);
    ExerciseResult.findAll.mockResolvedValue([
      { status: 'completed', score: 1, duration: 60, pauseCount: 150, inactivityCount: 100 },
    ]);
    ExerciseSession.findByPk.mockResolvedValue(makeSession());

    await exerciseResultService.completeExercise(1, { score: 1, duration: 60 });

    expect(result.update).toHaveBeenCalledWith(expect.objectContaining({ focusScore: 0 }));
  });

  test('inactivityCount is raised on complete when no moves and duration exceeds threshold', async () => {
    const result = makeResult({
      pauseCount: 0,
      inactivityCount: 0,
      exerciseConfig: { duration: 1, inactivityThreshold: 30, minScore: 0, minAccuracy: 0 },
    });
    ExerciseResult.findOne.mockResolvedValue(result);
    ExerciseResult.findAll.mockResolvedValue([
      { status: 'completed', score: 0, duration: 60, pauseCount: 0, inactivityCount: 2, movesCount: 0 },
    ]);
    ExerciseSession.findByPk.mockResolvedValue(makeSession());

    await exerciseResultService.completeExercise(1, { score: 0, duration: 60, movesCount: 0 });

    expect(result.update).toHaveBeenCalledWith(
      expect.objectContaining({
        inactivityCount: 2,
        focusScore: 98,
      })
    );
  });

  test('pauseCount is NOT overwritten in result.update (inactivity may be reconciled)', async () => {
    const result = makeResult({ pauseCount: 5, inactivityCount: 3 });
    ExerciseResult.findOne.mockResolvedValue(result);
    ExerciseResult.findAll.mockResolvedValue([
      { status: 'completed', score: 200, duration: 90, pauseCount: 5, inactivityCount: 3 },
    ]);
    ExerciseSession.findByPk.mockResolvedValue(makeSession());

    await exerciseResultService.completeExercise(1, { score: 200, duration: 90, movesCount: 10 });

    const updateCall = result.update.mock.calls[0][0];
    expect(updateCall).not.toHaveProperty('pauseCount');
    expect(updateCall.inactivityCount).toBe(3);
  });

  test('throws NOT_FOUND when result does not exist', async () => {
    ExerciseResult.findOne.mockResolvedValue(null);

    await expect(exerciseResultService.completeExercise(999, { score: 100, duration: 60 })).rejects.toThrow(
      'Kết quả bài tập không tồn tại'
    );
  });

  test('throws BAD_REQUEST when result is already completed', async () => {
    ExerciseResult.findOne.mockResolvedValue(makeResult({ status: 'completed' }));

    await expect(exerciseResultService.completeExercise(1, { score: 100, duration: 60 })).rejects.toThrow(
      'Bài tập đã được hoàn thành trước đó'
    );
  });

  test('throws FORBIDDEN when patientId does not match', async () => {
    ExerciseResult.findOne.mockResolvedValue(makeResult({ patientId: 99 }));

    await expect(exerciseResultService.completeExercise(1, { score: 100, duration: 60 }, 4)).rejects.toThrow(
      'Không có quyền'
    );
  });

  test('pressing End before 80% time saves progress but stays incomplete', async () => {
    const result = makeResult({ exerciseConfig: { duration: 5 } });
    ExerciseResult.findOne.mockResolvedValue(result);
    ExerciseResult.findAll.mockResolvedValue([
      { status: 'incomplete', score: 500, duration: 60, pauseCount: 0, inactivityCount: 0 },
    ]);
    ExerciseSession.findByPk.mockResolvedValue(makeSession());

    const ended = await exerciseResultService.completeExercise(2, { score: 500, duration: 60 });

    expect(ended.status).toBe('incomplete');
    expect(ended.duration).toBe(60);
  });

  test('session marked completed once executionCount completed executions reached', async () => {
    const result = makeResult({ exerciseConfig: { duration: 5 } });
    ExerciseResult.findOne.mockResolvedValue(result);
    ExerciseResult.findAll.mockResolvedValue([
      { status: 'completed', score: 500, duration: 300, pauseCount: 0, inactivityCount: 0 },
    ]);
    const session = makeSession();
    ExerciseSession.findByPk.mockResolvedValue(session);

    const completed = await exerciseResultService.completeExercise(2, { score: 500, duration: 300 });

    expect(completed.status).toBe('completed');
    expect(session.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(recordSessionCompletion).toHaveBeenCalled();
  });
});

// ─── resolveAssignmentDifficultyLevel ────────────────────────────────────────

describe('resolveAssignmentDifficultyLevel', () => {
  const cfg = (overrides = {}) => ({ visionType: 'far', eye: 'left', ...overrides });

  test('doctor override takes precedence over exam level', () => {
    const a = { levelOverride: true, visionLevel: 7, exerciseConfig: cfg() };
    const p = { examResults: { far: { currentResult: { leftEye: 12 } } } };
    expect(exerciseResultService.resolveAssignmentDifficultyLevel(a, p)).toBe(7);
  });

  test('far/left → currentResult.leftEye', () => {
    const a = { levelOverride: false, visionLevel: null, exerciseConfig: cfg({ visionType: 'far', eye: 'left' }) };
    const p = { examResults: { far: { currentResult: { leftEye: 12, rightEye: 9 } } } };
    expect(exerciseResultService.resolveAssignmentDifficultyLevel(a, p)).toBe(12);
  });

  test('near/right → currentResult.rightEye', () => {
    const a = { levelOverride: false, exerciseConfig: cfg({ visionType: 'near', eye: 'right' }) };
    const p = { examResults: { near: { currentResult: { leftEye: 3, rightEye: 5 } } } };
    expect(exerciseResultService.resolveAssignmentDifficultyLevel(a, p)).toBe(5);
  });

  // ── eye='both' rule (2026-06): far/near/contrast → MẮT KÉM HƠN = min(left,right);
  //    stereopsis → bothEye. Phải khớp FE visionUtils.resolveExerciseVisionLevel. ──
  test('far/both → min(left,right) = mắt kém hơn', () => {
    const a = { levelOverride: false, exerciseConfig: cfg({ visionType: 'far', eye: 'both' }) };
    const p = { examResults: { far: { currentResult: { leftEye: 8, rightEye: 12 } } } };
    expect(exerciseResultService.resolveAssignmentDifficultyLevel(a, p)).toBe(8);
  });

  test('contrast/both → min(left,right)', () => {
    const a = { levelOverride: false, exerciseConfig: cfg({ visionType: 'contrast', eye: 'both' }) };
    const p = { examResults: { contrast: { currentResult: { leftEye: 6, rightEye: 14 } } } };
    expect(exerciseResultService.resolveAssignmentDifficultyLevel(a, p)).toBe(6);
  });

  test('near/both → thiếu 1 mắt thì lấy mắt còn lại', () => {
    const a = { levelOverride: false, exerciseConfig: cfg({ visionType: 'near', eye: 'both' }) };
    const p = { examResults: { near: { currentResult: { leftEye: null, rightEye: 5 } } } };
    expect(exerciseResultService.resolveAssignmentDifficultyLevel(a, p)).toBe(5);
  });

  test('far/both → level 0 coi như thiếu, loại khỏi min', () => {
    const a = { levelOverride: false, exerciseConfig: cfg({ visionType: 'far', eye: 'both' }) };
    const p = { examResults: { far: { currentResult: { leftEye: 0, rightEye: 11 } } } };
    expect(exerciseResultService.resolveAssignmentDifficultyLevel(a, p)).toBe(11);
  });

  test('far/both → cả hai mắt thiếu → null (không có fallback ở tầng record)', () => {
    const a = { levelOverride: false, exerciseConfig: cfg({ visionType: 'far', eye: 'both' }) };
    const p = { examResults: { far: { currentResult: { leftEye: null, rightEye: null } } } };
    expect(exerciseResultService.resolveAssignmentDifficultyLevel(a, p)).toBeNull();
  });

  test('stereopsis/both → currentResult.bothEye (giữ nguyên)', () => {
    const a = { levelOverride: false, exerciseConfig: cfg({ visionType: 'stereopsis', eye: 'both' }) };
    const p = { examResults: { stereopsis: { currentResult: { bothEye: 8 } } } };
    expect(exerciseResultService.resolveAssignmentDifficultyLevel(a, p)).toBe(8);
  });

  test('returns null when no exam result and no override', () => {
    const a = { levelOverride: false, exerciseConfig: cfg() };
    expect(exerciseResultService.resolveAssignmentDifficultyLevel(a, { examResults: {} })).toBeNull();
  });

  test('returns null when assignment has no config', () => {
    expect(exerciseResultService.resolveAssignmentDifficultyLevel({}, {})).toBeNull();
  });
});

// ─── updateSessionStats ──────────────────────────────────────────────────────

describe('updateSessionStats (via completeExercise)', () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * Drive updateSessionStats indirectly through completeExercise
   * to test session-level aggregation.
   */
  const driveStats = async ({ results, sessionOverrides = {} } = {}) => {
    // The last result in the array is the one being completed right now.
    // findOne must return it as 'incomplete' — completeExercise validates this.
    // findAll returns the final statuses (post-completion) for session aggregation.
    const triggerResult = results[results.length - 1];
    ExerciseResult.findOne.mockResolvedValue(
      makeResult({
        ...triggerResult,
        status: 'incomplete', // must be incomplete so completeExercise accepts it
        exerciseSessionId: 20,
        update: jest.fn().mockImplementation(async function (v) {
          Object.assign(this, v);
        }),
      })
    );
    ExerciseResult.findAll.mockResolvedValue(results);
    const session = makeSession(sessionOverrides);
    ExerciseSession.findByPk.mockResolvedValue(session);

    await exerciseResultService.completeExercise(1, {
      score: triggerResult.score || 0,
      duration: triggerResult.duration || 0,
    });
    return session;
  };

  test('session.duration equals sum of all ended result durations', async () => {
    const session = await driveStats({
      results: [
        { status: 'completed', score: 100, duration: 240, pauseCount: 0, inactivityCount: 0 },
        { status: 'completed', score: 200, duration: 300, pauseCount: 0, inactivityCount: 0 },
        { status: 'incomplete', score: 50, duration: 120, pauseCount: 0, inactivityCount: 0 },
      ],
      sessionOverrides: {
        exerciseAssignment: { exerciseConfig: { executionCount: 2, duration: 5 } },
      },
    });

    // 240 + 300 + 120 = 660 (all ended lượt, kể cả <80%)
    expect(session.update).toHaveBeenCalledWith(expect.objectContaining({ duration: 660 }));
  });

  test('session.duration is 0 when all results have zero duration', async () => {
    const session = await driveStats({
      results: [{ status: 'completed', score: 100, duration: 0, pauseCount: 0, inactivityCount: 0 }],
    });

    expect(session.update).toHaveBeenCalledWith(expect.objectContaining({ duration: 0 }));
  });

  test('session focusScore averages per-lượt focus across ended lượt in the session', async () => {
    const session = await driveStats({
      results: [
        { status: 'completed', score: 300, duration: 300, pauseCount: 1, inactivityCount: 0 },
        { status: 'completed', score: 400, duration: 300, pauseCount: 0, inactivityCount: 2 },
      ],
      sessionOverrides: {
        exerciseAssignment: { exerciseConfig: { executionCount: 2, duration: 5 } },
      },
    });

    expect(session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        pauseCount: 1,
        inactivityCount: 2,
        focusScore: 99,
      })
    );
  });

  test('session.visionLevel snapshots the difficulty level from results', async () => {
    const session = await driveStats({
      results: [
        { status: 'completed', score: 100, duration: 300, level: 12, pauseCount: 0, inactivityCount: 0 },
        { status: 'completed', score: 200, duration: 300, level: 12, pauseCount: 0, inactivityCount: 0 },
      ],
      sessionOverrides: { exerciseAssignment: { exerciseConfig: { executionCount: 2, duration: 5 } } },
    });

    expect(session.update).toHaveBeenCalledWith(expect.objectContaining({ visionLevel: 12 }));
  });

  test('session.visionLevel is null when no result carries a level', async () => {
    const session = await driveStats({
      results: [{ status: 'completed', score: 100, duration: 300, pauseCount: 0, inactivityCount: 0 }],
    });

    expect(session.update).toHaveBeenCalledWith(expect.objectContaining({ visionLevel: null }));
  });

  test('focusScore clamped to 0 when pauses + inactivity exceed 100', async () => {
    const session = await driveStats({
      results: [{ status: 'completed', score: 1, duration: 300, pauseCount: 80, inactivityCount: 50 }],
    });

    expect(session.update).toHaveBeenCalledWith(expect.objectContaining({ focusScore: 0 }));
  });

  test('session marked completed when enough lượt reach ≥80% time', async () => {
    const session = await driveStats({
      results: [
        { status: 'completed', score: 100, duration: 300, pauseCount: 0, inactivityCount: 0 },
        { status: 'completed', score: 200, duration: 300, pauseCount: 0, inactivityCount: 0 },
      ],
      sessionOverrides: {
        exerciseAssignment: { exerciseConfig: { executionCount: 2, duration: 5 } },
      },
    });

    expect(session.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(recordSessionCompletion).toHaveBeenCalled();
  });

  test('counts validExecutions from result.exerciseConfig when session.executionDuration is stale/longer', async () => {
    // Patient played a 10-min config (600s). Session snapshot still says 30 min —
    // using session duration alone would treat 600/1800 as 33% and keep 0/2.
    const session = await driveStats({
      results: [
        {
          status: 'completed',
          score: 100,
          duration: 600,
          pauseCount: 0,
          inactivityCount: 0,
          exerciseConfig: { duration: 10 },
        },
      ],
      sessionOverrides: {
        executionDuration: 30,
        executionCount: 2,
        exerciseAssignment: { exerciseConfig: { executionCount: 2, duration: 10 } },
      },
    });

    expect(session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        validExecutions: 1,
        executionsCompleted: 1,
        status: 'incomplete',
      })
    );
  });

  test('session stays incomplete when fully-complete lượt < executionCount', async () => {
    const session = await driveStats({
      results: [
        { status: 'completed', score: 100, duration: 300, pauseCount: 0, inactivityCount: 0 },
        { status: 'incomplete', score: 50, duration: 120, pauseCount: 0, inactivityCount: 0 },
      ],
      sessionOverrides: {
        exerciseAssignment: { exerciseConfig: { executionCount: 3, duration: 5 } },
      },
    });

    expect(session.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'incomplete' }));
    expect(recordSessionCompletion).not.toHaveBeenCalled();
  });

  test('recordSessionCompletion is NOT called if session was already completed (no double-fire)', async () => {
    const session = await driveStats({
      results: [{ status: 'completed', score: 300, duration: 300, pauseCount: 0, inactivityCount: 0 }],
      sessionOverrides: {
        status: 'completed', // already completed before this call
      },
    });

    expect(session.update).toHaveBeenCalled();
    // previousStatus === 'completed' → skip recordSessionCompletion
    expect(recordSessionCompletion).not.toHaveBeenCalled();
  });

  test('aggregates ended lượt only; in-flight without duration excluded', async () => {
    const session = await driveStats({
      results: [
        { status: 'completed', score: 200, duration: 300, pauseCount: 1, inactivityCount: 1 },
        { status: 'incomplete', score: 0, duration: 0, pauseCount: 5, inactivityCount: 5 },
      ],
      sessionOverrides: {
        exerciseAssignment: { exerciseConfig: { executionCount: 1, duration: 5 } },
      },
    });

    expect(session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 300,
        pauseCount: 1,
        inactivityCount: 1,
        focusScore: 98,
      })
    );
  });
});
