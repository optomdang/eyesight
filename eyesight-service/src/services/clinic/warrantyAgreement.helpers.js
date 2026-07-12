const crypto = require('crypto');
const warrantyConfig = require('../../config/warranty');
const { EXAM_TYPES } = require('../../config/warranty');

const PHASE_STATUSES = {
  DRAFT: 'draft',
  AWAITING_GUARDIAN: 'awaiting_guardian',
  AWAITING_DOCTOR: 'awaiting_doctor',
  COMPLETED: 'completed',
};

const computeDocumentHash = (snapshot) =>
  crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');

const buildClinicalDataFromPatient = (patient) => {
  const clinicalData = { examResults: {}, compliance: {} };
  const examResults = patient.examResults || {};

  for (const examType of EXAM_TYPES) {
    const examResult = examResults[examType];
    if (examResult) {
      clinicalData.examResults[examType] = {
        initial: examResult.initialResult || undefined,
        current: examResult.currentResult || undefined,
        lastExamDate: examResult.lastExamDate || null,
      };
    }
  }

  return clinicalData;
};

const buildPatientSnapshot = (patient) => {
  const user = patient.user || {};
  return {
    id: patient.id,
    code: patient.code,
    name: user.name || null,
    userId: patient.userId,
    doctorId: patient.doctorId,
    centerId: patient.centerId,
    treatmentStatus: patient.treatmentStatus,
    activeFrom: patient.activeFrom,
    activeTo: patient.activeTo,
  };
};

const buildPackageSnapshot = (activePackage) => {
  const pkg = activePackage.treatmentPackage;
  const assignment = activePackage.assignment;
  return {
    id: pkg.id,
    code: pkg.code,
    name: pkg.name,
    durationDays: pkg.durationDays,
    includesRefundGuarantee: Boolean(pkg.includesRefundGuarantee),
    assignedAt: assignment.assignedAt,
    expiresAt: assignment.expiresAt,
  };
};

const deriveAgreementStatus = (phases) => {
  if (!phases.length) return PHASE_STATUSES.DRAFT;
  if (phases.every((p) => p.status === PHASE_STATUSES.COMPLETED)) {
    return PHASE_STATUSES.COMPLETED;
  }
  if (phases.some((p) => p.status === PHASE_STATUSES.AWAITING_GUARDIAN)) {
    return PHASE_STATUSES.AWAITING_GUARDIAN;
  }
  if (phases.some((p) => p.status === PHASE_STATUSES.AWAITING_DOCTOR)) {
    return PHASE_STATUSES.AWAITING_DOCTOR;
  }
  return PHASE_STATUSES.DRAFT;
};

const getLastCompletedPhase = (phases) =>
  [...phases].reverse().find((p) => p.status === PHASE_STATUSES.COMPLETED);

const isReexamWithinSixMonths = (phases) => {
  const lastCompleted = getLastCompletedPhase(phases);
  if (!lastCompleted?.completedAt) return false;
  const completedAt = new Date(lastCompleted.completedAt).getTime();
  return Date.now() - completedAt < warrantyConfig.reexamMinIntervalMs;
};

const getNextPhaseNumber = (phases) => {
  if (!phases.length) return 1;
  return Math.max(...phases.map((p) => p.phaseNumber)) + 1;
};

const buildDocumentSnapshot = (phase, agreement) => ({
  agreementId: agreement.id,
  patientId: agreement.patientId,
  policyVersion: agreement.policyVersion,
  phaseId: phase.id,
  phaseType: phase.phaseType,
  phaseNumber: phase.phaseNumber,
  clinicalData: phase.clinicalData,
  guardianSignature: phase.guardianSignature,
  doctorSignature: phase.doctorSignature,
  completedAt: phase.completedAt,
});

module.exports = {
  PHASE_STATUSES,
  computeDocumentHash,
  buildClinicalDataFromPatient,
  buildPatientSnapshot,
  buildPackageSnapshot,
  deriveAgreementStatus,
  getLastCompletedPhase,
  isReexamWithinSixMonths,
  getNextPhaseNumber,
  buildDocumentSnapshot,
};
