import * as Yup from 'yup';
import * as common from './common';

export const treatmentPackageSchema = Yup.object({
  name: common.name('Tên gói'),
  code: common.code('Mã gói'),
  durationDays: Yup.number()
    .integer('Thời gian sử dụng phải là số nguyên')
    .min(1, 'Thời gian sử dụng tối thiểu 1 ngày')
    .max(3650, 'Thời gian sử dụng tối đa 3650 ngày')
    .required('Thời gian sử dụng là bắt buộc'),
  exerciseConfigIds: Yup.array().of(Yup.number().integer().positive()).default([]),
});

export type TreatmentPackageFormData = Yup.InferType<typeof treatmentPackageSchema>;
