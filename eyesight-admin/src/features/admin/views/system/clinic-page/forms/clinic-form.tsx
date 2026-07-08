import React, { useCallback, useEffect } from 'react';
import { Grid, Button, Dialog, DialogTitle, DialogActions, DialogContent } from '@mui/material';
import { useForm, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import useDataTable from 'src/contexts/data-context/useDataTable';
import FormTextField from 'src/components/forms/FormTextField';
import { Clinic, FormDialogProps } from 'src/types/core';
import { generateCode } from 'src/utils';
import { useTranslation } from 'src/hooks/useTranslation';
import { clinicSchema, type ClinicFormData } from 'src/validations';

function ClinicModal({ open, onClose, rowData }: FormDialogProps): React.JSX.Element {
  const { createData, updateData, getRecordData, fetchData } = useDataTable<Clinic>();
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: yupResolver(clinicSchema) as Resolver<ClinicFormData>,
    defaultValues: {
      id: 0,
      name: '',
      code: generateCode('I'),
      phoneNumber: '',
      address: '',
    },
  });

  useEffect(() => {
    const handleGetDate = async () => {
      if (rowData && open) {
        const data = await getRecordData(rowData);
        reset({
          id: data.id || 0,
          name: data.name || '',
          code: data.code || '',
          phoneNumber: data.phoneNumber || '',
          address: data.address || '',
        });
      } else if (!rowData && open) {
        // Reset to default values for create mode with new code
        reset({
          id: 0,
          name: '',
          code: generateCode('I'),
          phoneNumber: '',
          address: '',
        });
      }
    };
    void handleGetDate();
  }, [getRecordData, rowData, open, reset]);

  const onSubmit = async (values: ClinicFormData) => {
    try {
      if (values?.id) {
        // Cập nhật phòng khám
        await updateData(values.id, values);
      } else {
        // Tạo phòng khám mới - remove id field
        const { id, ...createPayload } = values;
        await createData(createPayload);
      }
      onClose();
      fetchData();
    } catch (error) {
      console.error('Error submitting clinic:', error);
    }
  };

  const handleClose = useCallback(() => {
    onClose();
    reset();
  }, [onClose, reset]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {rowData ? t('form.update') : t('form.create')} {t('clinic.title')}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField name="name" control={control} label={t('clinic.name') + ' *'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField name="code" control={control} label={t('common.code') + ' *'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField name="phoneNumber" control={control} label={t('clinic.phone')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField name="address" control={control} label={t('clinic.address')} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handleClose}>
            {t('form.close')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            type="submit"
            disabled={isSubmitting}
          >
            {rowData ? t('form.update') : t('form.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default ClinicModal;
