import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Divider,
  DialogTitle,
  Grid,
  FormControl,
  FormHelperText,
  MenuItem,
  InputLabel,
  Typography,
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import { useForm, SubmitHandler, Resolver, FieldErrors } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslation } from 'src/hooks/useTranslation';
import useAuth from 'src/contexts/authGuard/useAuth';
import type { Exercise, ExerciseConfig, PaginatedResponse } from 'src/types/core';
import { getData } from 'src/utils/request';
import { BasicConfigFields } from './BasicConfigFields';
import { VisionLevelOverrideFields } from './VisionLevelOverrideFields';
import DifficultyBaselineFields from './DifficultyBaselineFields';
import PreviewDialog from './PreviewDialog';
import { ConfigurationSelector } from './ConfigurationSelector';
import { NotificationSettingsFields } from './NotificationSettingsFields';
import { VtQuestSettingsFields } from './VtQuestSettingsFields';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { shouldShowFieldError } from 'src/utils';
import { stripReadonlyExerciseConfigFields } from 'src/utils/exerciseConfigPayload';
import { exerciseConfigSchema, type ExerciseConfigFormData } from 'src/validations';
import { colorSchemeFromPreset } from 'src/services/colorPreset.service';

interface ConfigFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Partial<ExerciseConfig>) => Promise<void>;
  configData?: ExerciseConfig;
  readOnly?: boolean;
  // UI Control
  title?: string;
  submitButtonText?: string;
  // Exercise data
  exercises: Exercise[];
}

