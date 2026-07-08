jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../../src/models', () => ({
  ExamAssignment: {
    findAll: jest.fn(),
  },
  ExamSession: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Patient: {},
}));

jest.mock('../../../src/utils/common', () => ({
  generateCode: jest.fn(() => 'ES_TEST'),
  getCurrentCycleDateRange: jest.fn(() => ({
    start: new Date('2026-01-19T00:00:00.000Z'),
    end: new Date('2026-01-25T23:59:59.999Z'),
  })),
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

jest.mock('../../../src/services/clinic/compliance.service', () => ({
  recalculatePatientComplianceByType: jest.fn().mockResolvedValue(undefined),
}));

const cron = require('node-cron');
const logger = require('../../../src/config/logger');
const { ExamAssignment, ExamSession } = require('../../../src/models');
const { buildInTreatmentWhereClause } = require('../../../src/utils/treatmentUtils');
const { recalculatePatientComplianceByType } = require('../../../src/services/clinic/compliance.service');
const examSchedulerService = require('../../../src/services/exam/examScheduler.service');

describe('Exam Scheduler Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSessionIfNotExists', () => {
    const cycleStart = new Date('2026-01-19T00:00:00.000Z'); // Monday
    const cycleEnd = new Date('2026-01-25T23:59:59.999Z'); // Sunday
    const weeklyConfig = { patientId: 1, examType: 'far', centerId: 2, frequency: 'weekly' };

    test('should create new exam session when none exists for current cycle', async () => {
      ExamSession.findOne.mockResolvedValue(null);
      ExamSession.create.mockResolvedValue({ id: 1 });

      const result = await examSchedulerService.createSessionIfNotExists(weeklyConfig, cycleStart);

      expect(result).toBe(true);
      expect(ExamSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 1,
          examType: 'far',
          centerId: 2,
          status: 'incomplete',
          scheduledDate: cycleStart, // Always uses cycleStart, not the passed-in date
        })
      );
      expect(recalculatePatientComplianceByType).toHaveBeenCalledWith(1, 'far');
    });

    test('should skip creation when session already exists at cycleStart', async () => {
      ExamSession.findOne.mockResolvedValue({ id: 1, scheduledDate: cycleStart });

      const result = await examSchedulerService.createSessionIfNotExists(weeklyConfig, cycleStart);

      expect(result).toBe(false);
      expect(ExamSession.create).not.toHaveBeenCalled();
    });

    test('should not create duplicate when session exists at different date within same cycle', async () => {
      // BUG REGRESSION: Cron created session at Monday (cycleStart).
      // Doctor updates frequency → provisionExamSession runs with new Date() (e.g. Wednesday).
      // Both Wednesday and Monday resolve to the same weekly cycle range.
      // createSessionIfNotExists must find the Monday session and skip creation.
      const existingMondaySession = { id: 1, scheduledDate: cycleStart };
      ExamSession.findOne.mockResolvedValue(existingMondaySession);

      const wednesday = new Date('2026-01-21T10:00:00.000Z');
      const result = await examSchedulerService.createSessionIfNotExists(
        weeklyConfig,
        wednesday // Different date but same cycle
      );

      expect(result).toBe(false);
      expect(ExamSession.create).not.toHaveBeenCalled();
    });

    test('should always create session with scheduledDate = cycleStart regardless of sessionDate input', async () => {
      // Even if called with a mid-cycle date, the session must be anchored to cycleStart
      // so getCurrentActiveSession can find it consistently.
      ExamSession.findOne.mockResolvedValue(null);
      ExamSession.create.mockResolvedValue({ id: 1 });

      const wednesday = new Date('2026-01-21T10:00:00.000Z');
      await examSchedulerService.createSessionIfNotExists(weeklyConfig, wednesday);

      expect(ExamSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledDate: cycleStart, // Always Monday, never Wednesday
        })
      );
    });

    test('should query findOne using cycle date range, not exact date', async () => {
      // This ensures the dedup check covers the whole cycle window,
      // not just an exact scheduledDate match.
      ExamSession.findOne.mockResolvedValue(null);
      ExamSession.create.mockResolvedValue({ id: 1 });

      await examSchedulerService.createSessionIfNotExists(weeklyConfig, cycleStart);

      const findOneCall = ExamSession.findOne.mock.calls[0][0];
      const scheduledDateWhere = findOneCall.where.scheduledDate;

      // Op.gte and Op.lte are Symbols — inspect values rather than keying by Symbol
      const whereValues = Object.getOwnPropertySymbols(scheduledDateWhere).map((sym) => scheduledDateWhere[sym]);
      expect(whereValues).toContainEqual(cycleStart); // Op.gte: cycleStart
      expect(whereValues).toContainEqual(cycleEnd); // Op.lte: cycleEnd
    });

    test('should handle SequelizeUniqueConstraintError gracefully', async () => {
      ExamSession.findOne.mockResolvedValue(null);
      const uniqueError = new Error('Unique constraint');
      uniqueError.name = 'SequelizeUniqueConstraintError';
      ExamSession.create.mockRejectedValue(uniqueError);

      const result = await examSchedulerService.createSessionIfNotExists(weeklyConfig, cycleStart);

      expect(result).toBe(false); // Swallowed, not re-thrown
    });
  });

  describe('createScheduledExamSessions', () => {
    test('should create sessions for all active exam assignments', async () => {
      ExamAssignment.findAll.mockResolvedValue([
        { id: 1, patientId: 1, examType: 'far', centerId: 2, frequency: 'weekly' },
        { id: 2, patientId: 2, examType: 'near', centerId: 2, frequency: 'monthly' },
      ]);
      ExamSession.findOne.mockResolvedValue(null);
      ExamSession.create.mockResolvedValue({ id: 1 });

      const result = await examSchedulerService.createScheduledExamSessions();

      expect(result).toEqual({ createdCount: 2, configCount: 2 });
      expect(ExamAssignment.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isEnabled: true },
        })
      );
      expect(buildInTreatmentWhereClause).toHaveBeenCalled();
    });
  });

  describe('startExamScheduler', () => {
    test('should start exam scheduler successfully', () => {
      examSchedulerService.startExamScheduler();

      expect(cron.schedule).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
      expect(logger.info).toHaveBeenCalledWith('📅 Exam scheduler started - runs daily at 00:00 local time');
    });
  });
});
