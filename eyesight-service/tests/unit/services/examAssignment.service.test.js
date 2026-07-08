/**
 * ExamAssignment Service Unit Tests
 *
 * Critical coverage: after Bug 1 fix, updateExamConfigById must call
 * provisionExamSession so that patients see their exams immediately
 * when a doctor changes frequency — not wait until the nightly cron.
 */

jest.mock('../../../src/models/clinic/examAssignment.model', () => ({
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  findAndCountAll: jest.fn(),
  create: jest.fn(),
  bulkCreate: jest.fn(),
}));

jest.mock('sequelize', () => ({
  Op: { ne: Symbol('ne'), gte: Symbol('gte'), lte: Symbol('lte') },
}));

jest.mock('../../../src/utils/sessionProvisionUtils', () => ({
  shouldProvisionForPatient: jest.fn(),
  provisionExamSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/utils/query', () => ({
  sanitizePagination: jest.fn(() => ({ limit: 10, page: 1, offset: 0 })),
  buildSortBy: jest.fn(() => []),
  buildPagination: jest.fn(() => ({ page: 1, limit: 10, totalPages: 1 })),
}));

jest.mock('../../../src/services/exam/examSession.service', () => ({
  queryExamSessions: jest.fn().mockResolvedValue({ rows: [] }),
}));

jest.mock('../../../src/services/system/auditLog.service', () => ({
  logEntityAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/utils/common', () => ({
  calculateNextDueDate: jest.fn(() => new Date('2026-06-01')),
}));

const ExamAssignment = require('../../../src/models/clinic/examAssignment.model');
const { shouldProvisionForPatient, provisionExamSession } = require('../../../src/utils/sessionProvisionUtils');
const { logEntityAuditEvent } = require('../../../src/services/system/auditLog.service');
const examAssignmentService = require('../../../src/services/clinic/examAssignment.service');

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Build a mock ExamAssignment record.
 * The `save` mock is recreated per test so mutation by Object.assign doesn't
 * bleed between tests (the service calls Object.assign(config, updateData)).
 */
const makeMockConfig = (overrides = {}) => ({
  id: 1,
  patientId: 10,
  examType: 'far',
  centerId: 5,
  isEnabled: true,
  frequency: 'weekly',
  notificationSettings: {},
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// ─── updateExamConfigById ────────────────────────────────────────────────────

describe('ExamAssignment Service — updateExamConfigById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('provisions exam session when isEnabled=true and patient is in treatment', async () => {
    const config = makeMockConfig({ isEnabled: true });
    ExamAssignment.findByPk.mockResolvedValue(config);
    shouldProvisionForPatient.mockResolvedValue(true);

    await examAssignmentService.updateExamConfigById(1, { frequency: 'daily', updatedBy: 2 });

    expect(shouldProvisionForPatient).toHaveBeenCalledWith(config.patientId);
    expect(provisionExamSession).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: config.patientId,
        examType: config.examType,
      })
    );
  });

  test('does NOT provision session when isEnabled becomes false after update', async () => {
    // Scenario: doctor disables exam type.  After Object.assign, config.isEnabled = false.
    const config = makeMockConfig({ isEnabled: true });
    ExamAssignment.findByPk.mockResolvedValue(config);
    shouldProvisionForPatient.mockResolvedValue(true);

    await examAssignmentService.updateExamConfigById(1, { isEnabled: false, updatedBy: 2 });

    expect(shouldProvisionForPatient).not.toHaveBeenCalled();
    expect(provisionExamSession).not.toHaveBeenCalled();
  });

  test('does NOT provision session when patient is not in treatment window', async () => {
    // Scenario: patient's treatment window expired.
    const config = makeMockConfig({ isEnabled: true });
    ExamAssignment.findByPk.mockResolvedValue(config);
    shouldProvisionForPatient.mockResolvedValue(false);

    await examAssignmentService.updateExamConfigById(1, { frequency: 'daily', updatedBy: 2 });

    expect(shouldProvisionForPatient).toHaveBeenCalledWith(config.patientId);
    expect(provisionExamSession).not.toHaveBeenCalled();
  });

  test('still saves the config and logs audit even when provisioning is skipped', async () => {
    const config = makeMockConfig({ isEnabled: true });
    ExamAssignment.findByPk.mockResolvedValue(config);
    shouldProvisionForPatient.mockResolvedValue(false);

    await examAssignmentService.updateExamConfigById(1, { frequency: 'daily', updatedBy: 2 });

    expect(config.save).toHaveBeenCalled();
    expect(logEntityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'examAssignment.update',
        entityType: 'examAssignment',
        entityId: config.id,
      })
    );
  });

  test('throws NOT_FOUND when config does not exist', async () => {
    ExamAssignment.findByPk.mockResolvedValue(null);

    await expect(examAssignmentService.updateExamConfigById(999, { frequency: 'daily' })).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(provisionExamSession).not.toHaveBeenCalled();
  });

  test('throws BAD_REQUEST when changing examType to one that already exists for this patient', async () => {
    const config = makeMockConfig({ examType: 'far' });
    ExamAssignment.findByPk.mockResolvedValue(config);
    ExamAssignment.findOne.mockResolvedValue({ id: 99 }); // duplicate found

    await expect(examAssignmentService.updateExamConfigById(1, { examType: 'near' })).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(config.save).not.toHaveBeenCalled();
    expect(provisionExamSession).not.toHaveBeenCalled();
  });
});

// ─── createExamConfig ────────────────────────────────────────────────────────

describe('ExamAssignment Service — createExamConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('provisions exam session after creation when patient is in treatment', async () => {
    ExamAssignment.findOne.mockResolvedValue(null); // no duplicate
    const created = makeMockConfig();
    ExamAssignment.create.mockResolvedValue(created);
    shouldProvisionForPatient.mockResolvedValue(true);

    await examAssignmentService.createExamConfig({
      patientId: 10,
      examType: 'far',
      centerId: 5,
      frequency: 'weekly',
      isEnabled: true,
      updatedBy: 2,
    });

    expect(shouldProvisionForPatient).toHaveBeenCalledWith(created.patientId);
    expect(provisionExamSession).toHaveBeenCalledWith(created);
  });

  test('does NOT provision exam session when patient is not in treatment', async () => {
    ExamAssignment.findOne.mockResolvedValue(null);
    const created = makeMockConfig();
    ExamAssignment.create.mockResolvedValue(created);
    shouldProvisionForPatient.mockResolvedValue(false);

    await examAssignmentService.createExamConfig({
      patientId: 10,
      examType: 'far',
      centerId: 5,
      frequency: 'weekly',
      isEnabled: true,
      updatedBy: 2,
    });

    expect(shouldProvisionForPatient).toHaveBeenCalledWith(created.patientId);
    expect(provisionExamSession).not.toHaveBeenCalled();
  });

  test('throws BAD_REQUEST when config for same examType already exists', async () => {
    ExamAssignment.findOne.mockResolvedValue({ id: 5 }); // duplicate

    await expect(
      examAssignmentService.createExamConfig({ patientId: 10, examType: 'far', centerId: 5 })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(ExamAssignment.create).not.toHaveBeenCalled();
    expect(provisionExamSession).not.toHaveBeenCalled();
  });
});
