import React, { useState, useEffect } from 'react';
import {
  Grid,
  Button,
  FormControl,
  InputLabel,
  Typography,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Box,
  Chip,
  Autocomplete,
  MenuItem,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useForm, Path } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import {
  getExamAssignmentsByPatient,
  createExamAssignment,
  updateExamAssignment,
} from 'src/services/exam-assignment.service';
import { SNACKBAR_SEVERITY } from 'src/utils/constant.ts';
import useSnackbar from 'src/contexts/UseSnackbar.ts';
import { getErrorMessage } from 'src/utils/errorHandler';
import type { Patient, ExamAssignment } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';
import { FrequencyType } from 'src/utils/examUtils';
import { shouldShowFieldError } from 'src/utils';
import * as NotificationService from 'src/services/notification.service';
import {
  examAssignmentFormSchema,
  type ExamAssignmentFormData,
  type ExamConfigFormData,
} from 'src/validations';
import type { NotificationTemplate } from 'src/types/core/notification';
import { fetchPatientWithCausesCheck } from 'src/utils/patientClinicalPrerequisites';

interface ExamAssignmentFormProps {
  patient: Patient;
  onSuccess: () => void;
}

const defaultExamConfig: ExamConfigFormData = {
  frequency: 'weekly',
  isEnabled: true,
  notificationSettings: {
    enabled: true,
    templateId: null,
    beforeDays: 1,
    time: '09:00',
    methods: ['email'],
  },
};

const initialFormData: ExamAssignmentFormData = {
  far: { ...defaultExamConfig },
  near: { ...defaultExamConfig, frequency: 'weekly' },
  contrast: { ...defaultExamConfig, frequency: 'monthly', isEnabled: false },
  stereopsis: { ...defaultExamConfig, frequency: 'monthly' },
};

