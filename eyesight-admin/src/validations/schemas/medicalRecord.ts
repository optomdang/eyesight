import * as Yup from 'yup';

export const medicalRecordSchema = Yup.object({
  medicalHistory: Yup.string().max(50000, 'Bệnh sử không được vượt quá 50,000 ký tự'),
  additionalNotes: Yup.string().max(10000, 'Ghi chú không được vượt quá 10,000 ký tự'),
});

export type MedicalRecordFormData = Yup.InferType<typeof medicalRecordSchema>;
