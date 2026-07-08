const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { doctorService } = require('../../services');

const filterKeys = ['code', 'name', 'userId', 'phoneNumber', 'address', 'centerId'];

const createDoctor = catchAsync(async (req, res) => {
  const doctor = await doctorService.createDoctor(req.body);
  res.status(httpStatus.CREATED).send(doctor);
});

const getDoctors = catchAsync(async (req, res) => {
  const filter = pick(req.query, filterKeys);
  const options = pick(req.query, ['sortBy', 'order', 'limit', 'page']);
  // Include patient count for list view
  options.includeCount = true;
  const result = await doctorService.queryDoctors(filter, options);
  res.send(result);
});

const getDoctor = catchAsync(async (req, res) => {
  const doctor = await doctorService.getDoctorById(req.params.doctorId);
  if (!doctor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bác sĩ không tồn tại');
  }
  res.send(doctor);
});

const updateDoctor = catchAsync(async (req, res) => {
  const doctor = await doctorService.updateDoctorById(req.params.doctorId, req.body, null);
  res.send(doctor);
});

const deleteDoctor = catchAsync(async (req, res) => {
  await doctorService.deleteDoctorById(req.params.doctorId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteDoctors = catchAsync(async (req, res) => {
  await doctorService.deleteDoctorByIds(req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createDoctor,
  getDoctors,
  getDoctor,
  updateDoctor,
  deleteDoctor,
  deleteDoctors,
};
