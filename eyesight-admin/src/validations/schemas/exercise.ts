import * as Yup from 'yup';
import * as common from './common';
import type {
  ColorScheme,
  NotificationSettings,
  PassConditions,
  AutoAdjustmentRules,
} from 'src/types/core';

export const exerciseSchema = Yup.object({
  name: common.name('Tên bài tập'),
  code: common.code('Mã bài tập'),
  exerciseType: Yup.string()
    .oneOf(['vision', 'coordination', 'memory'], 'Loại bài tập không hợp lệ')
    .required('Loại bài tập là bắt buộc'),
  description: common.optionalString,
});

export const exerciseConfigSchema = Yup.object({
  id: Yup.number().optional(),
  name: common.name('Tên cấu hình'),
  exerciseId: common.positiveInteger('Bài tập'),
  configType: Yup.string()
    .oneOf(['admin', 'doctor'], 'Loại cấu hình không hợp lệ')
    .required('Loại cấu hình là bắt buộc'),
  eye: Yup.string()
    .oneOf(['left', 'right', 'both'], 'Mắt không hợp lệ')
    .required('Mắt là bắt buộc'),
  distance: Yup.number()
    .min(0.1, 'Khoảng cách tối thiểu 0.1m')
    .max(10, 'Khoảng cách tối đa 10m')
    .required('Khoảng cách là bắt buộc'),
  duration: Yup.number()
    .min(0.5, 'Thời gian tối thiểu 0.5 phút (30 giây)')
    .max(180, 'Thời gian tối đa 180 phút')
    .required('Thời gian là bắt buộc'),
  frequency: Yup.string()
    .oneOf(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], 'Tần suất không hợp lệ')
    .required('Tần suất là bắt buộc'),
  executionCount: Yup.number()
    .min(1, 'Số lần thực hiện tối thiểu 1')
    .max(10, 'Số lần thực hiện tối đa 10')
    .required('Số lần thực hiện là bắt buộc'),
  configReferentId: Yup.number().nullable(),
  // Visual Settings
  colorScheme: Yup.object()
    .shape({
      preset: Yup.string().optional(),
      textColor: Yup.string()
        .matches(/^#[0-9A-Fa-f]{6}$/, 'Màu chữ không hợp lệ')
        .optional(),
      backgroundColor: Yup.string()
        .matches(/^#[0-9A-Fa-f]{6}$/, 'Màu nền không hợp lệ')
        .optional(),
    })
    .optional(),
  visionType: Yup.string()
    .oneOf(['far', 'near', 'contrast', 'stereopsis'], 'Loại thị lực không hợp lệ')
    .optional(),
  levelOverride: Yup.boolean().default(false),
  visionLevel: Yup.number()
    .nullable()
    .when(['levelOverride', 'visionType'], ([levelOverride, visionType], schema) => {
      const type = visionType as string | undefined;
      if (levelOverride === true) {
        const max =
          type === 'near' ? 8 : type === 'contrast' ? 16 : type === 'stereopsis' ? 40 : 20;
        return schema
          .required('Cấp độ thị lực là bắt buộc khi bật ghi đè')
          .min(1)
          .max(max, `Cấp độ thị lực phải từ 1-${max}`);
      }
      return schema.nullable().test(
        'no-level-without-override',
        'Vision level phải để trống khi không bật ghi đè',
        (value) => value == null
      );
    }),
  inactivityThreshold: Yup.number()
    .min(5, 'Ngưỡng bỏ tương tác tối thiểu 5 giây')
    .max(300, 'Ngưỡng bỏ tương tác tối đa 300 giây')
    .nullable()
    .optional(),
  difficultyBaselineSource: Yup.string()
    .oneOf(['current_exam', 'latest_achieved'], 'Chế độ độ khó không hợp lệ')
    .optional(),
  // Advanced fields
  passConditions: Yup.object().optional(),
  autoAdjustmentRules: Yup.object().optional(),
  notificationSettings: Yup.object()
    .shape({
      enabled: Yup.boolean(),
      templateId: Yup.number().nullable(),
      methods: Yup.array()
        .of(Yup.string().oneOf(['email', 'zalo', 'sms']))
        .min(0),
      maxReminders: Yup.number().min(1, 'Tối thiểu 1 lần nhắc').max(10, 'Tối đa 10 lần nhắc'),
      reminderInterval: Yup.number()
        .min(1, 'Khoảng cách nhắc tối thiểu 1 giờ')
        .max(168, 'Khoảng cách nhắc tối đa 168 giờ'),
    })
    .optional(),
  vtSettings: Yup.object().optional(),
});

export const exerciseAssignmentSchema = Yup.object({
  patientId: common.positiveInteger('Bệnh nhân'),
  exerciseConfigId: common.positiveInteger('Cấu hình'),
  visionLevel: Yup.number().min(1).max(20, 'Vision level phải từ 1-20').nullable(),
  startDate: Yup.date().required('Ngày bắt đầu là bắt buộc'),
  endDate: Yup.date().nullable(),
});

export interface ExerciseFormData {
  name: string;
  code: string;
  exerciseType: 'vision' | 'coordination' | 'memory';
  description?: string;
}

export interface ExerciseConfigFormData {
  id?: number;
  name: string;
  exerciseId: number;
  configType: 'admin' | 'doctor';
  eye: 'left' | 'right' | 'both';
  distance: number;
  duration: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  executionCount: number;
  configReferentId?: number | null;
  colorScheme?: ColorScheme;
  visionType?: 'far' | 'near' | 'contrast' | 'stereopsis';
  levelOverride?: boolean;
  visionLevel?: number | null;
  passConditions?: PassConditions;
  autoAdjustmentRules?: AutoAdjustmentRules;
  notificationSettings?: NotificationSettings;
  inactivityThreshold?: number | null;
  /** How starting difficulty is determined: 'current_exam' (default) | 'latest_achieved'. */
  difficultyBaselineSource?: 'current_exam' | 'latest_achieved' | null;
  vtSettings?: import('src/types/core/vtQuest').VtSettings;
}

export interface ExerciseAssignmentFormData {
  patientId: number;
  exerciseConfigId: number;
  visionLevel?: number | null;
  startDate: Date;
  endDate?: Date | null;
}
