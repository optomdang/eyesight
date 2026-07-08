const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { centerService } = require('../../services');

const createCenter = catchAsync(async (req, res) => {
  const center = await centerService.createCenter(req.body);
  res.status(httpStatus.CREATED).send(center);
});

const getCenters = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'code']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await centerService.queryCenters(filter, options);
  res.send(result);
});

const getCenter = catchAsync(async (req, res) => {
  const center = await centerService.getCenterById(req.params.centerId);
  if (!center) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trung tâm không tồn tại');
  }
  res.send(center);
});

const updateCenter = catchAsync(async (req, res) => {
  const center = await centerService.updateCenterById(req.params.centerId, req.body);
  res.send(center);
});

const deleteCenter = catchAsync(async (req, res) => {
  await centerService.deleteCenterById(req.params.centerId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteCenters = catchAsync(async (req, res) => {
  await centerService.deleteCenterByIds(req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createCenter,
  getCenters,
  getCenter,
  updateCenter,
  deleteCenter,
  deleteCenters,
};
