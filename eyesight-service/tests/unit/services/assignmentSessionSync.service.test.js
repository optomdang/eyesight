jest.mock('../../../src/models', () => ({
  ExerciseAssignment: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  ExerciseSession: {
    findAll: jest.fn(),
  },
}));

jest.mock('../../../src/services/exercise/exerciseResult.service', () => ({
  updateSessionStats: jest.fn(),
}));

const { ExerciseAssignment, ExerciseSession } = require('../../../src/models');
const { updateSessionStats } = require('../../../src/services/exercise/exerciseResult.service');
const {
  snapshotsDiffer,
  syncAssignmentSessionSnapshots,
  syncSessionSnapshotFromAssignment,
  syncSessionsForExerciseConfig,
} = require('../../../src/services/exercise/assignmentSessionSync.service');

describe('assignmentSessionSync.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('snapshotsDiffer', () => {
    test('detects duration mismatch (30 vs 10)', () => {
      expect(
        snapshotsDiffer({ executionDuration: 30, executionCount: 2 }, 10, 2)
      ).toBe(true);
    });

    test('treats DECIMAL strings as equal', () => {
      expect(
        snapshotsDiffer({ executionDuration: '10.00', executionCount: '2' }, 10, 2)
      ).toBe(false);
    });
  });

  describe('syncSessionSnapshotFromAssignment', () => {
    test('updates incomplete session and recalculates stats', async () => {
      const session = {
        id: 50,
        status: 'incomplete',
        executionDuration: 30,
        executionCount: 2,
        update: jest.fn().mockResolvedValue(),
      };
      const assignment = {
        exerciseConfig: { duration: 10, executionCount: 2 },
      };

      const changed = await syncSessionSnapshotFromAssignment(session, assignment);

      expect(changed).toBe(true);
      expect(session.update).toHaveBeenCalledWith({
        executionDuration: 10,
        executionCount: 2,
      });
      expect(updateSessionStats).toHaveBeenCalledWith(50);
    });

    test('skips completed sessions', async () => {
      const session = {
        id: 50,
        status: 'completed',
        executionDuration: 30,
        executionCount: 2,
        update: jest.fn(),
      };

      const changed = await syncSessionSnapshotFromAssignment(session, {
        exerciseConfig: { duration: 10, executionCount: 2 },
      });

      expect(changed).toBe(false);
      expect(session.update).not.toHaveBeenCalled();
    });
  });

  describe('syncAssignmentSessionSnapshots', () => {
    test('syncs all incomplete sessions for assignment', async () => {
      const assignment = {
        id: 8,
        exerciseConfig: { duration: 10, executionCount: 2 },
      };
      ExerciseAssignment.findByPk.mockResolvedValue(assignment);
      const session = {
        id: 80,
        status: 'incomplete',
        executionDuration: 30,
        executionCount: 2,
        update: jest.fn().mockResolvedValue(),
      };
      ExerciseSession.findAll.mockResolvedValue([session]);

      const result = await syncAssignmentSessionSnapshots(8);

      expect(result).toEqual({ updated: 1 });
      expect(session.update).toHaveBeenCalledWith({
        executionDuration: 10,
        executionCount: 2,
      });
      expect(updateSessionStats).toHaveBeenCalledWith(80);
    });
  });

  describe('syncSessionsForExerciseConfig', () => {
    test('fans out to every active assignment using the config', async () => {
      ExerciseAssignment.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      ExerciseAssignment.findByPk
        .mockResolvedValueOnce({
          id: 1,
          exerciseConfig: { duration: 10, executionCount: 2 },
        })
        .mockResolvedValueOnce({
          id: 2,
          exerciseConfig: { duration: 10, executionCount: 2 },
        });
      ExerciseSession.findAll.mockResolvedValue([]);

      const result = await syncSessionsForExerciseConfig(99);

      expect(result).toEqual({ assignments: 2, sessionsUpdated: 0 });
      expect(ExerciseAssignment.findAll).toHaveBeenCalledWith({
        where: { exerciseConfigId: 99, status: 'active' },
        attributes: ['id'],
      });
    });
  });
});
