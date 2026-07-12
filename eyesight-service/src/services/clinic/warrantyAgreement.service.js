const httpStatus = require('http-status');
const { Op } = require('sequelize');
const ApiError = require('../../utils/ApiError');
const warrantyConfig = require('../../config/warranty');
const { validateSignaturePayload, buildSignatureRecord } = require('../../utils/signatureValidation');
const auditLogService = require('../system/auditLog.service');
const treatmentPackageService = require('../exercise/treatmentPackage.service');
const {
  WarrantyAgreement,
  WarrantyAgreementPhase,
  Patient,
  User,
} = require('../../models');
const { createWarrantyPdfDocument } = require('../../templates/warranty/WarrantyPdfDocument');
const { getWarrantyPdfFontFamily } = require('../../templates/warranty/fonts');
const {
  PHASE_STATUSES,
  computeDocumentHash,
  buildClinicalDataFromPatient,
  buildPatientSnapshot,
  buildPackageSnapshot,
  deriveAgreementStatus,
  isReexamWithinSixMonths,
  getNextPhaseNumber,
  buildDocumentSnapshot,
} = require('./warrantyAgreement.helpers');

const sanitizeSignatureForResponse = (signature) => {
  if (!signature) return null;
  return {
    signerName: signature.signerName,
    signerRelation: signature.signerRelation || null,
    signedAt: signature.signedAt,
    signatureHash: signature.signatureHash || null,
  };
};

const sanitizePhaseForResponse = (phase) => {
  const json = phase.toJSON ? phase.toJSON() : phase;
  return {
    id: json.id,
    agreementId: json.agreementId,
    phaseType: json.phaseType,
    phaseNumber: json.phaseNumber,
    status: json.status,
    clinicalData: json.clinicalData || {},
    guardianSignature: sanitizeSignatureForResponse(json.guardianSignature),
    doctorSignature: sanitizeSignatureForResponse(json.doctorSignature),
    completedAt: json.completedAt || null,
    documentHash: json.documentHash || null,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
};

const sanitizeAgreementForResponse = (agreement, phases) => ({
  id: agreement.id,
  patientId: agreement.patientId,
  doctorId: agreement.doctorId,
  policyVersion: agreement.policyVersion,
  status: agreement.status,
  packageSnapshot: agreement.packageSnapshot || {},
  patientSnapshot: agreement.patientSnapshot || {},
  phases: (phases || []).map(sanitizePhaseForResponse),
  createdAt: agreement.createdAt,
  updatedAt: agreement.updatedAt,
});

const loadPatientOrThrow = async (patientId) => {
  const patient = await Patient.findByPk(patientId, {
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
  });
  if (!patient || patient.deleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }
  return patient;
};

const assertStaffPatientAccess = (user, patient) => {
  if (patient.centerId !== user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền truy cập bệnh nhân này');
  }
  if (user.userType === 'doctor') {
    if (!user.doctor?.id || patient.doctorId !== user.doctor.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Bác sĩ chỉ truy cập bệnh nhân được gán');
    }
  }
};

const assertPatientSelfAccess = (user, patient) => {
  if (user.userType !== 'patient') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ bệnh nhân mới truy cập hồ sơ của mình');
  }
  if (!patient.userId || patient.userId !== user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền truy cập hồ sơ này');
  }
};

const loadAgreementWithPhases = async (agreementId) => {
  const agreement = await WarrantyAgreement.findOne({
    where: { id: agreementId, deleted: false },
  });
  if (!agreement) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cam kết bảo hành không tồn tại');
  }
  const phases = await WarrantyAgreementPhase.findAll({
    where: { agreementId },
    order: [['phaseNumber', 'ASC'], ['id', 'ASC']],
  });
  return { agreement, phases };
};

const assertAgreementCenterAccess = (user, agreement, patient) => {
  if (agreement.centerId !== user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền truy cập cam kết này');
  }
  if (user.userType === 'patient') {
    assertPatientSelfAccess(user, patient);
    return;
  }
  assertStaffPatientAccess(user, patient);
};

const getActiveRefundGuaranteePackage = async (patientId) => {
  const active = await treatmentPackageService.getActivePatientPackage(patientId);
  if (!active?.treatmentPackage?.includesRefundGuarantee) {
    return null;
  }
  return active;
};

