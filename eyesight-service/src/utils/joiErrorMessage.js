/**
 * Translate Joi validation detail messages to user-facing Vietnamese.
 */

const FIELD_LABELS_VI = {
  email: 'Email',
  password: 'Mật khẩu',
  name: 'Họ và tên',
  phoneNumber: 'Số điện thoại',
  gender: 'Giới tính',
  dateOfBirth: 'Ngày sinh',
  centerId: 'Trung tâm',
  defaultClinicId: 'Phòng khám mặc định',
  userType: 'Loại người dùng',
  roleId: 'Vai trò',
  'patient.code': 'Mã bệnh nhân',
  'patient.doctorId': 'Bác sĩ phụ trách',
  'patient.severityLevel': 'Mức độ nghiêm trọng',
  'patient.treatmentStatus': 'Trạng thái điều trị',
  'doctor.code': 'Mã bác sĩ',
  'doctor.specialization': 'Chuyên khoa',
};

const fieldLabel = (key) => FIELD_LABELS_VI[key] || key;

const translateJoiDetail = (message) => {
  if (!message || typeof message !== 'string') return message;

  if (message === 'password must be at least 8 characters' || message === '"password" must be at least 8 characters') {
    return 'Mật khẩu phải có ít nhất 8 ký tự.';
  }
  if (
    message === 'password must contain at least 1 letter and 1 number' ||
    message === '"password" must contain at least 1 letter and 1 number'
  ) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số.';
  }

  const oneOfMatch = message.match(/^"([^"]+)" must be one of \[(.+)\]$/);
  if (oneOfMatch) {
    return `${fieldLabel(oneOfMatch[1])} không hợp lệ. Giá trị cho phép: ${oneOfMatch[2]}.`;
  }

  const requiredMatch = message.match(/^"([^"]+)" is required$/);
  if (requiredMatch) {
    return `${fieldLabel(requiredMatch[1])} là bắt buộc.`;
  }

  const mustBeMatch = message.match(/^"([^"]+)" must be (.+)$/);
  if (mustBeMatch) {
    return `${fieldLabel(mustBeMatch[1])} phải ${mustBeMatch[2]}.`;
  }

  const emailMatch = message.match(/^"([^"]+)" must be a valid email$/);
  if (emailMatch) {
    return `${fieldLabel(emailMatch[1])} không đúng định dạng email.`;
  }

  if (message.includes('is not allowed')) {
    const fieldMatch = message.match(/"([^"]+)" is not allowed/);
    if (fieldMatch) {
      return `Trường "${fieldLabel(fieldMatch[1])}" không được phép gửi lên server.`;
    }
    return 'Có trường dữ liệu không hợp lệ trong form.';
  }

  return message;
};

/**
 * @param {string} message - Single or comma-joined Joi error message(s)
 * @returns {string}
 */
const translateJoiValidationMessage = (message) => {
  if (!message || typeof message !== 'string') return message;
  if (message === 'Validation error') {
    return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường trong form.';
  }

  if (message.includes('"') && (message.includes(' must ') || message.includes(' is required'))) {
    return message
      .split(', ')
      .map(translateJoiDetail)
      .join('; ');
  }

  return message;
};

module.exports = {
  translateJoiValidationMessage,
  translateJoiDetail,
};
