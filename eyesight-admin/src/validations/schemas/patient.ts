import * as Yup from 'yup';
import * as common from './common';

export const patientSchema = Yup.object({
  code: common.code('Mã bệnh nhân'),
  userId: common.positiveInteger('Tài khoản'),
  gender: Yup.string()
    .oneOf(['male', 'female', 'other'], 'Giới tính không hợp lệ')
    .optional()
    .nullable(),
  dateOfBirth: Yup.date().optional().nullable(),
  address: common.optionalString.optional(),
  note: common.optionalString.optional(),
});

export type PatientFormData = Yup.InferType<typeof patientSchema>;
