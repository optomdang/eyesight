const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { clinicService } = require('../../services');

const filterKeys = ['name', 'code', 'centerId', 'phoneNumber', 'email', 'address'];

const createClinic = catchAsync(async (req, res) => {
  const clinic = await clinicService.createClinic(req.body);
  res.status(httpStatus.CREATED).send(clinic);
});

const getClinics = catchAsync(async (req, res) => {
  const filter = pick(req.query, filterKeys);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await clinicService.queryClinics(filter, options);
  res.send(result);
});

const getClinic = catchAsync(async (req, res) => {
  const clinic = await clinicService.getClinicById(req.params.clinicId);
  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phòng khám không tồn tại');
  }
  res.send(clinic);
});

const updateClinic = catchAsync(async (req, res) => {
  const clinic = await clinicService.updateClinicById(req.params.clinicId, req.body);
  res.send(clinic);
});

const deleteClinic = catchAsync(async (req, res) => {
  await clinicService.deleteClinicById(req.params.clinicId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteClinics = catchAsync(async (req, res) => {
  await clinicService.deleteClinicByIds(req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createClinic,
  getClinics,
  getClinic,
  updateClinic,
  deleteClinic,
  deleteClinics,
};
