import * as Yup from 'yup';

const VISION_LEVEL_MAX_BY_TYPE: Record<string, number> = {
  far: 20,
  near: 6,
  contrast: 16,
};

export const patientAssignmentFormSchema = Yup.object({
  exerciseId: Yup.number()
    .required('Bài tập là bắt buộc')
    .transform((value, originalValue) => (originalValue === '' ? undefined : value)),
  exerciseConfigId: Yup.number()
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value))
    .when('createCustomConfig', {
      is: true,
      then: (schema) => schema.notRequired(),
      otherwise: (schema) => schema.required('Chọn cấu hình bài tập'),
    }),
  configReferentId: Yup.number()
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value)),
  notes: Yup.string(),
  createCustomConfig: Yup.boolean(),
  // Config validation - compatible with BasicConfigFields
  name: Yup.string().when('createCustomConfig', {
    is: true,
    then: () => Yup.string().required('Tên cấu hình là bắt buộc'),
    otherwise: () => Yup.string().notRequired(),
  }),
  eye: Yup.string().oneOf(['left', 'right', 'both']),
  distance: Yup.number().min(0.1).max(10),
  duration: Yup.number().min(0.5).max(180), // Allow 0.5 minutes (30 seconds) minimum
  frequency: Yup.string().oneOf(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  executionCount: Yup.number().min(1).max(10),
  inactivityThreshold: Yup.number().min(5).max(300).nullable().optional(),
  colorScheme: Yup.object().shape({
    preset: Yup.string().oneOf(['original', 'whiteBlack', 'redBlue', 'redGreen', 'custom']),
    textColor: Yup.string(),
    backgroundColor: Yup.string(),
  }),
  // Vision Configuration validation
  visionType: Yup.string().oneOf(['far', 'near', 'contrast'], 'Invalid vision type'),
  visionLevel: Yup.number()
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value))
    .when(['levelOverride', 'visionType'], ([levelOverride, visionType], schema) => {
      const maxLevel = VISION_LEVEL_MAX_BY_TYPE[String(visionType)] || 20;

      if (levelOverride === true) {
        return schema
          .required('Cấp độ thị lực là bắt buộc khi bật ghi đè')
          .min(1)
          .max(maxLevel, `Vision level must be between 1 and ${maxLevel}`);
      }

      return schema.test(
        'vision-level-must-be-null-when-no-override',
        'Vision level phải để trống khi không bật ghi đè',
        (value) => value == null
      );
    }),
  levelOverride: Yup.boolean()
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value)),
  // Notification Settings validation
  notificationSettings: Yup.object().shape({
    enabled: Yup.boolean(),
    templateId: Yup.number()
      .nullable()
      .optional()
      .transform((value, originalValue) => (originalValue === '' ? null : value)),
    methods: Yup.array()
      .of(Yup.string().oneOf(['email', 'zalo', 'sms']))
      .min(0),
    reminderFrequency: Yup.string().oneOf(['daily', 'weekly', 'monthly']),
    reminderTime: Yup.string().matches(/^\d{2}:\d{2}$/, 'Invalid time format HH:MM'),
    reminderDaysInterval: Yup.number().min(1, 'Minimum 1 day').max(30, 'Maximum 30 days'),
    maxReminders: Yup.number().min(1, 'Minimum 1 reminder').max(10, 'Maximum 10 reminders'),
  }),
  vtSettings: Yup.object().nullable().optional(),
});

export type PatientAssignmentFormData = Yup.InferType<typeof patientAssignmentFormSchema>;
