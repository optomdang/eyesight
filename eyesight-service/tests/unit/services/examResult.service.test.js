/**
 * ExamResult Service Unit Tests
 * Tests for exam result CRUD operations
 */

// Mock dependencies first
jest.mock('../../../src/config/db', () => ({
  sequelize: {
    transaction: jest.fn(() => ({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
  },
}));

jest.mock('../../../src/models', () => ({
  ExamResult: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    isDuplicateCode: jest.fn(),
  },
}));

const { ExamResult } = require('../../../src/models');
const examResultService = require('../../../src/services/exam/examResult.service');

describe('ExamResult Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExamResult', () => {
    const mockResultData = {
      code: 'ER001',
      patientId: 1,
      examType: 'far',
      centerId: 1,
      results: {
        leftEye: '20/40',
        rightEye: '20/40',
        bothEye: '20/40',
      },
      updatedBy: 1,
    };

    test('should create exam result successfully', async () => {
      ExamResult.isDuplicateCode.mockResolvedValue(false);
      ExamResult.create.mockResolvedValue({ id: 1, ...mockResultData });

      const result = await examResultService.createExamResult(mockResultData);

      expect(ExamResult.isDuplicateCode).toHaveBeenCalledWith('ER001', 1);
      expect(ExamResult.create).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    test('should throw error if code already exists', async () => {
      ExamResult.isDuplicateCode.mockResolvedValue(true);

      await expect(examResultService.createExamResult(mockResultData)).rejects.toThrow('Mã kết quả khám đã tồn tại');
      expect(ExamResult.create).not.toHaveBeenCalled();
    });

    test('should set createdBy from updatedBy', async () => {
      ExamResult.isDuplicateCode.mockResolvedValue(false);
      ExamResult.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));

      await examResultService.createExamResult(mockResultData);

      const createCall = ExamResult.create.mock.calls[0][0];
      expect(createCall.createdBy).toBe(mockResultData.updatedBy);
    });
  });

  describe('getExamResultById', () => {
    test('should return exam result by id', async () => {
      const mockResult = {
        id: 1,
        code: 'ER001',
        examType: 'far',
      };

      ExamResult.findByPk.mockResolvedValue(mockResult);

      const result = await examResultService.getExamResultById(1);

      expect(ExamResult.findByPk).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          attributes: expect.any(Array),
          raw: true,
        })
      );
      expect(result).toEqual(mockResult);
    });

    test('should return null for non-existent result', async () => {
      ExamResult.findByPk.mockResolvedValue(null);

      const result = await examResultService.getExamResultById(999);

      expect(result).toBeNull();
    });
  });

  describe('getExamResultByCode', () => {
    test('should return exam result by code', async () => {
      const mockResult = { id: 1, code: 'ER001' };
      ExamResult.findOne.mockResolvedValue(mockResult);

      const result = await examResultService.getExamResultByCode('ER001');

      expect(ExamResult.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.any(Array),
          where: { code: 'ER001', deleted: false },
          raw: true,
        })
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('queryExamResults', () => {
    test('should return paginated exam results', async () => {
      const mockResults = [
        { id: 1, code: 'ER001' },
        { id: 2, code: 'ER002' },
      ];

      ExamResult.findAndCountAll.mockResolvedValue({
        rows: mockResults,
        count: 2,
      });

      const result = await examResultService.queryExamResults({ centerId: 1 }, { page: 1, limit: 10 });

      expect(result.rows).toEqual(mockResults);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    test('should handle sorting', async () => {
      ExamResult.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      await examResultService.queryExamResults({ centerId: 1 }, { sortBy: 'createdAt:DESC' });

      expect(ExamResult.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['createdAt', 'DESC']],
        })
      );
    });
  });

  describe('getExamResultsByPatientId', () => {
    test('should return exam results for patient', async () => {
      const mockResults = [
        { id: 1, patientId: 1, examType: 'far' },
        { id: 2, patientId: 1, examType: 'near' },
      ];

      ExamResult.findAndCountAll.mockResolvedValue({
        rows: mockResults,
        count: 2,
      });

      const result = await examResultService.getExamResultsByPatientId(1, { page: 1, limit: 10 });

      expect(ExamResult.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 1, deleted: false },
        })
      );
      expect(result.rows).toEqual(mockResults);
    });
  });

  describe('getLatestExamResultByPatientId', () => {
    test('should return latest exam result for patient', async () => {
      const mockResult = {
        id: 1,
        patientId: 1,
        examType: 'far',
        createdAt: new Date(),
      };

      ExamResult.findOne.mockResolvedValue(mockResult);

      const result = await examResultService.getLatestExamResultByPatientId(1);

      expect(ExamResult.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.any(Array),
          where: { patientId: 1, deleted: false },
          order: [['createdAt', 'DESC']],
          raw: true,
        })
      );
      expect(result).toEqual(mockResult);
    });

    test('should filter by examType if provided', async () => {
      ExamResult.findOne.mockResolvedValue(null);

      await examResultService.getLatestExamResultByPatientId(1, 'far');

      expect(ExamResult.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.any(Array),
          where: { patientId: 1, deleted: false, examType: 'far' },
          order: [['createdAt', 'DESC']],
          raw: true,
        })
      );
    });

    test('should throw error if patientId is missing', async () => {
      await expect(examResultService.getLatestExamResultByPatientId(null)).rejects.toThrow('ID bệnh nhân là bắt buộc');
    });
  });

  describe('getIncompleteExamResult', () => {
    test('should return incomplete exam result', async () => {
      const mockResult = {
        id: 1,
        patientId: 1,
        examType: 'far',
        status: 'incomplete',
      };

      ExamResult.findOne.mockResolvedValue(mockResult);

      const result = await examResultService.getIncompleteExamResult(1, 'far');

      expect(ExamResult.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.any(Array),
          where: {
            patientId: 1,
            examType: 'far',
            status: 'incomplete',
            deleted: false,
          },
          raw: true,
        })
      );
      expect(result).toEqual(mockResult);
    });

    test('should return null if no incomplete result', async () => {
      ExamResult.findOne.mockResolvedValue(null);

      const result = await examResultService.getIncompleteExamResult(1, 'far');

      expect(result).toBeNull();
    });
  });

  describe('updateExamResultById', () => {
    const mockExistingResult = {
      id: 1,
      code: 'ER001',
      centerId: 1,
      save: jest.fn(),
    };

    test('should update exam result successfully', async () => {
      ExamResult.findByPk.mockResolvedValue(mockExistingResult);
      ExamResult.isDuplicateCode.mockResolvedValue(false);

      const updateData = { status: 'completed' };

      const result = await examResultService.updateExamResultById(1, updateData);

      expect(mockExistingResult.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should throw error for non-existent result', async () => {
      ExamResult.findByPk.mockResolvedValue(null);

      await expect(examResultService.updateExamResultById(999, { status: 'completed' })).rejects.toThrow(
        'Kết quả khám không tồn tại'
      );
    });

    test('should throw error if new code already exists', async () => {
      ExamResult.findByPk.mockResolvedValue(mockExistingResult);
      ExamResult.isDuplicateCode.mockResolvedValue(true);

      await expect(examResultService.updateExamResultById(1, { code: 'DUPLICATE' })).rejects.toThrow(
        'Mã kết quả khám đã tồn tại'
      );
    });
  });

  describe('deleteExamResultById', () => {
    test('should soft delete exam result', async () => {
      const mockResult = {
        id: 1,
        deleted: false,
        save: jest.fn(),
      };

      ExamResult.findByPk.mockResolvedValue(mockResult);

      await examResultService.deleteExamResultById(1);

      expect(mockResult.deleted).toBe(true);
      expect(mockResult.deletedAt).toBeDefined();
      expect(mockResult.save).toHaveBeenCalled();
    });

    test('should throw error for non-existent result', async () => {
      ExamResult.findByPk.mockResolvedValue(null);

      await expect(examResultService.deleteExamResultById(999)).rejects.toThrow('Kết quả khám không tồn tại');
    });
  });

  describe('deleteExamResultByIds', () => {
    test('should bulk soft delete exam results', async () => {
      ExamResult.update.mockResolvedValue([2]);

      await examResultService.deleteExamResultByIds([1, 2]);

      expect(ExamResult.update).toHaveBeenCalledWith(
        { deleted: true, deletedAt: expect.any(Date) },
        { where: { id: [1, 2] } }
      );
    });
  });
});
