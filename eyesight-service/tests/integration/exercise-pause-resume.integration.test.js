/**
 * Exercise Pause/Resume Integration Tests
 * Tests the complete pause/resume flow with real database operations
 *
 * Flow tested:
 * 1. Start exercise → create new result
 * 2. Pause exercise → save game state
 * 3. Resume exercise → load saved state
 * 4. Complete exercise → evaluate pass/fail
 * 5. Update session statistics
 */

const { setupTestDB, cleanTables, testDataFactories } = require('../utils/setupTestDB');
const exerciseResultService = require('../../src/services/exercise/exerciseResult.service');
const { Center, User, Patient, Exercise, ExerciseConfig, ExerciseAssignment, ExerciseSession, ExerciseResult } = require('../../src/models');

// Mock dependencies
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../src/services/system/notification.service', () => ({
  sendNotification: jest.fn().mockResolvedValue(true),
}));

jest.setTimeout(60000);

setupTestDB();

describe('Exercise Pause/Resume Integration Tests', () => {
  let center;
  let user;
  let patient;
  let exercise;
  let exerciseConfig;
  let assignment;
  let session;

  beforeEach(async () => {
    // Clean all tables
    await cleanTables([
      'ExerciseResults',
      'ExerciseSessions',
      'ExerciseAssignments',
      'ExerciseConfigs',
      'Exercises',
      'Patients',
      'Users',
      'Centers',
    ]);

    const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // Create test data
    center = await Center.create(testDataFactories.createCenterData({ code: `TC_${unique}` }));

    user = await User.create(
      testDataFactories.createUserData(center.id, {
        email: `test_${unique}@test.com`,
      })
    );

    patient = await Patient.create(
      testDataFactories.createPatientData(user.id, center.id, {
        code: `P_${unique}`,
      })
    );

    exercise = await Exercise.create(
      testDataFactories.createExerciseData(center.id, {
        code: `EX_${unique}`,
      })
    );

    exerciseConfig = await ExerciseConfig.create(
      testDataFactories.createExerciseConfigData(exercise.id, center.id, {
        frequency: 'daily',
        duration: 5, // 5 minutes
        executionCount: 3,
      })
    );

    assignment = await ExerciseAssignment.create(
      testDataFactories.createExerciseAssignmentData(patient.id, exerciseConfig.id, center.id)
    );

    session = await ExerciseSession.create({
      code: `SS_${unique}`,
      exerciseAssignmentId: assignment.id,
      patientId: patient.id,
      startedAt: new Date(),
      status: 'incomplete',
      centerId: center.id,
    });
  });

  describe('Complete Pause/Resume Flow', () => {
    it('should handle start → pause → resume → complete cycle', async () => {
      // ===== STEP 1: Start Exercise =====
      const startResult = await exerciseResultService.startExercise(
        session.id,
        assignment.id,
        patient.id,
        center.id,
        user.id
      );

      expect(startResult.action).toBe('new');
      expect(startResult.result.status).toBe('incomplete');
      expect(startResult.result.exerciseState).toBeNull();
      expect(startResult.result.score).toBeNull();
      expect(startResult.result.duration).toBeNull();

      const resultId = startResult.result.id;

      // ===== STEP 2: Pause Exercise (save game state) =====
      // Valid exerciseState = GameManager.serialize(): { grid:{size,cells}, score, over, won }
      const gameStatePause = {
        grid: {
          size: 4,
          cells: [
            [2, 4, 8, 0],
            [0, 16, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
        },
        score: 200,
        over: false,
        won: false,
      };

      const pausedResult = await exerciseResultService.pauseExercise(resultId, {
        exerciseState: gameStatePause,
        score: 200,
        duration: 180, // 3 minutes
        movesCount: 15,
        accuracy: 0.8,
      });

      expect(pausedResult.status).toBe('incomplete');
      expect(pausedResult.exerciseState).toEqual(gameStatePause);
      expect(pausedResult.score).toBe(200);
      expect(pausedResult.duration).toBe(180);
      expect(pausedResult.movesCount).toBe(15);
      expect(pausedResult.accuracy).toBe(0.8);

      // ===== STEP 3: Resume Exercise (load saved state) =====
      const resumeResult = await exerciseResultService.startExercise(
        session.id,
        assignment.id,
        patient.id,
        center.id,
        user.id
      );

      expect(resumeResult.action).toBe('resume');
      expect(resumeResult.result.id).toBe(resultId);
      expect(resumeResult.result.exerciseState).toEqual(gameStatePause);
      expect(resumeResult.result.score).toBe(200);
      expect(resumeResult.result.duration).toBe(180);

      // ===== STEP 4: Update progress (pause again with new state) =====
      const gameStateContinue = {
        grid: {
          size: 4,
          cells: [
            [2, 4, 8, 16],
            [32, 64, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
        },
        score: 1000,
        over: false,
        won: false,
      };

      const updatedResult = await exerciseResultService.pauseExercise(resultId, {
        exerciseState: gameStateContinue,
        score: 1000,
        duration: 240, // 4 minutes, still within allowed duration
        movesCount: 30,
        accuracy: 0.85,
      });

      expect(updatedResult.exerciseState).toEqual(gameStateContinue);
      expect(updatedResult.score).toBe(1000);
      expect(updatedResult.duration).toBe(240);

      // ===== STEP 5: Complete Exercise =====
      // Submit 500s although the assigned time is 5min × 60 = 300s.
      const completedResult = await exerciseResultService.completeExercise(resultId, {
        score: 2048,
        duration: 500,
        movesCount: 50,
        accuracy: 0.9,
        completedAt: new Date(),
      });

      expect(completedResult.status).toBe('completed');
      expect(completedResult.score).toBe(2048);
      // #21-clamp: actual time is capped at the assigned time (config.duration 5min × 60 = 300s).
      expect(completedResult.duration).toBe(300);
      expect(completedResult.movesCount).toBe(50);
      expect(completedResult.accuracy).toBe(0.9);
      expect(completedResult.exerciseState).toBeNull(); // Cleared on completion
      expect(completedResult.completedAt).toBeDefined();

      // ===== STEP 6: Verify session statistics updated =====
      const updatedSession = await ExerciseSession.findByPk(session.id);
      expect(updatedSession.executionsCompleted).toBe(1);
      expect(Number(updatedSession.totalScore)).toBe(2048);
      expect(Number(updatedSession.averageScore)).toBe(2048);
      expect(updatedSession.bestScore).toBe(2048);
    });

    it('should handle multiple pause/resume cycles', async () => {
      // Start
      const startResult = await exerciseResultService.startExercise(
        session.id,
        assignment.id,
        patient.id,
        center.id,
        user.id
      );

      const resultId = startResult.result.id;

      // Pause #1
      await exerciseResultService.pauseExercise(resultId, {
        exerciseState: { grid: { size: 4, cells: [[2]] }, score: 50, over: false, won: false },
        score: 50,
        duration: 60,
      });

      // Resume #1
      const resume1 = await exerciseResultService.startExercise(session.id, assignment.id, patient.id, center.id, user.id);
      expect(resume1.action).toBe('resume');
      expect(resume1.result.score).toBe(50);

      // Pause #2
      await exerciseResultService.pauseExercise(resultId, {
        exerciseState: { grid: { size: 4, cells: [[4, 8]] }, score: 150, over: false, won: false },
        score: 150,
        duration: 120,
      });

      // Resume #2
      const resume2 = await exerciseResultService.startExercise(session.id, assignment.id, patient.id, center.id, user.id);
      expect(resume2.action).toBe('resume');
      expect(resume2.result.score).toBe(150);

      // Pause #3
      await exerciseResultService.pauseExercise(resultId, {
        exerciseState: { grid: { size: 4, cells: [[16, 32]] }, score: 500, over: false, won: false },
        score: 500,
        duration: 240,
      });

      // Complete
      const completed = await exerciseResultService.completeExercise(resultId, {
        score: 1024,
        duration: 350,
        completedAt: new Date(),
      });

      expect(completed.status).toBe('completed');
      expect(completed.score).toBe(1024);
    });

    it('should start a new slot after early stop (complete before 80% time)', async () => {
      const startResult = await exerciseResultService.startExercise(
        session.id,
        assignment.id,
        patient.id,
        center.id,
        user.id
      );

      const resultId = startResult.result.id;

      await exerciseResultService.pauseExercise(resultId, {
        exerciseState: {
          currentWorld: 'vernier',
          stageIndex: 2,
          staircaseState: { currentValue: 80, reversalCount: 1, reversalValues: [], trialCount: 3, stepSize: 10, lastDirection: 1 },
        },
        score: 100,
        duration: 60,
      });

      await exerciseResultService.completeExercise(resultId, {
        score: 200,
        duration: 90,
      });

      const afterStop = await ExerciseResult.findByPk(resultId);
      expect(afterStop.status).toBe('incomplete');
      expect(afterStop.completedAt).not.toBeNull();
      expect(afterStop.exerciseState).toBeNull();

      const nextStart = await exerciseResultService.startExercise(
        session.id,
        assignment.id,
        patient.id,
        center.id,
        user.id
      );

      expect(nextStart.action).toBe('new');
      expect(nextStart.result.id).not.toBe(resultId);
    });

    it('should handle pause without game state (only metrics update)', async () => {
      const startResult = await exerciseResultService.startExercise(
        session.id,
        assignment.id,
        patient.id,
        center.id,
        user.id
      );

      const resultId = startResult.result.id;

      // Pause with only score/duration, no game state
      const pausedResult = await exerciseResultService.pauseExercise(resultId, {
        score: 300,
        duration: 150,
        movesCount: 20,
      });

      expect(pausedResult.status).toBe('incomplete');
      expect(pausedResult.score).toBe(300);
      expect(pausedResult.duration).toBe(150);
      expect(pausedResult.movesCount).toBe(20);
      // exerciseState can be undefined or null
      expect([null, undefined]).toContain(pausedResult.exerciseState);

      // Resume should still work
      const resumeResult = await exerciseResultService.startExercise(
        session.id,
        assignment.id,
        patient.id,
        center.id,
        user.id
      );

      // Should be 'continue' since no saved state
      expect(resumeResult.action).toBe('continue');
      expect(resumeResult.result.score).toBe(300);
    });
  });

  describe('Edge Cases', () => {
    it('should prevent pausing already completed exercise', async () => {
      const startResult = await exerciseResultService.startExercise(
        session.id,
        assignment.id,
        patient.id,
        center.id,
        user.id
      );

      const resultId = startResult.result.id;

      // Complete exercise
      await exerciseResultService.completeExercise(resultId, {
        score: 2048,
        duration: 400,
        completedAt: new Date(),
      });

      // Try to pause completed exercise
      await expect(
        exerciseResultService.pauseExercise(resultId, {
          exerciseState: { board: [[2]] },
          score: 100,
          duration: 60,
        })
      ).rejects.toThrow('Chỉ có thể tạm dừng bài tập đang thực hiện');
    });

    it('should prevent completing non-existent result', async () => {
      await expect(
        exerciseResultService.completeExercise(99999, {
          score: 1000,
          duration: 300,
          completedAt: new Date(),
        })
      ).rejects.toThrow('Kết quả bài tập không tồn tại');
    });

    it('should handle pause with invalid result ID', async () => {
      await expect(
        exerciseResultService.pauseExercise(99999, {
          score: 100,
          duration: 60,
        })
      ).rejects.toThrow('Kết quả bài tập không tồn tại');
    });

    it('should clear exercise state on completion', async () => {
      const startResult = await exerciseResultService.startExercise(
        session.id,
        assignment.id,
        patient.id,
        center.id,
        user.id
      );

      const resultId = startResult.result.id;

      // Pause with game state
      await exerciseResultService.pauseExercise(resultId, {
        exerciseState: {
          grid: { size: 4, cells: [[2, 4, 8, 16]] },
          score: 500,
          over: false,
          won: false,
        },
        score: 500,
        duration: 200,
      });

      // Complete - should clear exerciseState
      const completed = await exerciseResultService.completeExercise(resultId, {
        score: 2048,
        duration: 400,
        completedAt: new Date(),
      });

      expect(completed.exerciseState).toBeNull();
      expect(completed.status).toBe('completed');
    });

    it('should block resume when incomplete result is already timed out', async () => {
      const startResult = await exerciseResultService.startExercise(
        session.id,
        assignment.id,
        patient.id,
        center.id,
        user.id
      );

      const existingTimedOutResult = await startResult.result.update({
        exerciseState: {
          grid: [
            [2, 4],
            [8, 16],
          ],
          score: 300,
        },
        score: 300,
        duration: 301,
        movesCount: 20,
        accuracy: 0.8,
      });

      const blockedResult = await exerciseResultService.startExercise(
        session.id,
        assignment.id,
        patient.id,
        center.id,
        user.id
      );

      expect(blockedResult.action).toBe('blocked');
      expect(blockedResult.reason).toBe('timed_out_not_playable');
      expect(blockedResult.result.id).toBe(existingTimedOutResult.id);
    });
  });

  describe('Session Statistics Updates', () => {
    it('should update session stats after completing first result', async () => {
      const startResult = await exerciseResultService.startExercise(
        session.id,
        assignment.id,
        patient.id,
        center.id,
        user.id
      );

      await exerciseResultService.completeExercise(startResult.result.id, {
        score: 1500,
        duration: 350,
        completedAt: new Date(),
      });

      const updatedSession = await ExerciseSession.findByPk(session.id);
      expect(updatedSession.executionsCompleted).toBe(1);
      expect(Number(updatedSession.totalScore)).toBe(1500);
      expect(Number(updatedSession.averageScore)).toBe(1500);
      expect(updatedSession.bestScore).toBe(1500);
    });

    it('should update session stats after multiple completions', async () => {
      // First result
      const result1 = await exerciseResultService.startExercise(session.id, assignment.id, patient.id, center.id, user.id);

      await exerciseResultService.completeExercise(result1.result.id, {
        score: 1500,
        duration: 350,
        completedAt: new Date(),
      });

      // Update session to allow new result
      await session.update({ status: 'incomplete' });

      // Second result
      const result2 = await exerciseResultService.startExercise(session.id, assignment.id, patient.id, center.id, user.id);

      await exerciseResultService.completeExercise(result2.result.id, {
        score: 2048,
        duration: 400,
        completedAt: new Date(),
      });

      // Update session to allow new result
      await session.update({ status: 'incomplete' });

      // Third result
      const result3 = await exerciseResultService.startExercise(session.id, assignment.id, patient.id, center.id, user.id);

      await exerciseResultService.completeExercise(result3.result.id, {
        score: 1200,
        duration: 320,
        completedAt: new Date(),
      });

      const updatedSession = await ExerciseSession.findByPk(session.id);
      expect(updatedSession.executionsCompleted).toBe(3);
      expect(Number(updatedSession.totalScore)).toBe(4748); // 1500 + 2048 + 1200
      expect(updatedSession.bestScore).toBe(2048);
      // Average should be 1582.67
      expect(Number(updatedSession.averageScore)).toBeCloseTo(1582.67, 1);
    });
  });
});
