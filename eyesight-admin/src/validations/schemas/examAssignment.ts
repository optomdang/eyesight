import * as Yup from 'yup';

// Validation schema for individual exam config
export const examConfigSchema = Yup.object().shape({
  frequency: Yup.string()
    .required('Tần suất là bắt buộc')
    .oneOf(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], 'Tần suất không hợp lệ'),
  isEnabled: Yup.boolean(),
  notificationSettings: Yup.object().shape({
    enabled: Yup.boolean(),
    templateId: Yup.number().nullable(),
    beforeDays: Yup.number()
      .min(0, 'Số ngày nhắc trước không được âm')
      .max(30, 'Số ngày nhắc trước không được vượt quá 30'),
    time: Yup.string().matches(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Định dạng thời gian không hợp lệ (HH:mm)'
    ),
    methods: Yup.array().of(Yup.string()),
  }),
});

// Form data structure for all 4 exam types
export const examAssignmentFormSchema = Yup.object().shape({
  far: examConfigSchema,
  near: examConfigSchema,
  contrast: examConfigSchema,
  stereopsis: examConfigSchema,
});

export type ExamConfigFormData = Yup.InferType<typeof examConfigSchema>;
export type ExamAssignmentFormData = Yup.InferType<typeof examAssignmentFormSchema>;
