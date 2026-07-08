import * as Yup from 'yup';
import * as common from './common';

export const centerSchema = Yup.object({
  id: Yup.number().optional(),
  name: common.name('Tên trung tâm'),
  code: common.code('Mã trung tâm'),
  phoneNumber: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  address: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  logo: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  option: Yup.object().optional(),
});

export type CenterFormData = Yup.InferType<typeof centerSchema>;
