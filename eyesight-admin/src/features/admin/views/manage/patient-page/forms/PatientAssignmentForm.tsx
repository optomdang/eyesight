import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  IconButton,
  Divider,
  MenuItem,
  FormControl,
  FormHelperText,
  InputLabel,
  Grid,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';
import { Close, Visibility } from '@mui/icons-material';
import { useForm, type FieldErrors } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslation } from 'src/hooks/useTranslation';
import type {
  ExerciseConfig,
  Exercise,
  Patient,
  NotificationSettings,
  ColorScheme,
} from 'src/types/core';
import useSnackbar from 'src/contexts/UseSnackbar';
import useAuth from 'src/contexts/authGuard/useAuth';
import { getErrorMessage } from 'src/utils/errorHandler';
import {
  SNACKBAR_SEVERITY,
  farVisionLevels,
  nearVisionLevels,
  contrastVisionLevels,
  stereopsisLevels,
} from 'src/utils/constant';
import { shouldShowFieldError } from 'src/utils';
import assignmentService from 'src/services/assignment.service';
import * as exerciseService from 'src/services/exercise.service';
import * as PatientService from 'src/services/patient.service';
import {
  BasicConfigFields,
  PreviewDialog,
  NotificationSettingsFields,
  ConfigurationSelector,
  VtQuestSettingsFields,
} from 'src/components/shared/exercise-config';
import { resolveVtSettingsForExerciseType } from 'src/components/exercises/vt/core/vtExerciseTypes';
import type { VtSettings } from 'src/types/core/vtQuest';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { patientAssignmentFormSchema, type PatientAssignmentFormData } from 'src/validations';
import { normalizeExerciseConfigPayload } from 'src/utils/exerciseConfigPayload';
import { fetchPatientWithCausesCheck } from 'src/utils/patientClinicalPrerequisites';
import { getPatientActiveTreatmentPackage } from 'src/services/treatmentPackage.service';

