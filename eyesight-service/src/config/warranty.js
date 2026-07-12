const WARRANTY_POLICY_VERSION = process.env.WARRANTY_POLICY_VERSION || '1.0';

const WARRANTY_AGREEMENT_STATUSES = ['draft', 'awaiting_guardian', 'awaiting_doctor', 'completed'];

const WARRANTY_PHASE_TYPES = ['initial', 'reexam', 'final'];

const WARRANTY_PHASE_STATUSES = ['draft', 'awaiting_guardian', 'awaiting_doctor', 'completed'];

/** ~6 months in milliseconds (30-day months, matches frontend) */
const REEXAM_MIN_INTERVAL_MS = 6 * 30 * 24 * 60 * 60 * 1000;

const EXAM_TYPES = ['far', 'near', 'contrast', 'stereopsis'];

const SIGNATURE_MAX_BYTES = 512 * 1024;

const SIGNATURE_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp);base64,/i;

const reexamMinIntervalMonths = Number(process.env.WARRANTY_REEXAM_MIN_INTERVAL_MONTHS || 6);

module.exports = {
  policyVersion: WARRANTY_POLICY_VERSION,
  WARRANTY_POLICY_VERSION,
  legalEntityName: process.env.WARRANTY_LEGAL_ENTITY_NAME || 'Công ty TNHH D-VisUp',
  legalAddress:
    process.env.WARRANTY_LEGAL_ADDRESS ||
    'Tầng 5, Tòa nhà ABC, Quận 1, TP. Hồ Chí Minh, Việt Nam',
  taxCode: process.env.WARRANTY_TAX_CODE || '',
  representativeName: process.env.WARRANTY_REPRESENTATIVE_NAME || 'Đại diện pháp luật D-VisUp',
  representativeHonorific: process.env.WARRANTY_REPRESENTATIVE_HONORIFIC || '',
  representativeCCCD: process.env.WARRANTY_REPRESENTATIVE_CCCD || '',
  representativeTitle: process.env.WARRANTY_REPRESENTATIVE_TITLE || 'Giám đốc',
  supportEmail: process.env.WARRANTY_SUPPORT_EMAIL || 'support@d-visup.com',
  supportZalo: process.env.WARRANTY_SUPPORT_ZALO || '',
  policyEffectiveDate: process.env.WARRANTY_POLICY_EFFECTIVE_DATE || '2026-07-11',
  WARRANTY_AGREEMENT_STATUSES,
  WARRANTY_PHASE_TYPES,
  WARRANTY_PHASE_STATUSES,
  REEXAM_MIN_INTERVAL_MS,
  reexamMinIntervalMonths,
  reexamMinIntervalMs: REEXAM_MIN_INTERVAL_MS,
  EXAM_TYPES,
  SIGNATURE_MAX_BYTES,
  signatureMaxBytes: SIGNATURE_MAX_BYTES,
  SIGNATURE_DATA_URL_PATTERN,
  signatureDataUrlPattern: SIGNATURE_DATA_URL_PATTERN,
};
