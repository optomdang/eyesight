import * as Yup from 'yup';

export const profileSchema = Yup.object().shape({
  name: Yup.string()
    .min(3, 'Tên phải có ít nhất 3 ký tự')
    .max(255, 'Tên quá dài')
    .required('Tên là bắt buộc'),
  email: Yup.string().email('Email không hợp lệ').required('Email là bắt buộc'),
  phoneNumber: Yup.string()
    .matches(/^0\d{9}$/, 'Số điện thoại phải có 10 chữ số và bắt đầu bằng 0')
    .required('Số điện thoại là bắt buộc'),
  dateOfBirth: Yup.string().nullable(),
  gender: Yup.string().oneOf(['male', 'female', 'other'], 'Giới tính không hợp lệ').nullable(),
  zaloUserId: Yup.string().nullable(),
  zaloPhoneNumber: Yup.string()
    .nullable()
    .test(
      'valid-phone',
      'Số điện thoại Zalo phải có 10 chữ số và bắt đầu bằng 0',
      function (value) {
        if (!value || value === '') return true; // Allow empty
        return /^0\d{9}$/.test(value);
      }
    ),
  address: Yup.object().shape({
    specificAddress: Yup.string().nullable(),
    ward: Yup.string().nullable(),
    district: Yup.string().nullable(),
    province: Yup.string().nullable(),
    country: Yup.string().nullable(),
  }),
  avatar: Yup.string().nullable(),
});

export type ProfileFormData = Yup.InferType<typeof profileSchema>;
