jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../../src/models', () => ({
  Patient: { findByPk: jest.fn() },
  ExamAssignment: { findAll: jest.fn() },
  ExerciseAssignment: { findAll: jest.fn() },
  ExamSession: { count: jest.fn(), rawAttributes: { deleted: true } },
  ExerciseSession: { count: jest.fn(), rawAttributes: { deleted: true } },
}));

jest.mock('../../../src/services/exam/examScheduler.service', () => ({
  createSessionIfNotExists: jest.fn(),
}));

jest.mock('../../../src/services/exercise/exerciseScheduler.service', () => ({
  createSessionsForAssignment: jest.fn(),
}));

jest.mock('../../../src/utils/treatmentUtils', () => ({
  isInTreatmentWindow: jest.fn(),
}));

const { Patient, ExamAssignment, ExerciseAssignment, ExamSession, ExerciseSession } = require('../../../src/models');
const examSchedulerService = require('../../../src/services/exam/examScheduler.service');
const exerciseSchedulerService = require('../../../src/services/exercise/exerciseScheduler.service');
const { isInTreatmentWindow } = require('../../../src/utils/treatmentUtils');
const sessionProvisionUtils = require('../../../src/utils/sessionProvisionUtils');

describe('Session Provision Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shouldProvisionForPatient', () => {
    test('should return true for patient in treatment window', async () => {
      const patient = {
        id: 1,
        treatmentStatus: true,
        activeFrom: new Date('2026-01-01T00:00:00.000Z'),
        activeTo: new Date('2026-12-31T23:59:59.999Z'),
        deleted: false,
      };
      Patient.findByPk.mockResolvedValue(patient);
      isInTreatmentWindow.mockReturnValue(true);

      const result = await sessionProvisionUtils.shouldProvisionForPatient(patient.id);

      expect(result).toBe(true);
      expect(Patient.findByPk).toHaveBeenCalledWith(patient.id, {
        attributes: ['id', 'treatmentStatus', 'activeFrom', 'activeTo', 'deleted'],
      });
      expect(isInTreatmentWindow).toHaveBeenCalledWith(patient, expect.any(Date));
    });

    test('should return false for deleted patient', async () => {
      Patient.findByPk.mockResolvedValue({ id: 1, deleted: true });

      const result = await sessionProvisionUtils.shouldProvisionForPatient(1);

      expect(result).toBe(false);
      expect(isInTreatmentWindow).not.toHaveBeenCalled();
    });
  });

  describe('hasSessionsToday', () => {
    test('should return false when no sessions exist today', async () => {
      ExamSession.count.mockResolvedValue(0);
      ExerciseSession.count.mockResolvedValue(0);

      const result = await sessionProvisionUtils.hasSessionsToday(123);

      expect(result).toBe(false);
      expect(ExamSession.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          patientId: 123,
          deleted: false,
        }),
      });
      expect(ExerciseSession.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          patientId: 123,
          deleted: false,
        }),
      });
    });

    test('should return true when exam session exists today', async () => {
      ExamSession.count.mockResolvedValue(1);
      ExerciseSession.count.mockResolvedValue(0);

      const result = await sessionProvisionUtils.hasSessionsToday(123);

      expect(result).toBe(true);
    });

    test('should return true when exercise session exists today', async () => {
      ExamSession.count.mockResolvedValue(0);
      ExerciseSession.count.mockResolvedValue(1);

      const result = await sessionProvisionUtils.hasSessionsToday(123);

      expect(result).toBe(true);
    });
  });

  describe('provisionAllSessionsForPatient', () => {
    test('should provision sessions when none exist today', async () => {
      const examAssignments = [{ id: 11, patientId: 1, examType: 'far' }];
      const exerciseAssignments = [{ id: 21, patientId: 1, exerciseConfig: { id: 31 } }];
      ExamAssignment.findAll.mockResolvedValue(examAssignments);
      ExerciseAssignment.findAll.mockResolvedValue(exerciseAssignments);
      examSchedulerService.createSessionIfNotExists.mockResolvedValue(true);
      exerciseSchedulerService.createSessionsForAssignment.mockResolvedValue(1);

      const result = await sessionProvisionUtils.provisionAllSessionsForPatient(1);

      expect(result).toEqual({ examSessions: 1, exerciseSessions: 1 });
      expect(examSchedulerService.createSessionIfNotExists).toHaveBeenCalledWith(examAssignments[0], expect.any(Date));
      expect(exerciseSchedulerService.createSessionsForAssignment).toHaveBeenCalledWith(exerciseAssignments[0]);
    });

    test('should still invoke provisioners even if sessions already exist today', async () => {
      const examAssignments = [
        { id: 11, patientId: 1, examType: 'far' },
        { id: 12, patientId: 1, examType: 'near' },
      ];
      const exerciseAssignments = [
        { id: 21, patientId: 1, exerciseConfig: { id: 31 } },
        { id: 22, patientId: 1, exerciseConfig: { id: 32 } },
      ];
      ExamAssignment.findAll.mockResolvedValue(examAssignments);
      ExerciseAssignment.findAll.mockResolvedValue(exerciseAssignments);
      examSchedulerService.createSessionIfNotExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      exerciseSchedulerService.createSessionsForAssignment.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

      const result = await sessionProvisionUtils.provisionAllSessionsForPatient(1);

      expect(result).toEqual({ examSessions: 1, exerciseSessions: 1 });
      expect(examSchedulerService.createSessionIfNotExists).toHaveBeenCalledTimes(2);
      expect(exerciseSchedulerService.createSessionsForAssignment).toHaveBeenCalledTimes(2);
    });

    test('should return zero counts when patient has no active assignments', async () => {
      ExamAssignment.findAll.mockResolvedValue([]);
      ExerciseAssignment.findAll.mockResolvedValue([]);

      const result = await sessionProvisionUtils.provisionAllSessionsForPatient(1);

      expect(result).toEqual({ examSessions: 0, exerciseSessions: 0 });
      expect(examSchedulerService.createSessionIfNotExists).not.toHaveBeenCalled();
      expect(exerciseSchedulerService.createSessionsForAssignment).not.toHaveBeenCalled();
    });
  });
});
