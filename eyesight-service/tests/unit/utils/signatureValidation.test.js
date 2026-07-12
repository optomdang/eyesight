const {
  validateSignatureDataUrl,
  validateSignaturePayload,
  estimateBase64Bytes,
} = require('../../../src/utils/signatureValidation');

const tinyPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('signatureValidation', () => {
  test('validateSignatureDataUrl accepts valid PNG data URL', () => {
    const result = validateSignatureDataUrl(tinyPng);
    expect(result.valid).toBe(true);
    expect(estimateBase64Bytes(tinyPng)).toBeGreaterThan(0);
  });

  test('validateSignatureDataUrl rejects invalid format', () => {
    const result = validateSignatureDataUrl('not-a-data-url');
    expect(result.valid).toBe(false);
  });

  test('validateSignaturePayload requires consent', () => {
    expect(() =>
      validateSignaturePayload({
        signatureDataUrl: tinyPng,
        signerName: 'Nguyen Van A',
        consentAccepted: false,
      })
    ).toThrow(/đồng ý/i);
  });

  test('validateSignaturePayload returns metadata fields without raw image', () => {
    const result = validateSignaturePayload({
      signatureDataUrl: tinyPng,
      signerName: 'Nguyen Van A',
      signerRelation: 'Cha/mẹ',
      consentAccepted: true,
    });
    expect(result.signerName).toBe('Nguyen Van A');
    expect(result.signerRelation).toBe('Cha/mẹ');
    expect(result.signatureHash).toHaveLength(64);
    expect(result.signatureDataUrl).toBeUndefined();
  });
});
