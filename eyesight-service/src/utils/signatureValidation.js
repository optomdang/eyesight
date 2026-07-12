const crypto = require('crypto');
const {
  SIGNATURE_MAX_BYTES,
  SIGNATURE_DATA_URL_PATTERN,
} = require('../config/warranty');

const estimateBase64Bytes = (dataUrl) => {
  const base64Data = dataUrl.split(',')[1] || '';
  return Math.ceil((base64Data.length * 3) / 4);
};

const extractMimeType = (dataUrl) => {
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,/i);
  return match ? match[1].toLowerCase() : null;
};

/**
 * Validate e-sign canvas data URL (PNG/JPEG/WebP).
 * @param {string} signatureDataUrl
 * @returns {{ valid: boolean, error?: string }}
 */
const validateSignatureDataUrl = (signatureDataUrl) => {
  if (!signatureDataUrl || typeof signatureDataUrl !== 'string') {
    return { valid: false, error: 'Chữ ký không hợp lệ' };
  }

  if (!SIGNATURE_DATA_URL_PATTERN.test(signatureDataUrl)) {
    return { valid: false, error: 'Định dạng chữ ký phải là ảnh PNG, JPEG hoặc WebP' };
  }

  const sizeInBytes = estimateBase64Bytes(signatureDataUrl);
  if (sizeInBytes > SIGNATURE_MAX_BYTES) {
    return { valid: false, error: 'Kích thước chữ ký vượt quá giới hạn cho phép' };
  }

  return { valid: true };
};

/**
 * Validate sign request body and return normalized payload for storage.
 * @param {{ signatureDataUrl: string, signerName: string, signerRelation?: string, consentAccepted?: boolean }} body
 */
const validateSignaturePayload = (body = {}) => {
  if (body.consentAccepted !== true) {
    throw new Error('Phải xác nhận đồng ý trước khi ký');
  }

  const validation = validateSignatureDataUrl(body.signatureDataUrl);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const signerName = String(body.signerName || '').trim();
  if (signerName.length < 2) {
    throw new Error('Họ tên người ký không hợp lệ');
  }

  const byteLength = estimateBase64Bytes(body.signatureDataUrl);
  const mimeType = extractMimeType(body.signatureDataUrl);
  const signatureHash = crypto.createHash('sha256').update(body.signatureDataUrl).digest('hex');

  return {
    signerName,
    signerRelation: body.signerRelation?.trim() || null,
    byteLength,
    mimeType,
    signatureHash,
  };
};

/**
 * Build stored signature metadata (no raw image bytes).
 */
const buildSignatureRecord = (validated, user = null, requestContext = {}) => ({
  signerName: validated.signerName,
  signerRelation: validated.signerRelation,
  signatureHash: validated.signatureHash,
  byteLength: validated.byteLength,
  mimeType: validated.mimeType,
  signedAt: new Date().toISOString(),
  signedByUserId: user?.id || null,
  ipAddress: requestContext.ipAddress || null,
  userAgent: requestContext.userAgent || null,
});

module.exports = {
  SIGNATURE_DATA_URL_PATTERN,
  estimateBase64Bytes,
  validateSignatureDataUrl,
  validateSignaturePayload,
  buildSignatureRecord,
};
