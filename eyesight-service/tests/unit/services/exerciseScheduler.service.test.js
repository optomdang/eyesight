jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../../src/services/index', () => ({
  exerciseComplianceService: {
    updateAllComplianceStatuses: jest.fn().mockResolvedValue({ updated: 1, overdue: 0, onTrack: 1, errors: [] }),
    sendComplianceReminders: jest.fn().mockResolvedValue({ sent: 0, skipped: 0, errors: [] }),
    getComplianceSummary: jest.fn(),
    getOverdueAssignments: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../../src/models', () => ({
  ExerciseAssignment: {
    findAll: jest.fn(),
  },
  ExerciseSession: {
    findOrCreate: jest.fn(),
  },
  Patient: {},
}));

jest.mock('../../../src/utils/common', () => ({
  generateCode: jest.fn(() => 'SS_TEST'),
  getCurrentCycleDateRange: jest.fn(() => ({ start: new Date('2026-01-19T00:00:00.000Z') })),
}));

jest.mock('../../../src/utils/promiseUtils', () => ({
  promiseAllInBatches: jest.fn(async (items, mapper) => Promise.all(items.map(mapper))),
}));

jest.mock('../../../src/utils/treatmentUtils', () => ({
  buildInTreatmentWhereClause: jest.fn(() => ({ treatmentStatus: true })),
}));

jest.mock('../../../src/services/system/scheduleHistory.service', () => ({
  executeAndLogJob: jest.fn(async (_name, callback) => callback()),
}));

const cron = require('node-cron');
const logger = require('../../../src/config/logger');
const { ExerciseAssignment, ExerciseSession } = require('../../../src/models');
const { buildInTreatmentWhereClause } = require('../../../src/utils/treatmentUtils');
const exerciseSchedulerService = require('../../../src/services/exercise/exerciseScheduler.service');

describe('Exercise Scheduler Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSessionsForAssignment', () => {
    test('should create daily session correctly', async () => {
      ExerciseSession.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
      const assignment = {
        id: 1,
        patientId: 2,
        centerId: 3,
        assignedBy: 4,
        exerciseConfig: { frequency: 'daily' },
      };

      const result = await exerciseSchedulerService.createSessionsForAssignment(assignment);

      expect(result).toBe(1);
      expect(ExerciseSession.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ exerciseAssignmentId: 1 }),
        })
      );
    });

    test('should skip session creation if already exists', async () => {
      ExerciseSession.findOrCreate.mockResolvedValue([{ id: 1 }, false]);

      const result = await exerciseSchedulerService.createSessionsForAssignment({
        id: 1,
        patientId: 2,
        centerId: 3,
        assignedBy: 4,
        exerciseConfig: { frequency: 'daily' },
      });

      expect(result).toBe(0);
    });

    test('should create weekly and monthly sessions correctly', async () => {
      ExerciseSession.findOrCreate.mockResolvedValue([{ id: 1 }, true]);

      const weekly = await exerciseSchedulerService.createSessionsForAssignment({
        id: 1,
        patientId: 2,
        centerId: 3,
        assignedBy: 4,
        exerciseConfig: { frequency: 'weekly' },
      });
      const monthly = await exerciseSchedulerService.createSessionsForAssignment({
        id: 2,
        patientId: 2,
        centerId: 3,
        assignedBy: 4,
        exerciseConfig: { frequency: 'monthly' },
      });

      expect(weekly).toBe(1);
      expect(monthly).toBe(1);
    });
  });

  describe('createScheduledSessions', () => {
    test('should create sessions for active assignments', async () => {
      ExerciseAssignment.findAll.mockResolvedValue([
        { id: 1, patientId: 2, centerId: 3, assignedBy: 4, exerciseConfig: { frequency: 'daily' } },
        { id: 2, patientId: 5, centerId: 3, assignedBy: 4, exerciseConfig: { frequency: 'weekly' } },
      ]);
      ExerciseSession.findOrCreate.mockResolvedValue([{ id: 1 }, true]);

      const result = await exerciseSchedulerService.createScheduledSessions();

      expect(result).toEqual({ createdCount: 2, assignmentCount: 2 });
      expect(ExerciseAssignment.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        })
      );
      expect(buildInTreatmentWhereClause).toHaveBeenCalled();
    });
  });

  describe('scheduleSessionCreation', () => {
    test('should setup cron job for midnight session creation', () => {
      exerciseSchedulerService.scheduleSessionCreation();

      expect(cron.schedule).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
      expect(logger.info).toHaveBeenCalledWith('📅 Session creation scheduler started - runs daily at midnight (0:00)');
    });
  });

  describe('scheduleComplianceCheck', () => {
    test('should setup cron job for hourly compliance check', () => {
      exerciseSchedulerService.scheduleComplianceCheck();

      expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
      expect(logger.info).toHaveBeenCalledWith('Compliance scheduler started - checking every hour');
    });
  });
});
