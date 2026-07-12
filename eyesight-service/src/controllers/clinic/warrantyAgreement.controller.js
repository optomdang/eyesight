const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { patientService } = require('../../services');
const auditLogService = require('../../services/system/auditLog.service');
const warrantyAgreementService = require('../../services/clinic/warrantyAgreement.service');

const sendPdf = (res, { buffer, filename }) => {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length,
  });
  res.send(buffer);
};

const getMyAgreement = catchAsync(async (req, res) => {
  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy hồ sơ bệnh nhân');
  }
  const agreement = await warrantyAgreementService.getAgreementByPatientId(patient.id, req.user);
  res.send(agreement);
});

const getPatientAgreement = catchAsync(async (req, res) => {
  const agreement = await warrantyAgreementService.getAgreementByPatientId(
    Number(req.params.patientId),
    req.user
  );
  res.send(agreement);
});

const createPatientAgreement = catchAsync(async (req, res) => {
  const requestContext = auditLogService.buildRequestContext(req);
  const agreement = await warrantyAgreementService.createAgreementForPatient(
    Number(req.params.patientId),
    req.body,
    req.user,
    requestContext
  );
  res.status(httpStatus.CREATED).send(agreement);
});

const createAgreementPhase = catchAsync(async (req, res) => {
  const requestContext = auditLogService.buildRequestContext(req);
  const agreement = await warrantyAgreementService.createPhase(
    Number(req.params.agreementId),
    req.body,
    req.user,
    requestContext
  );
  res.status(httpStatus.CREATED).send(agreement);
});

const updateAgreementPhaseClinicalData = catchAsync(async (req, res) => {
  const requestContext = auditLogService.buildRequestContext(req);
  const agreement = await warrantyAgreementService.updatePhaseClinicalData(
    Number(req.params.agreementId),
    Number(req.params.phaseId),
    req.body,
    req.user,
    requestContext
  );
  res.send(agreement);
});

const signAgreementPhase = catchAsync(async (req, res) => {
  const requestContext = auditLogService.buildRequestContext(req);
  const agreement = await warrantyAgreementService.signPhase(
    Number(req.params.agreementId),
    Number(req.params.phaseId),
    req.body,
    req.user,
    requestContext
  );
  res.send(agreement);
});

const downloadAgreementPhasePdf = catchAsync(async (req, res) => {
  const requestContext = auditLogService.buildRequestContext(req);
  const pdf = await warrantyAgreementService.downloadPhasePdf(
    Number(req.params.agreementId),
    Number(req.params.phaseId),
    req.user,
    requestContext
  );
  sendPdf(res, pdf);
});

const downloadAgreementAggregatePdf = catchAsync(async (req, res) => {
  const requestContext = auditLogService.buildRequestContext(req);
  const pdf = await warrantyAgreementService.downloadAggregatePdf(
    Number(req.params.agreementId),
    req.user,
    requestContext
  );
  sendPdf(res, pdf);
});

const generateSignToken = catchAsync(async (req, res) => {
  const result = await warrantyAgreementService.generateSignToken(
    Number(req.params.agreementId),
    Number(req.params.phaseId),
    req.user
  );
  res.send(result);
});

const getSignData = catchAsync(async (req, res) => {
  const data = await warrantyAgreementService.getPhaseBySignToken(req.params.token);
  res.send(data);
});

const submitSignature = catchAsync(async (req, res) => {
  const requestContext = auditLogService.buildRequestContext(req);
  const agreement = await warrantyAgreementService.signPhaseByToken(
    req.params.token,
    req.body,
    requestContext
  );
  res.send(agreement);
});

const downloadPdfByToken = catchAsync(async (req, res) => {
  const requestContext = auditLogService.buildRequestContext(req);
  const pdf = await warrantyAgreementService.downloadPhasePdfBySignToken(
    req.params.token,
    requestContext
  );
  sendPdf(res, pdf);
});

module.exports = {
  getMyAgreement,
  getPatientAgreement,
  createPatientAgreement,
  createAgreementPhase,
  updateAgreementPhaseClinicalData,
  signAgreementPhase,
  downloadAgreementPhasePdf,
  downloadAgreementAggregatePdf,
  generateSignToken,
  getSignData,
  submitSignature,
  downloadPdfByToken,
};
