const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { patientService, doctorService } = require('../../services');
const examAssignmentService = require('../../services/clinic/examAssignment.service');

// NOTE: Query filtering is intentionally allow-listed.
// Some filters (name/phoneNumber/country) are applied via associated User in patientService.queryPatients.
const filterKeys = [
  'code',
  'userId',
  'age',
  'gender',
  'phoneNumber',
  'name',
  'inactiveDays',
  'effectiveness',
  'severityLevel',
  'country',
  'address',
  'doctorId',
  'centerId',
  'zaloUserId',
  'zaloPhoneNumber',
];

const createPatient = catchAsync(async (req, res) => {
  const patient = await patientService.createPatient(req.body);
  res.status(httpStatus.CREATED).send(patient);
});

const getPatients = catchAsync(async (req, res) => {
  const filter = pick(req.query, filterKeys);
  // SECURITY: Add centerId filtering for multi-tenant isolation
  filter.centerId = req.user.centerId;

  // SECURITY: Doctor can only see their own patients
  if (req.user.userType === 'doctor') {
    if (!req.user.doctor || !req.user.doctor.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Không tìm thấy thông tin bác sĩ');
    }
    filter.doctorId = req.user.doctor.id;
  }

  const options = pick(req.query, ['sortBy', 'order', 'limit', 'page']);
  const result = await patientService.queryPatients(filter, options);
  res.send(result);
});

const getPatient = catchAsync(async (req, res) => {
  const patient = await patientService.getPatientById(req.params.patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }
  // SECURITY: Verify center ownership
  if (patient.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to access this patient');
  }
  res.send(patient);
});

const updatePatient = catchAsync(async (req, res) => {
  // SECURITY: Verify patient belongs to user's center before updating
  const patient = await patientService.getPatientById(req.params.patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
  }
  if (patient.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this patient');
  }
  const updated = await patientService.updatePatientById(req.params.patientId, req.body);
  res.send(updated);
});

const pausePatientTreatment = catchAsync(async (req, res) => {
  const patient = await patientService.getPatientById(req.params.patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
  }
  if (patient.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this patient');
  }

  const updated = await patientService.pausePatientTreatment(req.params.patientId, req.body.updatedBy);
  res.send(updated);
});

const resumePatientTreatment = catchAsync(async (req, res) => {
  const patient = await patientService.getPatientById(req.params.patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
  }
  if (patient.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this patient');
  }

  const updated = await patientService.resumePatientTreatment(req.params.patientId, req.body);
  res.send(updated);
});

const deletePatient = catchAsync(async (req, res) => {
  // SECURITY: Verify patient belongs to user's center before deleting
  const patient = await patientService.getPatientById(req.params.patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
  }
  if (patient.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this patient');
  }
  await patientService.deletePatientById(req.params.patientId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const deletePatients = catchAsync(async (req, res) => {
  await patientService.deletePatientByIds(req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const createOrUpdateExamAssignment = catchAsync(async (req, res) => {
  if (req.params.patientId) {
    req.body.patientId = parseInt(req.params.patientId, 10);
  }
  // Get all exam configs for patient
  const configs = await examAssignmentService.getExamAssignments(req.params.patientId);
  if (configs && configs.length > 0) {
    // Update existing configs (bulk update not supported, return first config)
    const config = configs[0];
    const updated = await examAssignmentService.updateExamConfigById(config.id, req.body);
    res.status(httpStatus.OK).send(updated);
  } else {
    // Create new config
    const config = await examAssignmentService.createExamConfig(req.body);
    res.status(httpStatus.CREATED).send(config);
  }
});

const getExamAssignment = catchAsync(async (req, res) => {
  const configs = await examAssignmentService.getExamAssignments(req.params.patientId);
  if (!configs || configs.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cấu hình khám không tồn tại');
  }
  res.send(configs);
});

const getPatientByUserId = catchAsync(async (req, res) => {
  const patient = await patientService.getPatientByUserId(req.params.userId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }
  res.send(patient);
});

const getMyPatients = catchAsync(async (req, res) => {
  const filter = pick(req.query, filterKeys);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Tìm doctor record từ userId để lấy doctorId
  const doctor = await doctorService.getDoctorByUserId(req.user.id);

  if (!doctor) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is not a doctor');
  }

  // Add doctor filter
  filter.doctorId = doctor.id;

  const result = await patientService.queryPatients(filter, options);
  res.send(result);
});

const updateMedicalRecord = catchAsync(async (req, res) => {
  // SECURITY: Verify patient belongs to user's center before updating medical record
  const patient = await patientService.getPatientById(req.params.patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
  }
  if (patient.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this medical record');
  }

  const updated = await patientService.updateMedicalRecord(req.params.patientId, req.body);
  res.send(updated);
});

module.exports = {
  createPatient,
  getPatients,
  getPatient,
  updatePatient,
  pausePatientTreatment,
  resumePatientTreatment,
  deletePatient,
  deletePatients,
  createOrUpdateExamAssignment,
  getExamAssignment,
  getPatientByUserId,
  getMyPatients,
  updateMedicalRecord,
};
