import * as Yup from 'yup';

export const doctorSchema = Yup.object({
  id: Yup.number().optional(),
  code: Yup.string().required('Mã bác sĩ là bắt buộc'),
  specialization: Yup.string().required('Chuyên khoa là bắt buộc'),
  licenseNumber: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  experience: Yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .min(0, 'Số năm kinh nghiệm phải >= 0')
    .optional(),
  qualification: Yup.string()
    .transform((value) => value || undefined)
    .optional(),
  clinicId: Yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .optional(),
  userId: Yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .optional(),
});

export type DoctorFormData = Yup.InferType<typeof doctorSchema>;
