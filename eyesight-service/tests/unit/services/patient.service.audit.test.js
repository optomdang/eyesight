jest.mock('../../../src/models', () => ({
  User: {},
  Doctor: {},
  Clinic: {},
  Patient: {
    isDuplicateCode: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../../src/utils/errorFactory', () => ({
  patientErrors: {
    duplicateCode: jest.fn(() => {
      throw new Error('duplicate');
    }),
  },
}));

jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../../src/utils/treatmentUtils', () => ({
  buildInTreatmentWhereClause: jest.fn(() => ({})),
  buildCompletedWhereClause: jest.fn(() => ({})),
  buildNotStartedWhereClause: jest.fn(() => ({})),
  isInTreatmentWindow: jest.fn(() => false),
}));

jest.mock('../../../src/utils/sessionProvisionUtils', () => ({
  provisionAllSessionsForPatient: jest.fn(),
}));

jest.mock('../../../src/utils/query', () => ({
  sanitizePagination: jest.fn(() => ({ limit: 10, page: 1, offset: 0 })),
  buildSortBy: jest.fn(() => []),
  buildPagination: jest.fn(() => ({ count: 0, limit: 10, page: 1, totalPages: 0 })),
  ATTRS: {
    USER_LIST: [],
    CLINIC_BASIC: [],
    DOCTOR_BASIC: [],
    USER_PROFILE: [],
    CLINIC_LIST: [],
    DOCTOR_LIST: [],
    USER_BASIC: [],
  },
  FILTERS: {
    multiTenant: jest.fn(() => ({ deleted: false })),
    textSearchUnaccent: jest.fn(() => ({})),
    textSearch: jest.fn(() => ({})),
    jsonb: jest.fn(() => ({})),
  },
  monitor: {
    measure: jest.fn(async (_name, fn) => fn()),
  },
}));

jest.mock('../../../src/services/system/auditLog.service', () => ({
  logEntityAuditEvent: jest.fn().mockResolvedValue(null),
}));

const { Patient } = require('../../../src/models');
const auditLogService = require('../../../src/services/system/auditLog.service');
const patientService = require('../../../src/services/clinic/patient.service');

describe('Patient Service Audit Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should log audit event when creating a patient', async () => {
    Patient.isDuplicateCode.mockResolvedValue(false);
    Patient.create.mockResolvedValue({
      id: 11,
      code: 'PAT001',
      userId: 101,
      doctorId: 201,
      centerId: 1,
      treatmentStatus: true,
    });

    const result = await patientService.createPatient(
      {
        code: 'PAT001',
        userId: 101,
        doctorId: 201,
        centerId: 1,
        updatedBy: 999,
      },
      {
        user: { id: 999, userType: 'doctor', centerId: 1 },
        requestContext: { requestPath: '/v1/patients', requestMethod: 'POST' },
      }
    );

    expect(result.id).toBe(11);
    expect(auditLogService.logEntityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'patient.create',
        entityType: 'patient',
        entityId: 11,
        centerId: 1,
        metadata: expect.objectContaining({
          code: 'PAT001',
          userId: 101,
          doctorId: 201,
        }),
      })
    );
  });

  test('should log audit event when deleting a patient', async () => {
    const update = jest.fn().mockResolvedValue(true);
    const patientRecord = {
      id: 12,
      code: 'PAT002',
      userId: 102,
      doctorId: 202,
      centerId: 3,
      update,
    };
    Patient.findByPk.mockResolvedValue(patientRecord);

    await patientService.deletePatientById(12, {
      user: { id: 500, userType: 'admin', centerId: 3 },
      requestContext: { requestPath: '/v1/patients/12', requestMethod: 'DELETE' },
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ deleted: true }));
    expect(auditLogService.logEntityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'patient.delete',
        entityType: 'patient',
        entityId: 12,
        centerId: 3,
      })
    );
  });

  test('should log audit event when updating medical record', async () => {
    const update = jest.fn().mockResolvedValue(true);
    Patient.findByPk.mockResolvedValue({
      id: 13,
      centerId: 8,
      update,
    });

    await patientService.updateMedicalRecord(
      13,
      {
        medicalHistory: 'history text',
        additionalNotes: 'notes',
        medicalImages: [{ size: 100 }],
      },
      {
        user: { id: 41, userType: 'doctor', centerId: 8 },
        requestContext: { requestPath: '/v1/patients/13/medical-record', requestMethod: 'PATCH' },
      }
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        medicalHistory: 'history text',
        additionalNotes: 'notes',
        medicalImages: [{ size: 100 }],
      })
    );
    expect(auditLogService.logEntityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'patient.medicalRecord.update',
        entityType: 'patient',
        entityId: 13,
        centerId: 8,
        metadata: expect.objectContaining({
          changedFields: ['medicalHistory', 'additionalNotes', 'medicalImages'],
          medicalImageCount: 1,
        }),
      })
    );
  });
});