const sortExerciseConfigs = (rows: ExerciseConfig[]) => {
  const typeOrder: Record<string, number> = { admin: 0, doctor: 1, patient: 2 };
  return [...rows].sort((a, b) => {
    const aOrder = typeOrder[a.configType] ?? 99;
    const bOrder = typeOrder[b.configType] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

const filterConfigsByPackage = (configs: ExerciseConfig[], allowedIds: number[] | null) => {
  if (!allowedIds?.length) return configs;
  return configs.filter((config) => config.id != null && allowedIds.includes(config.id));
};

const TEMPLATE_OVERRIDE_FIELDS = new Set([
  'duration',
  'distance',
  'frequency',
  'executionCount',
  'inactivityThreshold',
  'visionType',
  'colorScheme',
  'notificationSettings',
  'vtSettings',
]);

const templateConfigDiffersFromForm = (
  data: PatientAssignmentFormData,
  template: ExerciseConfig | null
): boolean => {
  if (!template) return false;

  if (Number(data.duration) !== Number(template.duration)) return true;
  if (Number(data.distance) !== Number(template.distance)) return true;
  if (data.frequency !== template.frequency) return true;
  if (Number(data.executionCount) !== Number(template.executionCount)) return true;
  if (Number(data.inactivityThreshold ?? 30) !== Number(template.inactivityThreshold ?? 30)) return true;
  if ((data.visionType || 'far') !== (template.visionType || 'far')) return true;

  if (JSON.stringify(data.colorScheme ?? null) !== JSON.stringify(template.colorScheme ?? null)) {
    return true;
  }
  if (
    JSON.stringify(data.notificationSettings ?? null) !==
    JSON.stringify(template.notificationSettings ?? null)
  ) {
    return true;
  }

  const formVt = (data as { vtSettings?: Partial<VtSettings> }).vtSettings;
  const templateVt = (template as { vtSettings?: Partial<VtSettings> }).vtSettings;
  if (JSON.stringify(formVt ?? null) !== JSON.stringify(templateVt ?? null)) {
    return true;
  }

  return false;
};

interface PatientAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  patient: Patient;
  assignmentId?: number | string | null; // Optional - for edit mode
  onAssign: () => void;
}

const PatientAssignmentModal: React.FC<PatientAssignmentModalProps> = ({
  open,
  onClose,
  patient,
  assignmentId,
  onAssign,
}) => {
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const isDoctor = user?.userType === 'doctor';

  // State for data loading
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ExerciseConfig | null>(null);
  const [availableConfigs, setAvailableConfigs] = useState<ExerciseConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [allowedConfigIds, setAllowedConfigIds] = useState<number[] | null>(null);
  const [activePackageName, setActivePackageName] = useState<string | null>(null);

  const isEditMode = Boolean(assignmentId);

  // React Hook Form setup
  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<PatientAssignmentFormData>({
    resolver: yupResolver(patientAssignmentFormSchema),
    defaultValues: {
      exerciseId: undefined,
      exerciseConfigId: null,
      configReferentId: null,
      notes: '',
      createCustomConfig: false,
      // Config defaults
      name: '',
      eye: 'left',
      distance: 3.0,
      duration: 30,
      frequency: 'daily',
      executionCount: 1,
      inactivityThreshold: 30,
      colorScheme: { preset: 'whiteBlack', textColor: '#000000', backgroundColor: '#ffffff' },
      // Vision Configuration defaults
      visionType: 'far',
      visionLevel: null,
      levelOverride: false,
      // Notification Settings defaults
      notificationSettings: {
        enabled: false,
        templateId: null,
        methods: [],
        maxReminders: 3,
        reminderDaysInterval: 1,
        reminderFrequency: 'daily',
        reminderTime: '08:00',
      },
      vtSettings: undefined as Partial<VtSettings> | undefined,
    },
  });
  const values = watch();
  const touched = touchedFields;

  const selectedExerciseType =
    availableExercises.find((ex) => ex.id === values.exerciseId)?.exerciseType ?? null;

  const setFormValue = (field: string, value: any) => {
    setValue(field as any, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const ensureCustomConfigName = () => {
    if (values.name?.trim()) return;
    const exercise = availableExercises.find((ex) => ex.id === values.exerciseId);
    setFormValue('name', exercise ? `${exercise.name} — ${patient.code}` : patient.code);
  };

  const enableCustomConfigFromTemplate = () => {
    if (values.createCustomConfig) return;
    setFormValue('createCustomConfig', true);
    const referentId =
      values.configReferentId ?? values.exerciseConfigId ?? selectedConfig?.id ?? null;
    if (referentId) {
      setFormValue('configReferentId', referentId);
    }
    ensureCustomConfigName();
  };

  const handleConfigFieldChange = (field: string, value: unknown) => {
    setFormValue(field, value);

    if (isDoctor || !TEMPLATE_OVERRIDE_FIELDS.has(field) || !selectedConfig) {
      return;
    }

    const nextValues = { ...values, [field]: value } as PatientAssignmentFormData;
    if (templateConfigDiffersFromForm(nextValues, selectedConfig)) {
      enableCustomConfigFromTemplate();
    }
  };

  // Get vision level options based on visionType
  const getVisionOptions = () => {
    if (!values.visionType) return [];

    switch (values.visionType) {
      case 'far':
        return farVisionLevels.map((v) => ({ value: v.level, label: v.score }));
      case 'near':
        return nearVisionLevels.map((v) => ({ value: v.level, label: v.score }));
      case 'contrast':
        return contrastVisionLevels.map((v) => ({
          value: v.level,
          label: v.score,
        }));
      case 'stereopsis':
        return stereopsisLevels.map((v) => ({ value: v.level, label: v.score }));
      default:
        return [];
    }
  };

  const visionOptions = getVisionOptions();

  const onInvalid = (formErrors: FieldErrors<PatientAssignmentFormData>) => {
    const firstError = Object.values(formErrors).find((e) => e && typeof e === 'object' && 'message' in e);
    const message =
      (firstError as { message?: string })?.message ??
      t('common.formInvalid', 'Vui lòng kiểm tra lại các trường bắt buộc');
    showSnackbar(String(message), SNACKBAR_SEVERITY.WARNING);
  };

  const onSubmit = async (data: PatientAssignmentFormData) => {
    const causesCheck = await fetchPatientWithCausesCheck(patient.id);
    if (!causesCheck.ok) {
      showSnackbar(causesCheck.message, SNACKBAR_SEVERITY.WARNING);
      return;
    }
    try {
      setLoading(true);
      const levelOverrideEnabled = data.levelOverride === true;
      const effectiveVisionLevel = levelOverrideEnabled ? (data.visionLevel ?? null) : null;
      const needsCustomConfig =
        data.createCustomConfig ||
        (selectedConfig != null && templateConfigDiffersFromForm(data, selectedConfig));

      if (needsCustomConfig && isDoctor) {
        showSnackbar(
          t(
            'assignment.customConfigRequired',
            'Thay đổi thời lượng/cấu hình cần tạo cấu hình tùy chỉnh — chỉ quản trị viên có quyền này'
          ),
          SNACKBAR_SEVERITY.WARNING
        );
        return;
      }

      if (needsCustomConfig) {
        const referentId =
          data.configReferentId ?? data.exerciseConfigId ?? selectedConfig?.id ?? availableConfigs[0]?.id ?? null;
        const exerciseType =
          availableExercises.find((ex) => ex.id === data.exerciseId)?.exerciseType ?? null;
        const configName =
          data.name?.trim() ||
          (() => {
            const exercise = availableExercises.find((ex) => ex.id === data.exerciseId);
            return exercise ? `${exercise.name} — ${patient.code}` : patient.code;
          })();
        const configPayload = normalizeExerciseConfigPayload({
          name: configName,
          eye: data.eye,
          distance: data.distance,
          duration: data.duration,
          frequency: data.frequency,
          executionCount: data.executionCount,
          colorScheme: data.colorScheme,
          configType: 'doctor',
          exerciseId: data.exerciseId!,
          configReferentId: referentId,
          visionType: data.visionType,
          inactivityThreshold: data.inactivityThreshold ?? 30,
          notificationSettings: data.notificationSettings,
          vtSettings: resolveVtSettingsForExerciseType(
            exerciseType,
            (data as PatientAssignmentFormData & { vtSettings?: Partial<VtSettings> }).vtSettings
          ),
        });

        const newConfig = await exerciseService.createExerciseConfig(
          data.exerciseId!,
          configPayload as Parameters<typeof exerciseService.createExerciseConfig>[1]
        );

        if (isEditMode) {
          // In edit mode: update assignment to use new config
          const updateData = {
            id: Number(assignmentId),
            exerciseConfigId: newConfig.id,
            notes: data.notes,
            visionLevel: effectiveVisionLevel,
            levelOverride: levelOverrideEnabled,
            trainingEye: data.eye,
          };
          await PatientService.updatePatientAssignment(
            patient.id,
            Number(assignmentId),
            updateData
          );
          showSnackbar(
            t(
              'assignment.createAndUpdateSuccess',
              'Tạo cấu hình mới và cập nhật phân công thành công'
            ),
            SNACKBAR_SEVERITY.SUCCESS
          );
        } else {
          // New assignment: assign config with patient-specific vision overrides
          await assignmentService.assignConfigToPatients(newConfig.id, {
            patientIds: [patient.id],
            visionLevel: effectiveVisionLevel,
            levelOverride: levelOverrideEnabled,
            trainingEye: data.eye,
          });
          showSnackbar(t('patient.assignment.createSuccess'), SNACKBAR_SEVERITY.SUCCESS);
        }
      } else if (isEditMode) {
        // Per-patient fields only — do not PATCH shared exercise configs (admin templates
        // are not writable by doctors; use "Tạo cấu hình tùy chỉnh" to clone settings).
        const updateData = {
          id: Number(assignmentId),
          notes: data.notes,
          visionLevel: effectiveVisionLevel,
          levelOverride: levelOverrideEnabled,
          trainingEye: data.eye,
        };

        await PatientService.updatePatientAssignment(patient.id, Number(assignmentId), updateData);

        showSnackbar(
          t('assignment.updateSuccess', 'Cập nhật phân công thành công'),
          SNACKBAR_SEVERITY.SUCCESS
        );
      } else {
        // Assign existing config with patient-specific vision overrides
        await assignmentService.assignConfigToPatients(data.exerciseConfigId!, {
          patientIds: [patient.id],
          visionLevel: effectiveVisionLevel,
          levelOverride: levelOverrideEnabled,
          trainingEye: data.eye,
        });
        showSnackbar(t('patient.assignment.success', { count: 1 }), SNACKBAR_SEVERITY.SUCCESS);
      }

      onAssign();
      onClose();
    } catch (error) {
      showSnackbar(getErrorMessage(error, t('patient.assignment.error')), SNACKBAR_SEVERITY.ERROR);
    } finally {
      setLoading(false);
    }
  };

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadExercises();
      getPatientActiveTreatmentPackage(patient.id)
        .then((active) => {
          setAllowedConfigIds(active?.allowedConfigIds ?? null);
          setActivePackageName(active?.treatmentPackage?.name ?? null);
        })
        .catch(() => {
          setAllowedConfigIds(null);
          setActivePackageName(null);
        });
      if (isEditMode && assignmentId) {
        loadAssignmentData();
      } else {
        // Reset to default values for create mode
        reset({
          exerciseId: undefined,
          exerciseConfigId: null,
          configReferentId: null,
          notes: '',
          createCustomConfig: false,
          name: '',
          eye: 'left',
          distance: 3.0,
          duration: 30,
          frequency: 'daily',
          executionCount: 1,
          inactivityThreshold: 30,
          colorScheme: { preset: 'whiteBlack', textColor: '#000000', backgroundColor: '#ffffff' },
          visionType: 'far',
          visionLevel: null,
          levelOverride: false,
          notificationSettings: {
            enabled: false,
            templateId: null,
            methods: [],
            maxReminders: 3,
            reminderDaysInterval: 1,
            reminderFrequency: 'daily',
            reminderTime: '08:00',
          },
          vtSettings: undefined,
        });
        setSelectedConfig(null);
        setAvailableConfigs([]);
      }
    } else {
      setAllowedConfigIds(null);
      setActivePackageName(null);
    }
  }, [open, isEditMode, assignmentId, reset]);

  // Load assignment data for edit mode
  const loadAssignmentData = async () => {
    if (!assignmentId) return;

    setLoadingAssignment(true);
    try {
      const response = await PatientService.getPatientAssignment(patient.id, Number(assignmentId));
      if (response?.data) {
        const assignmentData = response.data;
        // Set form values with assignment data
        reset({
          exerciseId: assignmentData.exerciseConfig?.exerciseId,
          exerciseConfigId: assignmentData.exerciseConfigId ?? null,
          configReferentId: assignmentData.exerciseConfigId ?? null,
          notes: assignmentData.notes || '',
          createCustomConfig: false,
          name: assignmentData.exerciseConfig?.name || '',
          eye: (assignmentData.trainingEye ?? assignmentData.exerciseConfig?.eye) || 'left',
          distance: assignmentData.exerciseConfig?.distance || 3,
          duration: assignmentData.exerciseConfig?.duration || 30,
          frequency: assignmentData.exerciseConfig?.frequency || 'daily',
          executionCount: assignmentData.exerciseConfig?.executionCount || 1,
          inactivityThreshold: assignmentData.exerciseConfig?.inactivityThreshold ?? 30,
          colorScheme: assignmentData.exerciseConfig?.colorScheme || {
            preset: 'whiteBlack',
            textColor: '#000000',
            backgroundColor: '#ffffff',
          },
          visionType: assignmentData.exerciseConfig?.visionType || 'far',
          visionLevel:
            assignmentData.levelOverride === true ? (assignmentData.visionLevel ?? null) : null,
          levelOverride: assignmentData.levelOverride ?? false,
          notificationSettings: assignmentData.exerciseConfig?.notificationSettings || {
            enabled: false,
            templateId: null,
            methods: [],
            maxReminders: 3,
            reminderDaysInterval: 1,
            reminderFrequency: 'daily',
            reminderTime: '08:00',
          },
          vtSettings:
            (assignmentData.exerciseConfig as { vtSettings?: Partial<VtSettings> } | undefined)
              ?.vtSettings ?? undefined,
        });

        // Load configs for the exercise if exerciseId exists
        if (assignmentData.exerciseConfig?.exerciseId) {
          const response = await exerciseService.getExerciseConfigs({
            exerciseId: assignmentData.exerciseConfig.exerciseId,
            limit: 100,
          });
          setAvailableConfigs(
            filterConfigsByPackage(sortExerciseConfigs(response.rows), allowedConfigIds)
          );

          // Set selectedConfig to current config for edit mode
          setSelectedConfig(assignmentData.exerciseConfig);
        }
      }
    } catch {
      showSnackbar(
        t('assignment.loadError', 'Lỗi khi tải thông tin bài tập'),
        SNACKBAR_SEVERITY.ERROR
      );
    } finally {
      setLoadingAssignment(false);
    }
  };

  // Load exercises from API
  const loadExercises = async () => {
    setLoadingExercises(true);
    try {
      const response = await exerciseService.getExercises();
      setAvailableExercises(response.rows);
    } catch {
      showSnackbar(t('exercise.loadError'), SNACKBAR_SEVERITY.ERROR);
      setAvailableExercises([]);
    } finally {
      setLoadingExercises(false);
    }
  };

  useEffect(() => {
    if (!open || !values.exerciseId) return;

    exerciseService
      .getExerciseConfigs({ exerciseId: values.exerciseId, limit: 100 })
      .then((response) => {
        setAvailableConfigs(
          filterConfigsByPackage(sortExerciseConfigs(response.rows), allowedConfigIds)
        );
      })
      .catch(() => setAvailableConfigs([]));
  }, [allowedConfigIds, open, values.exerciseId]);

  const handleExerciseSelect = (event: any) => {
    const { value: exerciseId } = event.target;

    if (exerciseId) {
      exerciseService
        .getExerciseConfigs({ exerciseId, limit: 100 })
        .then((response) => {
          setAvailableConfigs(
            filterConfigsByPackage(sortExerciseConfigs(response.rows), allowedConfigIds)
          );
        })
        .catch(() => setAvailableConfigs([]));
    } else {
      setAvailableConfigs([]);
    }
    setFormValue('exerciseId', exerciseId);
  };

  const handleConfigSelect = (configId: number | null) => {
    const config = availableConfigs.find((c) => c.id === configId) || null;
    setSelectedConfig(config);
    setFormValue('exerciseConfigId', configId);
    if (configId) {
      setFormValue('configReferentId', configId);
    }

    // Sync config values to form for preview
    if (config) {
      setFormValue('visionType', config.visionType || 'far');
      setFormValue('distance', config.distance || 3.0);
      setFormValue('colorScheme', config.colorScheme || values.colorScheme);
      setFormValue('eye', config.eye || 'left');
      setFormValue('duration', config.duration || 30);
      setFormValue('frequency', config.frequency || 'daily');
      setFormValue('executionCount', config.executionCount || 1);
      setFormValue('inactivityThreshold', config.inactivityThreshold ?? 30);

      // Load notification settings from selected config
      if (config.notificationSettings) {
        setFormValue('notificationSettings', config.notificationSettings);
      }
      setFormValue(
        'vtSettings',
        (config as { vtSettings?: Partial<VtSettings> }).vtSettings ?? undefined
      );
    }
  };
  const handleCustomConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDoctor) return;
    const checked = e.target.checked;
    setFormValue('createCustomConfig', checked);
    if (checked) {
      const referentId = values.exerciseConfigId || availableConfigs[0]?.id || null;
      if (referentId) {
        setFormValue('configReferentId', referentId);
      }
      if (!values.name?.trim()) {
        const exercise = availableExercises.find((ex) => ex.id === values.exerciseId);
        if (exercise) {
          setFormValue('name', `${exercise.name} — ${patient.code}`);
        }
      }
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {isEditMode
                ? t('assignment.editTitle', 'Chỉnh sửa phân công')
                : t('patient.assignment.title')}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
          {patient && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('patient.name')}: {patient.user?.name} ({patient.code})
            </Typography>
          )}
        </DialogTitle>

        <DialogContent dividers>
          {activePackageName && allowedConfigIds?.length ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Gói điều trị <strong>{activePackageName}</strong>: chỉ được giao tối đa{' '}
              {allowedConfigIds.length} chế độ tập thuộc gói này.
            </Alert>
          ) : null}
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* STEP 1: Exercise Selection */}
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('config.exercise')}</InputLabel>
                <CustomSelect
                  value={values.exerciseId || ''}
                  onChange={handleExerciseSelect}
                  label={t('config.exercise')}
                  error={shouldShowFieldError(errors.exerciseId, touched.exerciseId)}
                  disabled={loadingExercises}
                >
                  {availableExercises.map((exercise) => (
                    <MenuItem key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </MenuItem>
                  ))}
                </CustomSelect>
                {shouldShowFieldError(errors.exerciseId, touched.exerciseId) && (
                  <FormHelperText error>{errors.exerciseId?.message as string}</FormHelperText>
                )}
              </FormControl>
            </Box>

            {/* STEP 2: Config Selection (when exercise is selected) */}
            {values.exerciseId && (
              <Box sx={{ mb: 3 }}>
                <ConfigurationSelector
                  availableConfigs={availableConfigs}
                  value={values.exerciseConfigId || null}
                  onChange={handleConfigSelect}
                  disabled={false}
                />

                {/* Custom Config Toggle */}
                <Box sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={values.createCustomConfig}
                        onChange={handleCustomConfigChange}
                        color="primary"
                        disabled={isDoctor}
                      />
                    }
                    label={t('config.createCustomConfig', 'Tạo cấu hình tùy chỉnh')}
                  />
                  {!values.createCustomConfig && values.exerciseConfigId ? (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Bật &quot;Tạo cấu hình tùy chỉnh&quot; để đổi thời lượng và các thông số mẫu.
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            )}

            {values.createCustomConfig && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t('config.customizeSettings', 'Tùy chỉnh cấu hình')}
                </Typography>
                <Grid size={12}>
                  <CustomTextField
                    fullWidth
                    label={t('config.name')}
                    value={values.name || ''}
                    onChange={(e: any) => setFormValue('name', e.target.value)}
                    error={shouldShowFieldError(errors.name, touched.name)}
                    helperText={
                      shouldShowFieldError(errors.name, touched.name)
                        ? (errors.name?.message as string)
                        : ''
                    }
                    size="small"
                  />
                </Grid>
              </Box>
            )}
            {/* STEP 3: Config Preview/Edit */}
            {(isEditMode || values.createCustomConfig || values.exerciseConfigId) && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {isEditMode
                    ? t('assignment.configInfo', 'Thông tin cấu hình')
                    : values.createCustomConfig
                      ? t('config.customizeSettings', 'Tùy chỉnh cấu hình')
                      : t('config.preview', 'Xem trước cấu hình')}
                </Typography>
                <BasicConfigFields
                  values={values}
                  errors={errors}
                  touched={touched}
                  isSubmitted={isSubmitted}
                  onFieldChange={handleConfigFieldChange}
                  exercises={availableExercises}
                  exerciseName={
                    availableExercises.find((ex) => ex.id === values.exerciseId)?.name ?? null
                  }
                  lockTemplateFields={
                    !values.createCustomConfig && Boolean(values.exerciseConfigId)
                  }
                />
                {/* Patient-specific Vision Level Override Section */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {t('assignment.patientVisionOverride', 'Cấp độ thị lực cho bệnh nhân')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={values.levelOverride === true}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormValue('levelOverride', checked);
                            if (!checked) {
                              setFormValue('visionLevel', null);
                            }
                          }}
                          size="small"
                        />
                      }
                      label={t('config.overrideVisionLevel', 'Ghi đè cấp độ')}
                    />
                    {values.levelOverride && visionOptions.length > 0 && (
                      <TextField
                        select
                        size="small"
                        label={t('config.visionLevel', 'Cấp độ thị lực')}
                        value={values.visionLevel ?? ''}
                        onChange={(e: any) => {
                          const val = e.target.value;
                          setFormValue('visionLevel', val === '' ? null : Number(val));
                        }}
                        error={shouldShowFieldError(errors.visionLevel, touched.visionLevel)}
                        helperText={
                          shouldShowFieldError(errors.visionLevel, touched.visionLevel)
                            ? (errors.visionLevel?.message as string)
                            : ''
                        }
                        sx={{ minWidth: 200 }}
                      >
                        {visionOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </Box>
                </Box>
                {/* Notification Settings Section - show when creating custom config or viewing existing config */}
                {(values.createCustomConfig || selectedConfig) && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {t('exercise.notificationSettingsTab', 'Cấu hình thông báo')}
                    </Typography>
                    <NotificationSettingsFields
                      isReadOnly={!values.createCustomConfig}
                      config={values}
                      onFieldChange={handleConfigFieldChange}
                    />
                  </Box>
                )}
                <VtQuestSettingsFields
                  exerciseType={selectedExerciseType}
                  vtSettings={
                    values.createCustomConfig
                      ? (values as { vtSettings?: Partial<VtSettings> }).vtSettings
                      : (selectedConfig as { vtSettings?: Partial<VtSettings> } | null)?.vtSettings ??
                        (values as { vtSettings?: Partial<VtSettings> }).vtSettings
                  }
                  onChange={(vt) => handleConfigFieldChange('vtSettings', vt)}
                  readOnly={!values.createCustomConfig}
                />
                {/* Preview Button */}
                {values.exerciseId && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
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
                )}
              </Box>
            )}

            <Divider sx={{ my: 3 }} />
            <TextField
              fullWidth
              multiline
              rows={3}
              label={t('patient.assignment.notes')}
              value={values.notes}
              onChange={(e) => setValue('notes', e.target.value)}
              placeholder={t('patient.assignment.notesPlaceholder')}
              size="small"
            />
          </form>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>

          {/* Show assign/create buttons only when exercise is selected or in edit mode */}
          {(isEditMode || values.exerciseId) && (
            <Button
              type="submit"
              variant="contained"
              onClick={handleSubmit(onSubmit, onInvalid)}
              disabled={
                loading ||
                loadingAssignment ||
                !patient ||
                (!isEditMode && !values.createCustomConfig && !values.exerciseConfigId)
              }
            >
              {loading || loadingAssignment
                ? t('common.loading')
                : values.createCustomConfig
                  ? t('patient.assignment.createAndAssign')
                  : isEditMode
                    ? t('assignment.update', 'Cập nhật')
                    : t('patient.assignment.assign')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      {previewOpen && (
        <PreviewDialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          exercise={availableExercises.find((ex) => ex.id === values.exerciseId) || null}
          visionType={values.visionType}
          distance={values.distance}
          colorScheme={values.colorScheme}
          eye={values.eye}
          duration={values.duration}
          vtSettings={
            (values.createCustomConfig
              ? (values as { vtSettings?: Partial<import('src/types/core/vtQuest').VtSettings> }).vtSettings
              : (selectedConfig as { vtSettings?: Partial<import('src/types/core/vtQuest').VtSettings> } | null)
                  ?.vtSettings) ?? undefined
          }
          initialVisionLevel={
            values.levelOverride === true && values.visionLevel != null && values.visionLevel !== ''
              ? Number(values.visionLevel)
              : undefined
          }
          inactivityThreshold={
            values.createCustomConfig
              ? values.inactivityThreshold
              : selectedConfig?.inactivityThreshold
          }
        />
      )}
    </>
  );
};

export default PatientAssignmentModal;
