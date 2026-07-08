import React, { useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useForm, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import useDataTable from 'src/contexts/data-context/useDataTable';
import FormTextField from 'src/components/forms/FormTextField';
import FormAutocomplete from 'src/components/forms/FormAutocomplete';
import { useAutocompleteOptions } from 'src/hooks/useAutocompleteOptions';
import { Doctor, FormDialogProps, Clinic, User } from 'src/types/core';
import * as userService from 'src/services/user.service';
import { generateCode } from 'src/utils';
import { doctorSchema, type DoctorFormData } from 'src/validations';

interface DoctorFormProps extends FormDialogProps {
  rowData?: string | number | null;
}

const DoctorForm: React.FC<DoctorFormProps> = ({ open, onClose, rowData }) => {
  const { t } = useTranslation();
  const { createData, updateData, getRecordData, fetchData } = useDataTable<Doctor>();
  const isEdit = useMemo(() => Boolean(rowData), [rowData]);

  // Stable references to prevent infinite re-trigger in useAutocompleteOptions
  const fetchUsers = useCallback(
    async (searchTerm: string) => userService.getUsers({ email: searchTerm, limit: 20 }),
    []
  );
  const mapUserToOption = useCallback(
    (user: User) => ({ value: user.id || 0, label: user.email }),
    []
  );
  const fetchClinics = useCallback(
    async (searchTerm: string) => userService.getClinics({ name: searchTerm, limit: 20 }),
    []
  );
  const mapClinicToOption = useCallback(
    (clinic: Clinic) => ({ value: clinic.id || 0, label: clinic.name }),
    []
  );

  // Autocomplete with debounce for users
  const users = useAutocompleteOptions({
    fetchFn: fetchUsers,
    mapToOption: mapUserToOption,
    searchOnMount: true,
    initialSearch: '',
  });

  // Autocomplete with debounce for clinics
  const clinics = useAutocompleteOptions({
    fetchFn: fetchClinics,
    mapToOption: mapClinicToOption,
    searchOnMount: true,
    initialSearch: '',
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<DoctorFormData>({
    resolver: yupResolver(doctorSchema) as Resolver<DoctorFormData>,
    defaultValues: {
      id: 0,
      code: generateCode('DT'),
      specialization: '',
      licenseNumber: '',
      experience: 0,
      qualification: '',
      userId: '',
      clinicId: '',
    },
  });

  const onSubmit = async (values: DoctorFormData) => {
    try {
      if (isEdit && rowData) {
        await updateData(rowData, values);
      } else {
        // Remove id field for create
        const { id, ...createPayload } = values;
        await createData(createPayload);
      }
      reset();
      onClose();
      fetchData();
    } catch (error) {
      console.error('Error submitting doctor form:', error);
    }
  };

  // Load data for edit
  useEffect(() => {
    const loadDoctorData = async () => {
      if (isEdit && rowData && open) {
        try {
          const doctorData = await getRecordData(rowData);
          reset({
            id: doctorData.id || 0,
            code: doctorData.code || '',
            specialization: doctorData.specialization || '',
            licenseNumber: doctorData.licenseNumber || '',
            experience: doctorData.experience || 0,
            qualification: doctorData.qualification || '',
            userId: doctorData.userId || '',
            clinicId: doctorData.clinicId || '',
          });
        } catch (error) {
          console.error('Error loading doctor data:', error);
        }
      } else if (!isEdit && open) {
        reset({
          id: 0,
          code: generateCode('DT'),
          specialization: '',
          licenseNumber: '',
          experience: 0,
          qualification: '',
          userId: '',
          clinicId: '',
        });
      }
    };

    loadDoctorData();
  }, [isEdit, rowData, open, getRecordData, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{isEdit ? t('doctor.updateTitle') : t('doctor.createTitle')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Professional Information */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField
                name="specialization"
                control={control}
                label={t('doctor.specialization') + ' *'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField
                name="licenseNumber"
                control={control}
                label={t('doctor.licenseNumber') + ' *'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField
                name="experience"
                control={control}
                label={t('doctor.experienceYears')}
                type="number"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField
                name="qualification"
                control={control}
                label={t('doctor.qualification')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormAutocomplete
                name="clinicId"
                control={control}
                label={t('doctor.clinic')}
                options={clinics.options}
                loading={clinics.loading}
                onInputChange={clinics.search}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormAutocomplete
                name="userId"
                control={control}
                label={t('doctor.username')}
                options={users.options}
                loading={users.loading}
                onInputChange={users.search}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleClose} variant="outlined" size="small">
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="small"
            disabled={isSubmitting}
          >
            {isEdit ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default DoctorForm;
