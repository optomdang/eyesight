import * as Yup from 'yup';
import * as common from './common';

export const roleSchema = Yup.object({
  name: common.name('Tên vai trò'),
  code: common.code('Mã vai trò'),
  rights: Yup.array().of(Yup.string()).optional().default([]),
});

export type RoleFormData = Yup.InferType<typeof roleSchema>;
