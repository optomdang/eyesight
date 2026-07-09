const {
  translateJoiValidationMessage,
  translateJoiDetail,
} = require('../../../src/utils/joiErrorMessage');

describe('joiErrorMessage', () => {
  test('translates severityLevel oneOf error', () => {
    const msg = '"patient.severityLevel" must be one of [normal, mild, moderate, severe]';
    expect(translateJoiDetail(msg)).toBe(
      'Mức độ nghiêm trọng không hợp lệ. Giá trị cho phép: normal, mild, moderate, severe.'
    );
  });

  test('translates password complexity error', () => {
    expect(translateJoiDetail('password must contain at least 1 letter and 1 number')).toBe(
      'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số.'
    );
  });

  test('translates multiple Joi errors joined by comma', () => {
    const msg = '"email" is required, "password" must be at least 8 characters';
    expect(translateJoiValidationMessage(msg)).toBe(
      'Email là bắt buộc.; Mật khẩu phải có ít nhất 8 ký tự.'
    );
  });
});
