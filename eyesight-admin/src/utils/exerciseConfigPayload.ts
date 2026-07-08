import type { ExerciseConfig } from 'src/types/core';
import { colorSchemeFromPreset } from 'src/services/colorPreset.service';

/** Các field join / metadata từ API — không gửi lại khi create/update. */
export const EXERCISE_CONFIG_READONLY_FIELDS = [
  'createdByUser',
  'exercise',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'deleted',
  'createdBy',
  'updatedBy',
  'centerId',
] as const;

/** Field backend chấp nhận trong body create/update (khớp Joi validation). */
export const EXERCISE_CONFIG_WRITABLE_FIELDS = [
  'id',
  'exerciseId',
  'patientId',
  'name',
  'configType',
  'eye',
  'distance',
  'duration',
  'frequency',
  'executionCount',
  'fontSize',
  'contrast',
  'colorScheme',
  'visionType',
  'levelOverride',
  'visionLevel',
  'configReferentId',
  'levels',
  'passConditions',
  'autoAdjustmentRules',
  'autoAdjustLevel',
  'inactivityThreshold',
  'difficultyBaselineSource',
  'notificationSettings',
  'vtSettings',
] as const;

type WritableField = (typeof EXERCISE_CONFIG_WRITABLE_FIELDS)[number];

export const stripReadonlyExerciseConfigFields = <T extends Record<string, unknown>>(
  config: T
): Omit<T, (typeof EXERCISE_CONFIG_READONLY_FIELDS)[number]> => {
  const result = { ...config };
  for (const key of EXERCISE_CONFIG_READONLY_FIELDS) {
    delete result[key];
  }
  return result;
};

/** Chuẩn hóa payload trước khi gửi API — chỉ field hợp lệ, không leak join từ cấu hình gốc. */
export const normalizeExerciseConfigPayload = (
  values: Partial<ExerciseConfig>,
  options: { forUpdate?: boolean } = {}
): Partial<ExerciseConfig> => {
  const payload: Partial<ExerciseConfig> = {};

  for (const key of EXERCISE_CONFIG_WRITABLE_FIELDS) {
    if (key === 'id' && !options.forUpdate) continue;
    const val = values[key as WritableField];
    if (val !== undefined) {
      (payload as Record<string, unknown>)[key] = val;
    }
  }

  payload.visionType = (payload.visionType ?? values.visionType ?? 'far') as ExerciseConfig['visionType'];
  payload.eye = (payload.eye ?? values.eye ?? 'left') as ExerciseConfig['eye'];
  payload.inactivityThreshold = payload.inactivityThreshold ?? values.inactivityThreshold ?? 30;

  if (!payload.colorScheme && !values.colorScheme) {
    payload.colorScheme = colorSchemeFromPreset('original');
  }

  if ('levelOverride' in values) {
    const levelOverride = values.levelOverride === true;
    payload.levelOverride = levelOverride;
    if (levelOverride) {
      payload.visionLevel = values.visionLevel ?? null;
    } else {
      delete payload.visionLevel;
    }
  }

  if (values.notificationSettings) {
    payload.notificationSettings = {
      enabled: values.notificationSettings.enabled,
      templateId: values.notificationSettings.templateId,
      methods: values.notificationSettings.methods ?? [],
      maxReminders: values.notificationSettings.maxReminders ?? 3,
      reminderInterval: values.notificationSettings.reminderInterval ?? 24,
    };
  }

  return payload;
};
