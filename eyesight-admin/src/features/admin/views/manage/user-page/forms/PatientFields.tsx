import { useCallback, useEffect, useMemo, useState } from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Grid, Typography, Box, FormControlLabel, Switch } from '@mui/material';
import FormTextField from 'src/components/forms/FormTextField';
import FormSelect from 'src/components/forms/FormSelect';
import FormAutocomplete from 'src/components/forms/FormAutocomplete';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';
import useAuth from 'src/contexts/authGuard/useAuth.tsx';
import { useTranslation } from 'src/hooks/useTranslation';
import { useAutocompleteOptions } from 'src/hooks/useAutocompleteOptions';
import { UserType, UnifiedUserFormData } from './user-form.types';
import { SEVERITY_LEVEL_OPTIONS } from './user-form.constants';
import { getDerivedTreatmentLabel } from './user-form.utils';
import * as userService from 'src/services/user.service';
import {
  getPatientActiveTreatmentPackage,
  getTreatmentPackages,
} from 'src/services/treatmentPackage.service';
import type { TreatmentPackage } from 'src/types/core';
import { Doctor } from 'src/types/core';

interface PatientFieldsProps {
  control: Control<UnifiedUserFormData>;
  values: UnifiedUserFormData;
  errors: FieldErrors<UnifiedUserFormData>;
  userType?: UserType;
  readOnly?: boolean;
}

/**
 * Patient-specific form fields component
 */
function PatientFields({ control, values, userType, readOnly = false }: PatientFieldsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.userType === 'admin';
  const currentUserType = userType || values.userType;
  const isCreate = !values.id;
  const canEditPackage = isAdmin && !readOnly;
  const [treatmentPackages, setTreatmentPackages] = useState<TreatmentPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [activePackageName, setActivePackageName] = useState<string | null>(null);

  const formatPackageLabel = useCallback((pkg: TreatmentPackage) => {
    const exerciseCount = pkg.exerciseCount ?? pkg.exerciseConfigIds?.length ?? 0;
    return `${pkg.name} (${exerciseCount} bài · ${pkg.durationDays} ngày)`;
  }, []);

  const packageOptions = useMemo(
    () =>
      treatmentPackages.map((pkg) => ({
        value: pkg.id,
        label: formatPackageLabel(pkg),
      })),
    [treatmentPackages, formatPackageLabel]
  );

  const selectedPackage = useMemo(
    () => treatmentPackages.find((pkg) => pkg.id === values.patient?.treatmentPackageId),
    [treatmentPackages, values.patient?.treatmentPackageId]
  );

  const packageHelpText = selectedPackage
    ? `Gói ${selectedPackage.name}: tối đa ${
        selectedPackage.exerciseCount ?? selectedPackage.exerciseConfigIds?.length ?? 0
      } chế độ tập, thời hạn ${selectedPackage.durationDays} ngày kể từ ngày gán.`
    : 'Chọn gói điều trị mặc định. Bác sĩ chỉ có thể giao các bài tập thuộc gói này.';

  useEffect(() => {
    if (currentUserType !== UserType.PATIENT) return;

    setLoadingPackages(true);
    getTreatmentPackages({ limit: 100, sortBy: 'id', order: 'asc' })
      .then((response) => setTreatmentPackages(response.rows))
      .catch(() => setTreatmentPackages([]))
      .finally(() => setLoadingPackages(false));
  }, [currentUserType]);

  useEffect(() => {
    if (currentUserType !== UserType.PATIENT || isCreate || !values.patient?.id) {
      setActivePackageName(null);
      return;
    }

    getPatientActiveTreatmentPackage(values.patient.id)
      .then((active) => {
        setActivePackageName(active?.treatmentPackage?.name ?? null);
      })
      .catch(() => setActivePackageName(null));
  }, [currentUserType, isCreate, values.patient?.id]);

  const showPackageSelect = isCreate || canEditPackage;

  // Stable references to prevent infinite re-trigger loop in useAutocompleteOptions
  const fetchDoctors = useCallback(async (searchTerm: string) => {
    const params: any = { limit: 20 };
    if (searchTerm && searchTerm.trim()) {
      params.name = searchTerm.trim();
    }
    return userService.getDoctors(params);
  }, []);

  const mapDoctorToOption = useCallback(
    (doctor: Doctor) => ({
      value: doctor.id || 0,
      label: `${doctor.code} - ${doctor.user?.name || 'N/A'}`,
    }),
    []
  );

  // Load doctors with autocomplete
  const doctors = useAutocompleteOptions({
    fetchFn: fetchDoctors,
    mapToOption: mapDoctorToOption,
    searchOnMount: true,
    initialSearch: '',
  });

  // Only render for patient user type
  if (currentUserType !== UserType.PATIENT) {
    return null;
  }

  return (
    <>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormAutocomplete
          name="patient.doctorId"
          control={control}
          label={t('patient.responsibleDoctor')}
          options={doctors.options}
          loading={doctors.loading}
          onInputChange={doctors.search}
          disabled={readOnly}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        {showPackageSelect ? (
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <LabelWithHelp
                help={
                  isCreate
                    ? packageHelpText
                    : 'Đổi gói sẽ gán lại thời hạn và gỡ các bài tập không thuộc gói mới.'
                }
              >
                {t('patient.treatmentPackage', 'Gói điều trị')}
                {isCreate ? ' *' : ''}
              </LabelWithHelp>
            </Typography>
            <FormSelect
              name="patient.treatmentPackageId"
              control={control}
              label=""
              disabled={readOnly || loadingPackages}
              options={[
                { value: '', label: t('common.select', 'Chọn') },
                ...packageOptions,
              ]}
            />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2">
              <LabelWithHelp help="Gói điều trị của bệnh nhân. Chỉ quản trị viên mới có thể thay đổi.">
                {t('patient.treatmentPackage', 'Gói điều trị')}
              </LabelWithHelp>
            </Typography>
            <Typography variant="body2">
              <strong>{activePackageName ?? t('common.notSet', 'Chưa gán')}</strong>
            </Typography>
          </Box>
        )}
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <FormSelect
          name="patient.severityLevel"
          control={control}
          label={t('patient.severityLevel', 'Mức độ nghiêm trọng')}
          disabled={readOnly}
          options={[
            { value: '', label: t('common.select') },
            ...SEVERITY_LEVEL_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            })),
          ]}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="body2">
            {t('patient.treatmentStatus', 'Trạng thái điều trị')}:{' '}
            <strong>
              {getDerivedTreatmentLabel(
                values.patient?.treatmentStatus ?? true,
                values.patient?.activeFrom,
                values.patient?.activeTo
              )}
            </strong>
          </Typography>

          <Controller
            name="patient.treatmentStatus"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={(field.value ?? true) === false}
                    onChange={(e) => field.onChange(!e.target.checked)}
                    disabled={readOnly}
                  />
                }
                label={t('patient.pauseTreatment', 'Tạm dừng điều trị')}
              />
            )}
          />
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <FormTextField
          name="patient.severityNotes"
          control={control}
          label={t('patient.severityNotes', 'Ghi chú')}
          multiline
          rows={3}
          disabled={readOnly}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <FormTextField
          name="patient.activeFrom"
          control={control}
          type="date"
          label={t('patient.treatmentStartDate', 'Ngày bắt đầu điều trị')}
          disabled={readOnly}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <FormTextField
          name="patient.activeTo"
          control={control}
          type="date"
          label={t('patient.treatmentEndDate', 'Ngày kết thúc dự kiến')}
          disabled={readOnly}
        />
      </Grid>
    </>
  );
}

export default PatientFields;
