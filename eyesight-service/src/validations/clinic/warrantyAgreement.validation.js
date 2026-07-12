const Joi = require('joi');
const { standardId } = require('../../utils/validation');
const { SIGNATURE_DATA_URL_PATTERN } = require('../../utils/signatureValidation');

const eyeResultSchema = Joi.object().keys({
  leftEye: Joi.number().allow(null).optional(),
  rightEye: Joi.number().allow(null).optional(),
  bothEye: Joi.number().allow(null).optional(),
});

const examTypeClinicalSchema = Joi.object().keys({
  initial: eyeResultSchema.optional(),
  current: eyeResultSchema.optional(),
  lastExamDate: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow(null, '')).optional(),
});

const complianceClinicalSchema = Joi.object().keys({
  performanceRate: Joi.number().min(0).max(100).optional(),
  status: Joi.string().trim().max(50).optional(),
  completedExams: Joi.number().integer().min(0).optional(),
  requiredExams: Joi.number().integer().min(0).optional(),
  lastCalculatedAt: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow(null, '')).optional(),
});

const clinicalDataSchema = Joi.object()
  .keys({
    examResults: Joi.object()
      .keys({
        far: examTypeClinicalSchema.optional(),
        near: examTypeClinicalSchema.optional(),
        contrast: examTypeClinicalSchema.optional(),
        stereopsis: examTypeClinicalSchema.optional(),
      })
      .optional(),
    compliance: Joi.object()
      .keys({
        far: complianceClinicalSchema.optional(),
        near: complianceClinicalSchema.optional(),
        contrast: complianceClinicalSchema.optional(),
        stereopsis: complianceClinicalSchema.optional(),
      })
      .optional(),
    clinicalNotes: Joi.string().trim().max(5000).allow('', null).optional(),
    improvementObserved: Joi.boolean().allow(null).optional(),
    doctorConfirmation: Joi.string().trim().max(5000).allow('', null).optional(),
    reexamEarlyOverrideReason: Joi.string().trim().max(2000).allow('', null).optional(),
  })
  .default({});

const getMyAgreement = {
  query: Joi.object().keys({}).optional(),
};

const getPatientAgreement = {
  params: Joi.object().keys({
    patientId: standardId,
  }),
};

const createPatientAgreement = {
  params: Joi.object().keys({
    patientId: standardId,
  }),
  body: Joi.object().keys({
    clinicalData: clinicalDataSchema.optional(),
  }),
};

const createAgreementPhase = {
  params: Joi.object().keys({
    agreementId: standardId,
  }),
  body: Joi.object().keys({
    phaseType: Joi.string().valid('reexam', 'final').required(),
    clinicalData: clinicalDataSchema.required(),
    reexamEarlyOverrideReason: Joi.string().trim().max(2000).allow(null, '').optional(),
  }),
};

const updateAgreementPhaseClinicalData = {
  params: Joi.object().keys({
    agreementId: standardId,
    phaseId: standardId,
  }),
  body: Joi.object().keys({
    clinicalData: clinicalDataSchema.required(),
  }),
};

const signAgreementPhase = {
  params: Joi.object().keys({
    agreementId: standardId,
    phaseId: standardId,
  }),
  body: Joi.object().keys({
    signatureDataUrl: Joi.string()
      .pattern(SIGNATURE_DATA_URL_PATTERN)
      .required()
      .messages({ 'string.pattern.base': 'Chữ ký phải là ảnh PNG/JPEG/WebP dạng data URL hợp lệ' }),
    signerName: Joi.string().trim().min(2).max(255).required(),
    signerRelation: Joi.string().trim().max(100).allow(null, '').optional(),
    consentAccepted: Joi.boolean().valid(true).required(),
  }),
};

const downloadAgreementPhasePdf = {
  params: Joi.object().keys({
    agreementId: standardId,
    phaseId: standardId,
  }),
};

const downloadAgreementAggregatePdf = {
  params: Joi.object().keys({
    agreementId: standardId,
  }),
};

module.exports = {
  getMyAgreement,
  getPatientAgreement,
  createPatientAgreement,
  createAgreementPhase,
  updateAgreementPhaseClinicalData,
  signAgreementPhase,
  downloadAgreementPhasePdf,
  downloadAgreementAggregatePdf,
};
