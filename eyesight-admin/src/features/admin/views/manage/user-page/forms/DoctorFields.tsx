import React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import { Grid } from '@mui/material';
import FormTextField from 'src/components/forms/FormTextField';
import FormSelect from 'src/components/forms/FormSelect';
import { useTranslation } from 'src/hooks/useTranslation';
import { UserType, UnifiedUserFormData } from './user-form.types';
import { SPECIALIZATION_OPTIONS, QUALIFICATION_OPTIONS } from './user-form.constants';

interface DoctorFieldsProps {
  control: Control<UnifiedUserFormData>;
  values: UnifiedUserFormData;
  errors: FieldErrors<UnifiedUserFormData>;
  userType?: UserType;
  readOnly?: boolean;
}

/**
 * Doctor-specific form fields component
 */
function DoctorFields({ control, values, errors, userType, readOnly = false }: DoctorFieldsProps) {
  const { t } = useTranslation();
  const currentUserType = userType || values.userType;

  // Only render for doctor user type
  if (currentUserType !== UserType.DOCTOR) {
    return null;
  }

  return (
    <>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormSelect
          name="doctor.specialization"
          control={control}
          label={t('doctor.specialization', 'Chuyên khoa') + ' *'}
          disabled={readOnly}
          options={[
            { value: '', label: t('common.select') },
            ...SPECIALIZATION_OPTIONS.map((opt) => ({
              value: opt.value,
              label: t(opt.label, opt.defaultLabel),
            })),
          ]}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <FormTextField
          name="doctor.licenseNumber"
          control={control}
          label={t('doctor.licenseNumber', 'Số giấy phép hành nghề')}
          disabled={readOnly}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <FormSelect
          name="doctor.qualification"
          control={control}
          label={t('doctor.qualification', 'Trình độ')}
          disabled={readOnly}
          options={[
            { value: '', label: t('common.select') },
            ...QUALIFICATION_OPTIONS.map((opt) => ({
              value: opt.value,
              label: t(opt.label, opt.defaultLabel),
            })),
          ]}
        />
      </Grid>
    </>
  );
}

export default DoctorFields;