const ExamAssignmentForm: React.FC<ExamAssignmentFormProps> = ({ patient, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [existingConfigs, setExistingConfigs] = useState<ExamAssignment[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);

  const { showSnackbar } = useSnackbar();
  const { t } = useTranslation();

  // Load notification templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await NotificationService.getNotificationTemplates({
          category: 'exam',
          isActive: true,
        });
        setTemplates(response.rows || []);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };
    loadTemplates();
  }, []);

  const examTypes = [
    { key: 'far', name: t('patient.examConfig.types.far', 'Thị lực nhìn xa') },
    { key: 'near', name: t('patient.examConfig.types.near', 'Thị lực nhìn gần') },
    { key: 'contrast', name: t('patient.examConfig.types.contrast', 'Thị lực tương phản') },
    { key: 'stereopsis', name: t('patient.examConfig.types.stereopsis', 'Thị giác lập thể') },
  ];

  const notificationMethods = [
    { value: 'email', label: 'Email' },
    { value: 'zalo', label: 'Zalo' },
    { value: 'sms', label: 'SMS' },
  ];

  const getFrequencyLabel = (frequency: FrequencyType) => {
    return t(`exercise.frequencies.${frequency}`, frequency);
  };

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, touchedFields, isSubmitting },
  } = useForm<ExamAssignmentFormData>({
    resolver: yupResolver(examAssignmentFormSchema),
    defaultValues: initialFormData,
  });

  const values = watch();
  const touched = touchedFields;

  const onSubmitHandler = async (data: ExamAssignmentFormData) => {
    const causesCheck = await fetchPatientWithCausesCheck(patient.id!);
    if (!causesCheck.ok) {
      showSnackbar(causesCheck.message, SNACKBAR_SEVERITY.WARNING);
      return;
    }
    setLoading(true);
    try {
      // Convert form data to API format and save each config
      const promises = examTypes.map(async (examType) => {
        const configData = data[examType.key as keyof ExamAssignmentFormData];
        const existingConfig = existingConfigs.find((c) => c.examType === examType.key);

        const createPayload = {
          patientId: patient.id!,
          examType: examType.key as 'far' | 'near' | 'contrast' | 'stereopsis',
          frequency: configData.frequency,
          isEnabled: configData.isEnabled,
          notificationSettings: {
            enabled: configData.notificationSettings.enabled,
            templateId: configData.notificationSettings.templateId,
            beforeDays: configData.notificationSettings.beforeDays,
            time: configData.notificationSettings.time,
            methods: configData.notificationSettings.methods as ('email' | 'zalo' | 'sms')[],
          },
        };

        const updatePayload = {
          examType: examType.key as 'far' | 'near' | 'contrast' | 'stereopsis',
          frequency: configData.frequency,
          isEnabled: configData.isEnabled,
          notificationSettings: {
            enabled: configData.notificationSettings.enabled,
            templateId: configData.notificationSettings.templateId,
            beforeDays: configData.notificationSettings.beforeDays,
            time: configData.notificationSettings.time,
            methods: configData.notificationSettings.methods as ('email' | 'zalo' | 'sms')[],
          },
          patientId: patient.id!,
        };

        if (existingConfig) {
          // Update existing config
          return updateExamAssignment(patient.id!, existingConfig.id, updatePayload);
        } else {
          // Create new config
          return createExamAssignment(patient.id!, createPayload);
        }
      });

      await Promise.all(promises);
      showSnackbar(
        t('patient.examConfig.saveSuccess', 'Cập nhật cấu hình thành công'),
        SNACKBAR_SEVERITY.SUCCESS
      );
      onSuccess();
    } catch (error: any) {
      showSnackbar(
        getErrorMessage(error, t('patient.examConfig.saveError', 'Có lỗi xảy ra khi lưu cấu hình')),
        SNACKBAR_SEVERITY.ERROR
      );
    } finally {
      setLoading(false);
    }
  };

  // Load existing configs on mount
  useEffect(() => {
    const loadExistingConfigs = async () => {
      if (!patient.id) return;

      try {
        const configs = await getExamAssignmentsByPatient(patient.id);
        setExistingConfigs(configs.rows);

        // Update form with existing values
        const formData = { ...initialFormData };
        configs.rows.forEach((config) => {
          if (config.examType in formData) {
            const examType = config.examType;
            formData[examType] = {
              frequency: config.frequency,
              isEnabled: config.isEnabled,
              notificationSettings: {
                enabled: config.notificationSettings?.enabled ?? false,
                templateId: config.notificationSettings?.templateId ?? null,
                beforeDays: config.notificationSettings?.beforeDays ?? 1,
                time: config.notificationSettings?.time ?? '09:00',
                methods: config.notificationSettings?.methods ?? [],
              },
            };
          }
        });

        reset(formData);
      } catch (error) {
        console.error('Error loading existing configs:', error);
      }
    };

    loadExistingConfigs();
  }, [patient.id]);

  const getFieldError = (examType: string, field: string): string | undefined => {
    const examErrors = errors[examType as keyof ExamAssignmentFormData];
    if (examErrors && typeof examErrors === 'object') {
      return (examErrors as Record<string, any>)[field];
    }
    return undefined;
  };
  const getFieldTouched = (examType: string, field: string): boolean => {
    const examTouched = touched[examType as keyof ExamAssignmentFormData];
    if (examTouched && typeof examTouched === 'object') {
      return (examTouched as Record<string, any>)[field];
    }
    return false;
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          {t('patient.examConfig.title', 'Cấu hình bài kiểm tra')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            'patient.examConfig.description',
            'Thiết lập tần suất và thông báo cho từng loại bài kiểm tra'
          )}
        </Typography>
      </Box>

      {examTypes.map((examType, index) => {
        const configKey = examType.key as keyof ExamAssignmentFormData;
        const configValue = values[configKey];

        return (
          <Accordion key={examType.key} defaultExpanded={index === 0} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">{examType.name}</Typography>
                <Chip
                  label={
                    configValue.isEnabled
                      ? t('common.enabled', 'Kích hoạt')
                      : t('common.disabled', 'Tắt')
                  }
                  color={configValue.isEnabled ? 'success' : 'default'}
                  size="small"
                />
                <Chip
                  label={getFrequencyLabel(configValue.frequency)}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Enable/Disable */}
                <Grid size={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={configValue.isEnabled}
                        onChange={(e) => {
                          const isEnabled = e.target.checked;
                          setValue(
                            `${examType.key}.isEnabled` as Path<ExamAssignmentFormData>,
                            isEnabled
                          );
                          // Tự động tắt thông báo khi tắt kích hoạt bài kiểm tra
                          if (!isEnabled) {
                            setValue(
                              `${examType.key}.notificationSettings.enabled` as Path<ExamAssignmentFormData>,
                              false
                            );
                          }
                        }}
                      />
                    }
                    label={t('patient.examConfig.enabled', 'Kích hoạt bài kiểm tra này')}
                  />
                </Grid>

                {/* Frequency */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('patient.examConfig.frequency', 'Tần suất')}</InputLabel>
                    <CustomSelect
                      value={configValue.frequency}
                      onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                        setValue(
                          `${examType.key}.frequency` as Path<ExamAssignmentFormData>,
                          e.target.value as FrequencyType,
                          { shouldDirty: true, shouldTouch: true, shouldValidate: true }
                        )
                      }
                      error={shouldShowFieldError(
                        getFieldError(examType.key, 'frequency'),
                        getFieldTouched(examType.key, 'frequency')
                      )}
                      label={t('patient.examConfig.frequency', 'Tần suất')}
                      size="small"
                    >
                      <MenuItem value="daily">{t('frequency.daily', 'Hàng ngày')}</MenuItem>
                      <MenuItem value="weekly">{t('frequency.weekly', 'Hàng tuần')}</MenuItem>
                      <MenuItem value="monthly">{t('frequency.monthly', 'Hàng tháng')}</MenuItem>
                      <MenuItem value="quarterly">{t('frequency.quarterly', 'Hàng quý')}</MenuItem>
                      <MenuItem value="yearly">{t('frequency.yearly', 'Hàng năm')}</MenuItem>
                    </CustomSelect>
                    {shouldShowFieldError(
                      getFieldError(examType.key, 'frequency'),
                      getFieldTouched(examType.key, 'frequency')
                    ) && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                        {getFieldError(examType.key, 'frequency') as string}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                {/* Notification Settings */}
                <Grid size={12}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    {t('patient.examConfig.notification.title', 'Cài đặt thông báo')}
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={configValue.notificationSettings.enabled}
                            onChange={(e) =>
                              setValue(
                                `${examType.key}.notificationSettings.enabled` as Path<ExamAssignmentFormData>,
                                e.target.checked
                              )
                            }
                          />
                        }
                        label={t('patient.examConfig.notification.enabled', 'Bật thông báo')}
                      />
                    </Grid>

                    {configValue.notificationSettings.enabled && (
                      <>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label={t(
                              'patient.examConfig.notification.beforeDays',
                              'Nhắc trước (ngày)'
                            )}
                            type="number"
                            value={configValue.notificationSettings.beforeDays}
                            onChange={(e) =>
                              setValue(
                                `${examType.key}.notificationSettings.beforeDays` as Path<ExamAssignmentFormData>,
                                parseInt(e.target.value) || 1
                              )
                            }
                            inputProps={{ min: 0, max: 30 }}
                          />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label={t('patient.examConfig.notification.time', 'Thời gian')}
                            type="time"
                            value={configValue.notificationSettings.time}
                            onChange={(e) =>
                              setValue(
                                `${examType.key}.notificationSettings.time` as Path<ExamAssignmentFormData>,
                                e.target.value
                              )
                            }
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>
                              {t('patient.examConfig.notification.methods', 'Phương thức')}
                            </InputLabel>
                            <CustomSelect
                              multiple
                              value={configValue.notificationSettings.methods}
                              onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                                setValue(
                                  `${examType.key}.notificationSettings.methods` as Path<ExamAssignmentFormData>,
                                  e.target.value as ('email' | 'zalo' | 'sms')[]
                                )
                              }
                              label={t('patient.examConfig.notification.methods', 'Phương thức')}
                            >
                              {notificationMethods.map((method) => (
                                <MenuItem key={method.value} value={method.value}>
                                  {method.label}
                                </MenuItem>
                              ))}
                            </CustomSelect>
                          </FormControl>
                        </Grid>

                        <Grid size={12}>
                          <Autocomplete
                            size="small"
                            options={templates}
                            getOptionLabel={(option) => option.name}
                            value={
                              templates.find(
                                (t) => t.id === configValue.notificationSettings.templateId
                              ) || null
                            }
                            onChange={(_, newValue) => {
                              setValue(
                                `${examType.key}.notificationSettings.templateId` as Path<ExamAssignmentFormData>,
                                newValue?.id || null
                              );
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                label={t(
                                  'patient.examConfig.notification.template',
                                  'Template thông báo'
                                )}
                                placeholder={t(
                                  'patient.examConfig.notification.selectTemplate',
                                  'Chọn template hoặc để trống dùng mặc định'
                                )}
                              />
                            )}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Grid>

                {/* Save Button for Individual Config */}
                <Grid size={12}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const configData = values[examType.key as keyof ExamAssignmentFormData];
                        const existingConfig = existingConfigs.find(
                          (c) => c.examType === examType.key
                        );

                        const createPayload = {
                          patientId: patient.id!,
                          examType: examType.key as 'far' | 'near' | 'contrast' | 'stereopsis',
                          frequency: configData.frequency,
                          isEnabled: configData.isEnabled,
                          notificationSettings: {
                            enabled: configData.notificationSettings.enabled,
                            templateId: configData.notificationSettings.templateId,
                            beforeDays: configData.notificationSettings.beforeDays,
                            time: configData.notificationSettings.time,
                            methods: configData.notificationSettings.methods as (
                              | 'email'
                              | 'zalo'
                              | 'sms'
                            )[],
                          },
                        };

                        const updatePayload = {
                          examType: examType.key as 'far' | 'near' | 'contrast' | 'stereopsis',
                          frequency: configData.frequency,
                          isEnabled: configData.isEnabled,
                          notificationSettings: {
                            enabled: configData.notificationSettings.enabled,
                            templateId: configData.notificationSettings.templateId,
                            beforeDays: configData.notificationSettings.beforeDays,
                            time: configData.notificationSettings.time,
                            methods: configData.notificationSettings.methods as (
                              | 'email'
                              | 'zalo'
                              | 'sms'
                            )[],
                          },
                          patientId: patient.id!,
                        };

                        if (existingConfig) {
                          await updateExamAssignment(patient.id!, existingConfig.id, updatePayload);
                        } else {
                          await createExamAssignment(patient.id!, createPayload);
                        }

                        showSnackbar(
                          t('patient.examConfig.saveSuccess', 'Cập nhật cấu hình thành công'),
                          SNACKBAR_SEVERITY.SUCCESS
                        );
                        onSuccess();
                      } catch (error: any) {
                        showSnackbar(
                          getErrorMessage(
                            error,
                            t('patient.examConfig.saveError', 'Có lỗi xảy ra khi lưu cấu hình')
                          ),
                          SNACKBAR_SEVERITY.ERROR
                        );
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || isSubmitting}
                    sx={{ mt: 2 }}
                  >
                    {t('common.save', 'Lưu')}
                  </Button>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button type="submit" variant="contained" disabled={loading || isSubmitting} size="large">
          {loading ? t('common.saving', 'Đang lưu...') : t('common.saveAll', 'Lưu tất cả')}
        </Button>

        <Button variant="outlined" onClick={() => reset()} disabled={loading} size="large">
          {t('common.reset', 'Đặt lại')}
        </Button>
      </Box>
    </form>
  );
};

export default ExamAssignmentForm;
