import * as Yup from 'yup';

const common = {
  name: (label: string) => Yup.string().required(`${label} là bắt buộc`),
  email: () =>
    Yup.string().required('Email là bắt buộc').email('Vui lòng nhập đúng định dạng email'),
  phoneNumber: () =>
    Yup.string()
      .required('Số điện thoại là bắt buộc')
      .matches(/^(84|0)((3|5|7|8|9)\d{8})\b/, 'Vui lòng nhập đúng định dạng SĐT'),
  optionalPhone: () =>
    Yup.string()
      .transform((value) => value || undefined)
      .matches(/^(84|0)((3|5|7|8|9)\d{8})\b/, 'Vui lòng nhập đúng định dạng SĐT')
      .optional(),
};

// Schema for doctor nested object
export const doctorObjectSchema = Yup.object({
  id: Yup.number().optional(),
  code: Yup.string().required('Mã bác sĩ là bắt buộc'),
  specialization: Yup.string().required('Chuyên khoa là bắt buộc'),
  licenseNumber: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  qualification: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  departmentId: Yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .optional(),
  treatedPatientsCount: Yup.number().optional(),
});

// Schema for patient nested object
export const patientObjectSchema = Yup.object({
  id: Yup.number().optional(),
  code: Yup.string().required('Mã bệnh nhân là bắt buộc'),
  doctorId: Yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .optional(),
  currentEyesight: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  severityLevel: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  severityNotes: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  treatmentStatus: Yup.boolean().optional(),
  activeFrom: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  activeTo: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
});

// Main user schema with nested objects
export const userSchema = Yup.object({
  id: Yup.number().optional(),
  userType: Yup.string().when('id', {
    is: (id: number | undefined) => !id,
    then: (schema) => schema.required('Vui lòng chọn loại người dùng'),
    otherwise: (schema) => schema.optional(),
  }),
  name: common.name('Tên người dùng'),
  email: common.email(),
  phoneNumber: common.phoneNumber(),
  password: Yup.string().when('id', {
    is: (id: number | undefined) => !id,
    then: (schema) =>
      schema.required('Mật khẩu là bắt buộc').min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    otherwise: (schema) => schema.optional(),
  }),
  changePassword: Yup.boolean().optional(),
  newPassword: Yup.string().when(['id', 'changePassword'], {
    is: (id: number | undefined, changePassword: boolean | undefined) => id && changePassword,
    then: (schema) =>
      schema.required('Mật khẩu mới là bắt buộc').min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    otherwise: (schema) => schema.optional(),
  }),
  confirmPassword: Yup.string().when(['id', 'changePassword'], {
    is: (id: number | undefined, changePassword: boolean | undefined) => id && changePassword,
    then: (schema) =>
      schema
        .required('Vui lòng xác nhận mật khẩu')
        .oneOf([Yup.ref('newPassword')], 'Mật khẩu xác nhận không khớp'),
    otherwise: (schema) => schema.optional(),
  }),
  active: Yup.boolean().optional(),
  dateOfBirth: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  gender: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  zaloUserId: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  zaloPhoneNumber: common.optionalPhone(),
  address: Yup.mixed().optional(),
  roleId: Yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .optional(),
  centerId: Yup.number().optional(),
  defaultClinicId: Yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .optional(),

  // Nested objects - will be validated conditionally based on userType
  doctor: Yup.object().when('userType', {
    is: (userType: string) => userType === 'doctor',
    then: () => doctorObjectSchema,
    otherwise: () => Yup.object().optional(),
  }),
  patient: Yup.object().when('userType', {
    is: (userType: string) => userType === 'patient',
    then: () => patientObjectSchema,
    otherwise: () => Yup.object().optional(),
  }),
});

export type UserFormData = Yup.InferType<typeof userSchema>;