const renderPdfBuffer = async ({ agreement, phases, singlePhase = null }) => {
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const fontFamily = await getWarrantyPdfFontFamily();
  const element = await createWarrantyPdfDocument({
    fontFamily,
    agreement: agreement.toJSON ? agreement.toJSON() : agreement,
    phases: phases.map((p) => (p.toJSON ? p.toJSON() : p)),
    singlePhase: singlePhase ? (singlePhase.toJSON ? singlePhase.toJSON() : singlePhase) : null,
  });
  return renderToBuffer(element);
};

const validatePhaseTypeCreation = (phaseType, phases, agreement) => {
  if (agreement.status === PHASE_STATUSES.COMPLETED) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cam kết đã hoàn tất, không thể thêm giai đoạn');
  }

  const hasIncomplete = phases.some((p) => p.status !== PHASE_STATUSES.COMPLETED);
  if (hasIncomplete) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Còn giai đoạn chưa hoàn tất');
  }

  if (phaseType === 'reexam') {
    const hasInitial = phases.some(
      (p) => p.phaseType === 'initial' && p.status === PHASE_STATUSES.COMPLETED
    );
    if (!hasInitial) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Phải hoàn tất giai đoạn ban đầu trước khi tạo tái khám');
    }
    const hasFinal = phases.some((p) => p.phaseType === 'final');
    if (hasFinal) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Đã có giai đoạn kết thúc');
    }
    return;
  }

  if (phaseType === 'final') {
    const hasInitial = phases.some(
      (p) => p.phaseType === 'initial' && p.status === PHASE_STATUSES.COMPLETED
    );
    if (!hasInitial) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Phải hoàn tất giai đoạn ban đầu trước khi tạo kết thúc');
    }
    const hasFinal = phases.some((p) => p.phaseType === 'final');
    if (hasFinal) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Giai đoạn kết thúc đã tồn tại');
    }
  }
};

const syncAgreementStatus = async (agreement, phases) => {
  const status = deriveAgreementStatus(phases);
  if (agreement.status !== status) {
    await agreement.update({ status });
  }
};

const logWarrantyAudit = async ({ user, action, entityId, centerId, metadata, requestContext }) =>
  auditLogService.logEntityAuditEvent({
    user,
    action,
    entityType: 'warrantyAgreement',
    entityId,
    centerId,
    metadata,
    requestContext,
  });

const getAgreementByPatientId = async (patientId, user) => {
  const patient = await loadPatientOrThrow(patientId);
  if (user.userType === 'patient') {
    assertPatientSelfAccess(user, patient);
  } else {
    assertStaffPatientAccess(user, patient);
  }

  const agreement = await WarrantyAgreement.findOne({
    where: { patientId, centerId: patient.centerId, deleted: false },
    order: [['createdAt', 'DESC']],
  });

  if (!agreement) {
    return null;
  }

  const phases = await WarrantyAgreementPhase.findAll({
    where: { agreementId: agreement.id },
    order: [['phaseNumber', 'ASC'], ['id', 'ASC']],
  });

  return sanitizeAgreementForResponse(agreement, phases);
};

const createAgreementForPatient = async (patientId, body, user, requestContext) => {
  const patient = await loadPatientOrThrow(patientId);
  assertStaffPatientAccess(user, patient);

  const existing = await WarrantyAgreement.findOne({
    where: {
      patientId,
      centerId: patient.centerId,
      deleted: false,
      status: { [Op.ne]: PHASE_STATUSES.COMPLETED },
    },
  });
  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, 'Bệnh nhân đã có cam kết bảo hành đang hoạt động');
  }

  const activePackage = await getActiveRefundGuaranteePackage(patientId);
  if (!activePackage) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Bệnh nhân cần gói Ultra/Ultimate có cam kết hoàn tiền đang hoạt động'
    );
  }

  if (!patient.doctorId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Bệnh nhân chưa được gán bác sĩ phụ trách');
  }

  const clinicalData = body.clinicalData || buildClinicalDataFromPatient(patient);

  const agreement = await WarrantyAgreement.create({
    patientId,
    doctorId: patient.doctorId,
    centerId: patient.centerId,
    policyVersion: warrantyConfig.policyVersion,
    status: PHASE_STATUSES.AWAITING_GUARDIAN,
    packageSnapshot: buildPackageSnapshot(activePackage),
    patientSnapshot: buildPatientSnapshot(patient),
  });

  const initialPhase = await WarrantyAgreementPhase.create({
    agreementId: agreement.id,
    phaseType: 'initial',
    phaseNumber: 1,
    status: PHASE_STATUSES.AWAITING_GUARDIAN,
    clinicalData,
  });

  await logWarrantyAudit({
    user,
    action: 'warrantyAgreement.create',
    entityId: agreement.id,
    centerId: patient.centerId,
    metadata: { patientId, phaseId: initialPhase.id, phaseType: 'initial' },
    requestContext,
  });

  return sanitizeAgreementForResponse(agreement, [initialPhase]);
};

