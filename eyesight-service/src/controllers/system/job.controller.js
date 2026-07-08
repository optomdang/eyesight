const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const pick = require('../../utils/pick');
const { jobService, auditLogService } = require('../../services');

const listJobs = catchAsync(async (req, res) => {
  const jobs = jobService.listJobs();
  res.status(httpStatus.OK).send(jobs);
});

const runJobs = catchAsync(async (req, res) => {
  const { jobCode } = { ...pick(req.query, ['jobCode']), ...pick(req.body || {}, ['jobCode']) };
  const result = await jobService.runJobs(jobCode, {
    user: req.user,
    centerId: req.user?.centerId || null,
    requestContext: auditLogService.buildRequestContext(req),
  });
  res.status(httpStatus.OK).send(result);
});

const getScheduleHistory = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['jobCode', 'status', 'userId', 'triggeredBy']);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'order', 'includeUser']);
  const result = await jobService.getScheduleHistory(filter, options);
  res.status(httpStatus.OK).send(result);
});

module.exports = {
  listJobs,
  runJobs,
  getScheduleHistory,
};
