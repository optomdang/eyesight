jest.mock('../../../src/services', () => ({
  exerciseAssignmentService: {
    assignConfigToPatients: jest.fn(),
  },
}));

const { exerciseAssignmentService } = require('../../../src/services');
const exerciseAssignmentController = require('../../../src/controllers/exercise/exerciseAssignment.controller');

const buildRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

describe('exerciseAssignment.controller — assignConfigToPatients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    exerciseAssignmentService.assignConfigToPatients.mockResolvedValue([{ id: 1 }]);
  });

  test('forwards per-patient trainingEye to the service', async () => {
    const req = {
      params: { configId: 10 },
      body: {
        patientIds: [3],
        trainingEye: 'right',
        visionLevel: 5,
        levelOverride: true,
      },
      user: { id: 99, centerId: 1 },
    };
    const res = buildRes();

    await exerciseAssignmentController.assignConfigToPatients(req, res, jest.fn());

    expect(exerciseAssignmentService.assignConfigToPatients).toHaveBeenCalledWith(
      10,
      [3],
      expect.objectContaining({
        assignedBy: 99,
        trainingEye: 'right',
        visionLevel: 5,
        levelOverride: true,
      }),
      1,
      { sync: false }
    );
  });

  test('defaults trainingEye to null when not provided', async () => {
    const req = {
      params: { configId: 10 },
      body: { patientIds: [3] },
      user: { id: 99, centerId: 1 },
    };
    const res = buildRes();

    await exerciseAssignmentController.assignConfigToPatients(req, res, jest.fn());

    expect(exerciseAssignmentService.assignConfigToPatients).toHaveBeenCalledWith(
      10,
      [3],
      expect.objectContaining({ trainingEye: null }),
      1,
      { sync: false }
    );
  });

  test('forwards sync=true for bulk membership replace', async () => {
    const req = {
      params: { configId: 10 },
      body: { patientIds: [3, 4], sync: true },
      user: { id: 99, centerId: 1 },
    };
    const res = buildRes();

    await exerciseAssignmentController.assignConfigToPatients(req, res, jest.fn());

    expect(exerciseAssignmentService.assignConfigToPatients).toHaveBeenCalledWith(
      10,
      [3, 4],
      expect.any(Object),
      1,
      { sync: true }
    );
  });
});
