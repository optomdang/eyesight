const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { treatmentPackageService } = require('../../services');

const createTreatmentPackage = catchAsync(async (req, res) => {
  const pkg = await treatmentPackageService.createTreatmentPackage(req.body);
  res.status(httpStatus.CREATED).send(pkg);
});

const getTreatmentPackages = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'code', 'centerId']);
  const options = pick(req.query, ['sortBy', 'order', 'limit', 'page']);
  const result = await treatmentPackageService.queryTreatmentPackages(filter, options);
  res.send(result);
});

const getTreatmentPackage = catchAsync(async (req, res) => {
  const pkg = await treatmentPackageService.getTreatmentPackageById(req.params.packageId);
  if (!pkg) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy gói điều trị');
  }
  res.send(pkg);
});

const updateTreatmentPackage = catchAsync(async (req, res) => {
  const pkg = await treatmentPackageService.updateTreatmentPackageById(req.params.packageId, req.body);
  res.send(pkg);
});

const deleteTreatmentPackage = catchAsync(async (req, res) => {
  await treatmentPackageService.deleteTreatmentPackageById(req.params.packageId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteTreatmentPackages = catchAsync(async (req, res) => {
  await treatmentPackageService.deleteTreatmentPackageByIds(req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const assignTreatmentPackage = catchAsync(async (req, res) => {
  const assignment = await treatmentPackageService.assignPackageToPatient({
    patientId: req.body.patientId,
    treatmentPackageId: Number(req.params.packageId),
    centerId: req.body.centerId,
    assignedBy: req.body.updatedBy,
  });
  res.status(httpStatus.CREATED).send(assignment);
});

module.exports = {
  createTreatmentPackage,
  getTreatmentPackages,
  getTreatmentPackage,
  updateTreatmentPackage,
  deleteTreatmentPackage,
  deleteTreatmentPackages,
  assignTreatmentPackage,
};
