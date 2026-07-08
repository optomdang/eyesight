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
}));

jest.mock('../../../src/models/exercise/exerciseConfig.model', () => ({}));

const { ExerciseResult, ExerciseAssignment, Patient } = require('../../../src/models');
const ExerciseSession = require('../../../src/models/exercise/exerciseSession.model');
const { recordSessionCompletion } = require('../../../src/services/exercise/exerciseSessionCompletion.service');
const exerciseResultService = require('../../../src/services/exercise/exerciseResult.service');

describe('Exercise Result Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startExercise', () => {
    test('should create a new result when no incomplete result exists', async () => {
      ExerciseSession.findByPk.mockResolvedValue({ id: 2, status: 'incomplete' });
      ExerciseResult.findOne.mockResolvedValue(null);
      ExerciseAssignment.findByPk.mockResolvedValue({
        exerciseConfig: {
          exerciseId: 10,
          toJSON: () => ({ exerciseId: 10, duration: 5, minScore: 0, minAccuracy: 0 }),
        },
      });
      ExerciseResult.create.mockResolvedValue({ id: 1, status: 'incomplete' });
      // startExercise resolves difficulty level server-side via Patient.findByPk
      Patient.findByPk.mockResolvedValue({ id: 4, examResults: {} });

      const result = await exerciseResultService.startExercise(2, 3, 4, 5, 6);

      expect(result).toEqual({ action: 'new', result: { id: 1, status: 'incomplete' } });
      expect(ExerciseResult.create).toHaveBeenCalledWith(
        expect.objectContaining({
          exerciseSessionId: 2,
          exerciseAssignmentId: 3,
          patientId: 4,
          exerciseId: 10,
          centerId: 5,
          createdBy: 6,
          updatedBy: 6,
        })
      );
    });

    test('should resume an incomplete result with saved state', async () => {
      const existing = { id: 11, status: 'incomplete', exerciseState: { board: [[2]] } };
      ExerciseSession.findByPk.mockResolvedValue({ id: 2, status: 'incomplete' });
      ExerciseResult.findOne.mockResolvedValue(existing);

      const result = await exerciseResultService.startExercise(2, 3, 4, 5, 6);

      expect(result).toEqual({ action: 'resume', result: existing });
    });
  });

  describe('pauseExercise', () => {
    test('should update an incomplete result with paused state', async () => {
      const validState = { grid: { size: 4, cells: [] }, score: 200, over: false, won: false };
      const resultRecord = {
        id: 1,
        patientId: 4,
        status: 'incomplete',
        update: jest.fn().mockResolvedValue(undefined),
      };
      ExerciseResult.findOne.mockResolvedValue(resultRecord);

      const updated = await exerciseResultService.pauseExercise(1, {
        exerciseState: validState,
        score: 200,
        duration: 120,
      });

      expect(updated).toBe(resultRecord);
      expect(resultRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          exerciseState: validState,
          score: 200,
          duration: 120,
        })
      );
    });

    test('should reject pause for completed results', async () => {
      ExerciseResult.findOne.mockResolvedValue({ id: 1, patientId: 4, status: 'completed' });

      await expect(exerciseResultService.pauseExercise(1, { score: 200 }, 4)).rejects.toThrow(
        'Chỉ có thể tạm dừng bài tập đang thực hiện'
      );
    });
  });

  describe('completeExercise', () => {
    test('should mark result passed and update session stats', async () => {
      const resultRecord = {
        id: 1,
        patientId: 4,
        status: 'incomplete',
        exerciseConfig: { duration: 5, minScore: 0, minAccuracy: 0 },
        exerciseSessionId: 20,
        update: jest.fn().mockImplementation(async function update(values) {
          Object.assign(this, values);
        }),
      };
      const session = {
        id: 20,
        status: 'incomplete',
        exerciseAssignmentId: 3,
        exerciseAssignment: { exerciseConfig: { executionCount: 1 } },
        update: jest.fn().mockResolvedValue(undefined),
      };
      ExerciseResult.findOne.mockResolvedValue(resultRecord);
      ExerciseResult.findAll.mockResolvedValue([{ status: 'completed', score: 2048 }]);
      ExerciseSession.findByPk.mockResolvedValue(session);

      const completed = await exerciseResultService.completeExercise(1, {
        score: 2048,
        duration: 300,
      });

      expect(completed.status).toBe('completed');
      expect(session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          executionsCompleted: 1,
          validExecutions: 1,
          status: 'completed',
        })
      );
      expect(recordSessionCompletion).toHaveBeenCalledWith(3, expect.objectContaining({ completedAt: expect.any(Date) }));
    });

    test('should throw for missing result', async () => {
      ExerciseResult.findOne.mockResolvedValue(null);

      await expect(exerciseResultService.completeExercise(999, { score: 100, duration: 50 })).rejects.toThrow(
        'Kết quả bài tập không tồn tại'
      );
    });
  });
});
