// Validation error messages in Vietnamese
export const messages = {
  required: (field: string) => `${field} là bắt buộc`,
  email: 'Email không hợp lệ',
  phone: 'Số điện thoại không hợp lệ',
  minLength: (field: string, min: number) => `${field} phải có ít nhất ${min} ký tự`,
  maxLength: (field: string, max: number) => `${field} không được vượt quá ${max} ký tự`,
  min: (field: string, min: number) => `${field} phải lớn hơn hoặc bằng ${min}`,
  max: (field: string, max: number) => `${field} phải nhỏ hơn hoặc bằng ${max}`,
  positive: (field: string) => `${field} phải là số dương`,
  integer: (field: string) => `${field} phải là số nguyên`,
};
