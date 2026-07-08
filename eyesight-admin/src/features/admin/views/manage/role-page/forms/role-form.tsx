import React, { useCallback, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Divider,
  Typography,
  Box,
  FormControlLabel,
} from '@mui/material';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { FormTextField } from 'src/components/forms';
import { roleSchema, type RoleFormData } from 'src/validations';
import useAuth from 'src/contexts/authGuard/useAuth.tsx';
import { Role, FormDialogProps } from 'src/types/core';
import { RIGHTS } from 'src/utils/rights';
import Checkbox from '@mui/material/Checkbox';
import { useTranslation } from 'src/hooks/useTranslation';

function RoleModal({ open, onClose, rowData }: FormDialogProps): React.JSX.Element {
  const { createData, updateData, getRecordData, fetchData } = useDataTable<Role>();
  const { user } = useAuth();
  const allowEdit = useMemo(() => Boolean(user?.role?.rights?.includes('manageRoles')), [user]);
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<RoleFormData>({
    resolver: yupResolver(roleSchema),
    defaultValues: {
      name: '',
      code: '',
      rights: [],
    },
  });

  const rights = watch('rights');

  useEffect(() => {
    const loadData = async () => {
      if (rowData && open) {
        const data = await getRecordData(rowData);
        reset({
          name: data.name || '',
          code: data.code || '',
          rights: data.rights || [],
        });
      } else if (!rowData && open) {
        // Reset to default values for create mode
        reset({
          name: '',
          code: '',
          rights: [],
        });
      }
    };
    void loadData();
  }, [rowData, open, getRecordData, reset]);

  const onSubmit = async (values: RoleFormData) => {
    if (rowData) {
      await updateData(rowData, values);
    } else {
      await createData(values);
    }
    onClose();
    fetchData();
  };

  const handleRightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const currentRights = rights || [];

    if (currentRights.includes(value)) {
      setValue(
        'rights',
        currentRights.filter((x) => x !== value)
      );
    } else {
      setValue('rights', [...currentRights, value]);
    }
  };

  const handleClose = useCallback(() => {
    onClose();
    reset();
  }, [onClose, reset]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {rowData ? t('form.update') : t('form.create')} {t('role.title')}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField name="name" control={control} label={t('role.name') + ' *'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormTextField name="code" control={control} label={t('common.code') + ' *'} />
            </Grid>
            <Box
              mb={2}
              sx={{
                overflowX: 'hidden',
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 300px)',
              }}
            >
              {Object.keys(RIGHTS).map((rightsGroup) => (
                <Grid container spacing={1} key={rightsGroup} ml={0}>
                  <Grid size={12}>
                    <Divider textAlign="left">
                      <Typography variant="subtitle1" fontWeight="bold">
                        {rightsGroup}
                      </Typography>
                    </Divider>
                  </Grid>

                  {Object.keys(RIGHTS[rightsGroup]).map((right) => (
                    <Grid size={6} key={right}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            name="rights"
                            value={right}
                            onChange={handleRightChange}
                            checked={rights ? rights.includes(right) : false}
                          />
                        }
                        label={RIGHTS[rightsGroup][right]}
                      />
                    </Grid>
                  ))}
                </Grid>
              ))}
            </Box>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handleClose}>
            {t('form.close')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            size="small"
            disabled={isSubmitting}
          >
            {rowData ? t('form.update') : t('form.create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default RoleModal;
