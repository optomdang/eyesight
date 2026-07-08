jest.mock('../../../src/services', () => ({
  examResultService: {
    queryExamResults: jest.fn(),
  },
  patientService: {
    getPatientByUserId: jest.fn(),
  },
  examSessionService: {},
}));

jest.mock('../../../src/services/clinic/examAssignment.service', () => ({
  getExamAssignments: jest.fn(),
}));

const { examResultService, patientService } = require('../../../src/services');
const { getMyExamResults } = require('../../../src/controllers/exam/examResult.controller');

describe('examResult.controller - getMyExamResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses completedAt desc as default sort for history consistency', async () => {
    const req = {
      user: { id: 11 },
      query: {},
    };

    const res = {
      send: jest.fn(),
    };

    const next = jest.fn();

    patientService.getPatientByUserId.mockResolvedValue({
      id: 22,
      centerId: 33,
    });

    const mockResult = { rows: [], count: 0, page: 1, totalPages: 0 };
    examResultService.queryExamResults.mockResolvedValue(mockResult);

    getMyExamResults(req, res, next);
    await new Promise(process.nextTick);

    expect(examResultService.queryExamResults).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 22, centerId: 33 }),
      expect.objectContaining({ sortBy: 'completedAt:desc' })
    );
    expect(res.send).toHaveBeenCalledWith(mockResult);
    expect(next).not.toHaveBeenCalled();
  });

  test('keeps explicit sortBy from query when provided', async () => {
    const req = {
      user: { id: 11 },
      query: { sortBy: 'createdAt:asc' },
    };

    const res = {
      send: jest.fn(),
    };

    const next = jest.fn();

    patientService.getPatientByUserId.mockResolvedValue({
      id: 22,
      centerId: 33,
    });

    examResultService.queryExamResults.mockResolvedValue({ rows: [], count: 0, page: 1, totalPages: 0 });

    getMyExamResults(req, res, next);
    await new Promise(process.nextTick);

    expect(examResultService.queryExamResults).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 22, centerId: 33 }),
      expect.objectContaining({ sortBy: 'createdAt:asc' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
