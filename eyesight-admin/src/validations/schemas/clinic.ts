import * as Yup from 'yup';
import * as common from './common';

export const clinicSchema = Yup.object({
  id: Yup.number().optional(),
  name: common.name('Tên phòng khám'),
  code: common.code('Mã phòng khám'),
  phoneNumber: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  address: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
});

export type ClinicFormData = Yup.InferType<typeof clinicSchema>;
