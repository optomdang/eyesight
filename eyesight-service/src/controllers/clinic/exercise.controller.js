const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { exerciseService } = require('../../services');

const filterKeys = ['name', 'code', 'description', 'defaultLevel', 'centerId', 'exerciseType', 'status'];

const createExercise = catchAsync(async (req, res) => {
  const exercise = await exerciseService.createExercise(req.body);
  res.status(httpStatus.CREATED).send(exercise);
});

const getExercises = catchAsync(async (req, res) => {
  const filter = pick(req.query, filterKeys);
  // SECURITY: Add centerId filtering for multi-tenant isolation
  filter.centerId = req.user.centerId;
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await exerciseService.queryExercises(filter, options);
  res.send(result);
});

const getExercise = catchAsync(async (req, res) => {
  const exercise = await exerciseService.getExerciseById(req.params.exerciseId);
  if (!exercise) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exercise not found');
  }
  // SECURITY: Verify center ownership
  if (exercise.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to access this exercise');
  }
  res.send(exercise);
});

const updateExercise = catchAsync(async (req, res) => {
  // SECURITY: Verify exercise belongs to user's center before updating
  const exercise = await exerciseService.getExerciseById(req.params.exerciseId);
  if (!exercise) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exercise not found');
  }
  if (exercise.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this exercise');
  }
  const updated = await exerciseService.updateExerciseById(req.params.exerciseId, req.body);
  res.send(updated);
});

const deleteExercise = catchAsync(async (req, res) => {
  // SECURITY: Verify exercise belongs to user's center before deleting
  const exercise = await exerciseService.getExerciseById(req.params.exerciseId);
  if (!exercise) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exercise not found');
  }
  if (exercise.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this exercise');
  }
  await exerciseService.deleteExerciseById(req.params.exerciseId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteExercises = catchAsync(async (req, res) => {
  await exerciseService.deleteExerciseByIds(req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createExercise,
  getExercises,
  getExercise,
  updateExercise,
  deleteExercise,
  deleteExercises,
};