const createPhase = async (agreementId, body, user, requestContext) => {
  const { agreement, phases } = await loadAgreementWithPhases(agreementId);
  const patient = await loadPatientOrThrow(agreement.patientId);
  assertStaffPatientAccess(user, patient);

  const { phaseType, clinicalData, reexamEarlyOverrideReason } = body;
  validatePhaseTypeCreation(phaseType, phases, agreement);

  const mergedClinicalData = { ...(clinicalData || {}) };
  if (phaseType === 'reexam' && isReexamWithinSixMonths(phases)) {
    const reason = reexamEarlyOverrideReason || mergedClinicalData.reexamEarlyOverrideReason;
    if (!reason || !String(reason).trim()) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Tái khám sớm hơn ${warrantyConfig.reexamMinIntervalMonths} tháng cần ghi rõ lý do`
      );
    }
    mergedClinicalData.reexamEarlyOverrideReason = String(reason).trim();
  }

  const phase = await WarrantyAgreementPhase.create({
    agreementId: agreement.id,
    phaseType,
    phaseNumber: getNextPhaseNumber(phases),
    status: PHASE_STATUSES.AWAITING_GUARDIAN,
    clinicalData: mergedClinicalData,
  });

  const allPhases = [...phases, phase];
  await syncAgreementStatus(agreement, allPhases);

  await logWarrantyAudit({
    user,
    action: 'warrantyAgreement.phase.create',
    entityId: agreement.id,
    centerId: agreement.centerId,
    metadata: { patientId: agreement.patientId, phaseId: phase.id, phaseType },
    requestContext,
  });

  const refreshedAgreement = await WarrantyAgreement.findByPk(agreement.id);
  return sanitizeAgreementForResponse(refreshedAgreement, allPhases);
};

const updatePhaseClinicalData = async (agreementId, phaseId, body, user, requestContext) => {
  const { agreement, phases } = await loadAgreementWithPhases(agreementId);
  const patient = await loadPatientOrThrow(agreement.patientId);
  assertStaffPatientAccess(user, patient);

  const phase = phases.find((p) => p.id === Number(phaseId));
  if (!phase) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Giai đoạn không tồn tại');
  }
  if (phase.status === PHASE_STATUSES.COMPLETED) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Giai đoạn đã hoàn tất, không thể chỉnh sửa');
  }
  if (phase.status === PHASE_STATUSES.AWAITING_DOCTOR) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Không thể cập nhật dữ liệu khi đang chờ bác sĩ ký');
  }

  await phase.update({
    clinicalData: body.clinicalData,
  });

  await logWarrantyAudit({
    user,
    action: 'warrantyAgreement.phase.updateClinicalData',
    entityId: agreement.id,
    centerId: agreement.centerId,
    metadata: { patientId: agreement.patientId, phaseId: phase.id },
    requestContext,
  });

  const refreshedPhases = phases.map((p) => (p.id === phase.id ? phase : p));
  return sanitizeAgreementForResponse(agreement, refreshedPhases);
};

const signPhase = async (agreementId, phaseId, body, user, requestContext) => {
  const { agreement, phases } = await loadAgreementWithPhases(agreementId);
  const patient = await loadPatientOrThrow(agreement.patientId);
  assertAgreementCenterAccess(user, agreement, patient);

  const phase = phases.find((p) => p.id === Number(phaseId));
  if (!phase) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Giai đoạn không tồn tại');
  }

  let validated;
  try {
    validated = validateSignaturePayload(body);
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }

  let signerRole;

  if (phase.status === PHASE_STATUSES.AWAITING_GUARDIAN) {
    signerRole = 'guardian';
    if (user.userType !== 'patient') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ người giám hộ/bệnh nhân mới ký ở bước này');
    }
    assertPatientSelfAccess(user, patient);

    await phase.update({
      guardianSignature: buildSignatureRecord(validated, user, requestContext),
      status: PHASE_STATUSES.AWAITING_DOCTOR,
    });
  } else if (phase.status === PHASE_STATUSES.AWAITING_DOCTOR) {
    signerRole = 'doctor';
    if (user.userType !== 'doctor' && user.userType !== 'admin') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ bác sĩ phụ trách mới ký ở bước này');
    }
    if (user.userType === 'doctor') {
      assertStaffPatientAccess(user, patient);
    }

    const doctorSignature = buildSignatureRecord(validated, user, requestContext);
    const completedAt = new Date();
    const phaseJson = {
      ...phase.toJSON(),
      doctorSignature,
      completedAt: completedAt.toISOString(),
    };
    const documentHash = computeDocumentHash(buildDocumentSnapshot(phaseJson, agreement));

    await phase.update({
      doctorSignature,
      documentHash,
      status: PHASE_STATUSES.COMPLETED,
      completedAt,
    });

    await logWarrantyAudit({
      user,
      action: 'warrantyAgreement.phase.complete',
      entityId: agreement.id,
      centerId: agreement.centerId,
      metadata: {
        patientId: agreement.patientId,
        phaseId: phase.id,
        phaseType: phase.phaseType,
        documentHash,
      },
      requestContext,
    });
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Giai đoạn không ở trạng thái chờ ký');
  }

  await logWarrantyAudit({
    user,
    action: 'warrantyAgreement.phase.sign',
    entityId: agreement.id,
    centerId: agreement.centerId,
    metadata: {
      patientId: agreement.patientId,
      phaseId: phase.id,
      signerRole,
    },
    requestContext,
  });

  await phase.reload();
  const refreshedPhases = await WarrantyAgreementPhase.findAll({
    where: { agreementId: agreement.id },
    order: [['phaseNumber', 'ASC'], ['id', 'ASC']],
  });
  await syncAgreementStatus(agreement, refreshedPhases);
  const refreshedAgreement = await WarrantyAgreement.findByPk(agreement.id);

  return sanitizeAgreementForResponse(refreshedAgreement, refreshedPhases);
};

const downloadPhasePdf = async (agreementId, phaseId, user, requestContext) => {
  const { agreement, phases } = await loadAgreementWithPhases(agreementId);
  const patient = await loadPatientOrThrow(agreement.patientId);
  assertAgreementCenterAccess(user, agreement, patient);

  const phase = phases.find((p) => p.id === Number(phaseId));
  if (!phase) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Giai đoạn không tồn tại');
  }

  const buffer = await renderPdfBuffer({ agreement, phases, singlePhase: phase });

  await logWarrantyAudit({
    user,
    action: 'warrantyAgreement.download',
    entityId: agreement.id,
    centerId: agreement.centerId,
    metadata: { patientId: agreement.patientId, phaseId: phase.id, scope: 'phase' },
    requestContext,
  });

  return {
    buffer,
    filename: `warranty-${agreement.patientId}-phase-${phase.phaseNumber}.pdf`,
  };
};

const downloadAggregatePdf = async (agreementId, user, requestContext) => {
  const { agreement, phases } = await loadAgreementWithPhases(agreementId);
  const patient = await loadPatientOrThrow(agreement.patientId);
  assertAgreementCenterAccess(user, agreement, patient);

  if (!phases.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cam kết chưa có giai đoạn nào');
  }

  const buffer = await renderPdfBuffer({ agreement, phases });

  await logWarrantyAudit({
    user,
    action: 'warrantyAgreement.download',
    entityId: agreement.id,
    centerId: agreement.centerId,
    metadata: { patientId: agreement.patientId, scope: 'aggregate' },
    requestContext,
  });

  return {
    buffer,
    filename: `warranty-${agreement.patientId}-full.pdf`,
  };
};

module.exports = {
  sanitizePhaseForResponse,
  sanitizeAgreementForResponse,
  getAgreementByPatientId,
  createAgreementForPatient,
  createPhase,
  updatePhaseClinicalData,
  signPhase,
  downloadPhasePdf,
  downloadAggregatePdf,
};
