const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { examMetricService } = require('../../services');

const filterKeys = ['examResultId', 'patientId', 'examType', 'centerId'];

const createExamMetric = catchAsync(async (req, res) => {
  const metric = await examMetricService.createExamMetric(req.body);
  res.status(httpStatus.CREATED).send(metric);
});

const getExamMetrics = catchAsync(async (req, res) => {
  const filter = pick(req.query, filterKeys);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await examMetricService.queryExamMetrics(filter, options);
  res.send(result);
});

const getExamMetric = catchAsync(async (req, res) => {
  const metric = await examMetricService.getExamMetricById(req.params.metricId);
  if (!metric) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam metric not found');
  }
  res.send(metric);
});

const getExamMetricsByExamResult = catchAsync(async (req, res) => {
  const metrics = await examMetricService.getExamMetricsByExamResultId(req.params.examResultId);
  res.send(metrics);
});

const updateExamMetric = catchAsync(async (req, res) => {
  const metric = await examMetricService.updateExamMetricById(req.params.metricId, req.body);
  res.send(metric);
});

const deleteExamMetric = catchAsync(async (req, res) => {
  await examMetricService.deleteExamMetricById(req.params.metricId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createExamMetric,
  getExamMetrics,
  getExamMetric,
  getExamMetricsByExamResult,
  updateExamMetric,
  deleteExamMetric,
};