export const ConfigForm: React.FC<ConfigFormProps> = ({
  open,
  onClose,
  onSubmit,
  configData,
  readOnly = false,
  title,
  submitButtonText,
  exercises = [],
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [availableConfigs, setAvailableConfigs] = useState<ExerciseConfig[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const getEditableConfigType = (): ExerciseConfigFormData['configType'] =>
    configData?.configType === 'admin' || user?.userType === 'admin' ? 'admin' : 'doctor';

  // Determine default values based on config type
  const getInitialValues = (): Partial<ExerciseConfigFormData> => {
    const defaults: Partial<ExerciseConfigFormData> = {
      id: configData?.id,
      name: configData?.name || '',
      configType: getEditableConfigType(),
      eye: configData?.eye || ('left' as const),
      distance: configData?.distance || 3.0,
      duration: configData?.duration || 30,
      frequency: configData?.frequency || ('daily' as const),
      executionCount: configData?.executionCount || 1, // Đổi từ sessionsCount thành executionCount
      configReferentId: configData?.configReferentId || undefined,

      // Visual Settings (direct fields)
      colorScheme: configData?.colorScheme ?? colorSchemeFromPreset('original'),
      // Vision Configuration
      visionType: configData?.visionType ?? 'far',
      levelOverride: configData?.levelOverride ?? false,
      visionLevel: configData?.visionLevel ?? null,

      vtSettings: (configData as { vtSettings?: unknown })?.vtSettings as
        | import('src/types/core/vtQuest').VtSettings
        | undefined,

      inactivityThreshold: configData?.inactivityThreshold ?? 30,

      difficultyBaselineSource: (configData as any)?.difficultyBaselineSource ?? 'current_exam',

      // Notification settings
      notificationSettings: configData?.notificationSettings || {
        enabled: false,
        templateId: null,
        methods: [],
        maxReminders: 3,
        reminderInterval: 24,
      },
    };

    // Always set exerciseId from configData if available (for edit mode)
    if (configData?.exerciseId) {
      defaults.exerciseId = configData.exerciseId;
    }

    return defaults;
  };

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors, touchedFields, isSubmitted },
    reset,
  } = useForm<ExerciseConfigFormData>({
    resolver: yupResolver(exerciseConfigSchema) as Resolver<ExerciseConfigFormData>,
    defaultValues: getInitialValues(),
  });

  const values = watch();
  const touched = touchedFields;

  // Đồng bộ giá trị mặc định khi cấu hình gốc thiếu field (UI hiển thị 'far' nhưng state null)
  useEffect(() => {
    if (!values.visionType) {
      setValue('visionType', 'far', { shouldValidate: true });
    }
    if (!values.eye) {
      setValue('eye', 'left', { shouldValidate: true });
    }
    if (values.inactivityThreshold == null) {
      setValue('inactivityThreshold', 30, { shouldValidate: true });
    }
  }, [values.visionType, values.eye, values.inactivityThreshold, setValue]);

  // Reset form when configData changes
  useEffect(() => {
    reset(getInitialValues());
  }, [configData, user?.id]);

  const onSubmitHandler: SubmitHandler<ExerciseConfigFormData> = async (data) => {
    try {
      setLoading(true);
      await onSubmit(data as Partial<ExerciseConfig>);
      onClose();
    } catch (error) {
      console.error('Error submitting config:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFirstValidationMessage = (
    formErrors: FieldErrors<ExerciseConfigFormData>
  ): string | null => {
    for (const value of Object.values(formErrors)) {
      if (!value) continue;
      if (typeof value === 'object' && 'message' in value && value.message) {
        return String(value.message);
      }
      if (typeof value === 'object') {
        const nested = getFirstValidationMessage(value as FieldErrors<ExerciseConfigFormData>);
        if (nested) return nested;
      }
    }
    return null;
  };

  const onInvalid = (formErrors: FieldErrors<ExerciseConfigFormData>) => {
    const message =
      getFirstValidationMessage(formErrors) ||
      t('config.validationError', 'Vui lòng kiểm tra lại các trường bắt buộc');
    showSnackbar(message, SNACKBAR_SEVERITY.ERROR);
  };

  // Load available configs when exercise changes
  useEffect(() => {
    if (values.exerciseId) {
      getData<PaginatedResponse<ExerciseConfig>>(
        `/exercise-configs?exerciseId=${values.exerciseId}&limit=100`
      )
        .then((response) => {
          const typeOrder: any = { admin: 0, doctor: 1, patient: 2 };
          setAvailableConfigs(
            response.rows.sort((a, b) => {
              const aOrder = typeOrder[a.configType] ?? 99;
              const bOrder = typeOrder[b.configType] ?? 99;
              if (aOrder !== bOrder) return aOrder - bOrder;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
          );
        })
        .catch(() => setAvailableConfigs([]));
    } else {
      setAvailableConfigs([]);
    }
  }, [values.exerciseId]);

  const handleFieldChange = (field: string, value: any) => {
    setValue(field as any, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    // Reset configReferentId when exercise changes
    if (field === 'exerciseId') {
      setValue('configReferentId', null, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  };

  const defaultVisionLevelForType = (visionType: string | undefined) => {
    switch (visionType) {
      case 'near':
        return 3;
      case 'contrast':
        return 10;
      case 'stereopsis':
        return 5;
      default:
        return 14;
    }
  };

  const handleLevelOverrideChange = (checked: boolean) => {
    handleFieldChange('levelOverride', checked);
    if (!checked) {
      handleFieldChange('visionLevel', null);
    } else if (values.visionLevel == null) {
      handleFieldChange('visionLevel', defaultVisionLevelForType(values.visionType));
    }
  };

  const handleBaseConfigSelect = (configId: number | null) => {
    if (configId) {
      // Find the selected config from available configs
      const baseConfig = availableConfigs.find((c) => c.id === configId);
      if (baseConfig) {
        const inheritedConfig = stripReadonlyExerciseConfigFields({ ...(baseConfig as any) });
        delete inheritedConfig.id;
        delete inheritedConfig.name;
        delete inheritedConfig.configType;

        // Set all values from base config, but override key fields
        const defaults = getInitialValues();
        reset({
          ...defaults,
          ...inheritedConfig,
          visionType: inheritedConfig.visionType ?? defaults.visionType ?? 'far',
          levelOverride: inheritedConfig.levelOverride ?? defaults.levelOverride ?? false,
          visionLevel: inheritedConfig.visionLevel ?? defaults.visionLevel ?? null,
          eye: inheritedConfig.eye ?? defaults.eye ?? 'left',
          inactivityThreshold:
            inheritedConfig.inactivityThreshold ?? defaults.inactivityThreshold ?? 30,
          exerciseId: inheritedConfig.exerciseId ?? defaults.exerciseId,
          name: configData?.name || '',
          configReferentId: baseConfig.id,
          configType: getEditableConfigType(),
        });
      }
    } else {
      // Reset to default values
      const defaults = getInitialValues();
      reset(defaults);
    }
  };

  // Get the selected exercise object from exercises array
  const getSelectedExercise = () => {
    if (!values.exerciseId || !exercises) return null;
    return exercises.find((ex) => ex.id === values.exerciseId) || null;
  };

  const getTitle = () => {
    if (title) return title;

    if (readOnly) {
      return t('config.viewTitle', 'View Configuration');
    }

    if (configData) {
      return t('config.editTitle', 'Edit Configuration');
    }

    switch (user?.userType) {
      case 'admin':
        return t('config.createAdminTitle', 'Create Admin Configuration');
      case 'doctor':
        return t('config.createDoctorTitle', 'Create Doctor Configuration');
      default:
        return t('config.createTitle', 'Create Configuration');
    }
  };

  const getSubmitText = () => {
    if (submitButtonText) return submitButtonText;
    if (readOnly) return null;
    if (configData) return t('config.update', 'Update');
    return t('config.create', 'Create');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{getTitle()}</DialogTitle>
        <DialogContent dividers>
          <Box>
            {/* 1. Exercise Selection - Always show on top */}
            <Grid container spacing={2}>
              <Grid size={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('config.exercise')} *</InputLabel>
                  <CustomSelect
                    value={values.exerciseId || ''}
                    onChange={(e: any) => handleFieldChange('exerciseId', Number(e.target.value))}
                    error={shouldShowFieldError(errors.exerciseId, touched.exerciseId, isSubmitted)}
                    disabled={readOnly}
                    label={t('config.exercise')}
                  >
                    {exercises.map((exercise) => (
                      <MenuItem key={exercise.id} value={exercise.id}>
                        {exercise.name} ({exercise.code})
                      </MenuItem>
                    ))}
                  </CustomSelect>
                  {shouldShowFieldError(errors.exerciseId, touched.exerciseId, isSubmitted) && (
                    <FormHelperText error>{errors.exerciseId?.message}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              {values.exerciseId && (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ConfigurationSelector
                      availableConfigs={availableConfigs}
                      value={values.configReferentId || null}
                      onChange={handleBaseConfigSelect}
                      disabled={readOnly}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      fullWidth
                      label={t('exercise.defaultConfig', 'Cấu hình mặc định') + ' *'}
                      value={values.name || ''}
                      onChange={(e: any) => handleFieldChange('name', e.target.value)}
                      error={shouldShowFieldError(errors.name, touched.name, isSubmitted)}
                      helperText={
                        shouldShowFieldError(errors.name, touched.name, isSubmitted)
                          ? (errors.name?.message as string)
                          : ''
                      }
                      disabled={readOnly}
                      size="small"
                    />
                  </Grid>
                </>
              )}
              {!values.exerciseId && (
                <Grid size={12}>
                  <CustomTextField
                    fullWidth
                    label={t('exercise.defaultConfig', 'Cấu hình mặc định') + ' *'}
                    value={values.name || ''}
                    onChange={(e: any) => handleFieldChange('name', e.target.value)}
                    error={shouldShowFieldError(errors.name, touched.name, isSubmitted)}
                    helperText={
                      shouldShowFieldError(errors.name, touched.name, isSubmitted)
                        ? (errors.name?.message as string)
                        : ''
                    }
                    disabled={readOnly}
                    size="small"
                  />
                </Grid>
              )}
            </Grid>
            <Divider sx={{ my: 2 }} />

            {/* 3. Configuration Fields (without header) */}
            <BasicConfigFields
              values={values}
              errors={errors}
              touched={touched}
              isSubmitted={isSubmitted}
              onFieldChange={handleFieldChange}
              readOnly={readOnly}
              isAdmin={user?.userType === 'admin'}
              exercises={exercises}
              exerciseName={getSelectedExercise()?.name ?? null}
            />

            <Grid container spacing={2} sx={{ mt: 1 }} alignItems="flex-start">
              <Grid size={{ xs: 12, md: 6 }}>
                <VisionLevelOverrideFields
                  embedded
                  visionType={values.visionType}
                  levelOverride={values.levelOverride === true}
                  visionLevel={values.visionLevel}
                  onLevelOverrideChange={handleLevelOverrideChange}
                  onVisionLevelChange={(level) => handleFieldChange('visionLevel', level)}
                  errors={errors}
                  touched={touched}
                  isSubmitted={isSubmitted}
                  readOnly={readOnly}
                />
                {values.visionType !== 'stereopsis' && (
                  <Box sx={{ mt: 2 }}>
                    <DifficultyBaselineFields
                      value={values.difficultyBaselineSource ?? 'current_exam'}
                      onChange={(v) => handleFieldChange('difficultyBaselineSource', v)}
                      readOnly={readOnly}
                    />
                  </Box>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {t('exercise.notificationSettings', 'Cài đặt thông báo')}
                </Typography>
                <NotificationSettingsFields
                  isReadOnly={readOnly}
                  config={values}
                  onFieldChange={handleFieldChange}
                />
              </Grid>
            </Grid>

            <VtQuestSettingsFields
              exerciseType={exercises.find((e) => e.id === values.exerciseId)?.exerciseType}
              vtSettings={
                (values as { vtSettings?: Partial<import('src/types/core/vtQuest').VtSettings> })
                  .vtSettings
              }
              onChange={(vt) => handleFieldChange('vtSettings', vt)}
              readOnly={readOnly}
            />

            {/* 4. Preview Button - Only show when exercise is selected */}
            {values.exerciseId && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => setPreviewOpen(true)}
                    size="large"
                    sx={{ minWidth: 200 }}
                  >
                    {t('exercise.preview')}
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>

          {!readOnly && (
            <Button
              onClick={handleSubmit(onSubmitHandler, onInvalid)}
              variant="contained"
              disabled={loading}
            >
              {loading ? t('common.saving') : getSubmitText()}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {previewOpen && (
        <PreviewDialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          exercise={getSelectedExercise()}
          visionType={values.visionType || 'far'}
          distance={values.distance || 3.0}
          onDistanceChange={(newDistance) => setValue('distance', newDistance)}
          colorScheme={values.colorScheme as any}
          eye={values.eye}
          duration={values.duration}
          vtSettings={
            (values as { vtSettings?: Partial<import('src/types/core/vtQuest').VtSettings> })
              .vtSettings
          }
          inactivityThreshold={values.inactivityThreshold}
          initialVisionLevel={
            values.levelOverride === true && values.visionLevel != null
              ? Number(values.visionLevel)
              : undefined
          }
        />
      )}
    </>
  );
};
