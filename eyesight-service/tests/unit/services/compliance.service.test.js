jest.mock('../../../src/models', () => ({
  Patient: {
    findByPk: jest.fn(),
    update: jest.fn(),
  },
  ExamAssignment: {
    findOne: jest.fn(),
  },
  ExamSession: {
    findAll: jest.fn(),
  },
}));

const { Patient, ExamAssignment, ExamSession } = require('../../../src/models');
const complianceService = require('../../../src/services/clinic/compliance.service');

describe('Compliance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCompliance', () => {
    test('should calculate compliance from due exam sessions', async () => {
      ExamAssignment.findOne.mockResolvedValue({
        id: 1,
        patientId: 10,
        examType: 'contrast',
        isEnabled: true,
      });
      ExamSession.findAll.mockResolvedValue([
        { id: 1, status: 'completed', scheduledDate: '2026-03-01' },
        { id: 2, status: 'completed', scheduledDate: '2026-03-08' },
        { id: 3, status: 'incomplete', scheduledDate: '2026-03-15' },
      ]);

      const result = await complianceService.calculateCompliance(10, 'contrast');

      expect(result.completedExams).toBe(2);
      expect(result.requiredExams).toBe(3);
      expect(result.performanceRate).toBe(67);
      expect(result.status).toBe('warning');
      expect(ExamSession.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId: 10,
            examType: 'contrast',
            deleted: false,
          }),
        })
      );
    });

    test('should return empty compliance when config is missing', async () => {
      ExamAssignment.findOne.mockResolvedValue(null);

      const result = await complianceService.calculateCompliance(10, 'far');

      expect(result.completedExams).toBe(0);
      expect(result.requiredExams).toBe(0);
      expect(result.performanceRate).toBe(0);
      expect(result.status).toBe('poor');
      expect(ExamSession.findAll).not.toHaveBeenCalled();
    });
  });

  describe('recalculatePatientComplianceByType', () => {
    test('should merge recalculated compliance into patient record', async () => {
      Patient.findByPk.mockResolvedValue({
        id: 10,
        compliance: {
          far: { performanceRate: 100, status: 'excellent', completedExams: 1, requiredExams: 1 },
        },
      });
      ExamAssignment.findOne.mockResolvedValue({
        id: 2,
        patientId: 10,
        examType: 'near',
        isEnabled: true,
      });
      ExamSession.findAll.mockResolvedValue([
        { id: 1, status: 'completed', scheduledDate: '2026-03-01' },
        { id: 2, status: 'incomplete', scheduledDate: '2026-03-08' },
      ]);

      const result = await complianceService.recalculatePatientComplianceByType(10, 'near');

      expect(result.performanceRate).toBe(50);

      // Compliance is now written ATOMICALLY per-key via jsonb_set (not a full-object
      // read-modify-write), so the 'near' recalculation cannot clobber other exam types
      // when several types are saved in parallel.
      expect(Patient.update).toHaveBeenCalledTimes(1);
      const [updatePayload, updateOptions] = Patient.update.mock.calls[0];
      expect(updateOptions).toEqual({ where: { id: 10 } });
      // sequelize.fn('jsonb_set', ...) → Fn instance carrying fn name + args
      expect(updatePayload.compliance.fn).toBe('jsonb_set');
    });
  });
});
