import React, { useCallback, useEffect } from 'react';
import { Grid, Button, Dialog, DialogTitle, DialogActions, DialogContent } from '@mui/material';
import { useForm, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import useDataTable from 'src/contexts/data-context/useDataTable';
import FormTextField from 'src/components/forms/FormTextField';
import { Center, FormDialogProps } from 'src/types/core';
import { generateCode } from 'src/utils';
import { useCenter } from 'src/contexts/CenterContext';
import { useTranslation } from 'src/hooks/useTranslation';
import { centerSchema, type CenterFormData } from 'src/validations';

function CenterModal({ open, onClose, rowData }: FormDialogProps): React.JSX.Element {
  const { createData, updateData, getRecordData, fetchData } = useDataTable<Center>();
  const { refreshCenters } = useCenter();
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CenterFormData>({
    resolver: yupResolver(centerSchema) as Resolver<CenterFormData>,
    defaultValues: {
      id: 0,
      name: '',
      code: generateCode('E'),
      phoneNumber: '',
      address: '',
      logo: '',
      option: {},
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
          logo: data.logo || '',
          option: data.option || {},
        });
      } else if (!rowData && open) {
        // Reset to default values for create mode with new code
        reset({
          id: 0,
          name: '',
          code: generateCode('E'),
          phoneNumber: '',
          address: '',
          logo: '',
          option: {},
        });
      }
    };
    void handleGetDate();
  }, [getRecordData, rowData, open, reset]);

  const onSubmit = async (values: CenterFormData) => {
    try {
      if (values?.id) {
        // Cập nhật trung tâm
        await updateData(values.id, values);
      } else {
        // Tạo trung tâm mới - remove id field
        const { id, ...createPayload } = values;
        await createData(createPayload);
      }
      onClose();
      fetchData();
      refreshCenters();
    } catch (error) {
      console.error('Error submitting center:', error);
    }
  };

  const handleClose = useCallback(() => {
    onClose();
    reset();
  }, [onClose, reset]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {rowData ? t('form.update') : t('form.create')} {t('center.title')}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField name="name" control={control} label={t('center.name') + ' *'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField name="code" control={control} label={t('common.code') + ' *'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField name="phoneNumber" control={control} label={t('center.phone')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField name="address" control={control} label={t('center.address')} />
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

export default CenterModal;
