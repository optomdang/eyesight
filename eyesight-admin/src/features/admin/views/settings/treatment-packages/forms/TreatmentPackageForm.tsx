import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  Switch,
  Typography,
} from '@mui/material';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { FormTextField } from 'src/components/forms';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { treatmentPackageSchema, type TreatmentPackageFormData } from 'src/validations';
import { ExerciseConfig, FormDialogProps, TreatmentPackage } from 'src/types/core';
import { LabelWithHelp, HelpTooltip } from 'src/components/shared/HelpTooltip';
import * as exerciseService from 'src/services/exercise.service';
import { useTranslation } from 'src/hooks/useTranslation';
import { usePermission } from 'src/hooks/usePermission';
import useAuth from 'src/contexts/authGuard/useAuth';
import useSnackbar from 'src/contexts/UseSnackbar';
import { getErrorMessage } from 'src/utils/errorHandler';

function TreatmentPackageForm({ open, onClose, rowData }: FormDialogProps): React.JSX.Element {
  const { createData, updateData, getRecordData, fetchData } = useDataTable<TreatmentPackage>();
  const { hasPermission } = usePermission();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const isAdmin = user?.userType === 'admin';
  const [packageType, setPackageType] = useState<'system' | 'custom' | undefined>(undefined);

  const canEditFields =
    isAdmin || (hasPermission('manageExercises') && packageType !== 'system');
  const readOnly = Boolean(rowData && !canEditFields);
  const { t } = useTranslation();

  const [configs, setConfigs] = useState<ExerciseConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<TreatmentPackageFormData>({
    resolver: yupResolver(treatmentPackageSchema),
    defaultValues: {
      name: '',
      code: '',
      durationDays: 30,
      exerciseConfigIds: [],
    },
  });

  const selectedConfigIds = watch('exerciseConfigIds') || [];

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadConfigs = async () => {
      setLoadingConfigs(true);
      try {
        const response = await exerciseService.getExerciseConfigs({ page: 1, limit: 500 });
        if (!cancelled) {
          setConfigs(response.rows || []);
        }
      } catch (err) {
        console.error('Failed to load exercise configs:', err);
        if (!cancelled) setConfigs([]);
      } finally {
        if (!cancelled) setLoadingConfigs(false);
      }
    };

    void loadConfigs();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    const loadData = async () => {
      if (rowData && open) {
        const data = await getRecordData(rowData);
        setPackageType(data.packageType || 'custom');
        reset({
          name: data.name || '',
          code: data.code || '',
          durationDays: data.durationDays || 30,
          exerciseConfigIds: data.exerciseConfigIds || [],
        });
      } else if (!rowData && open) {
        setPackageType(undefined);
        reset({
          name: '',
          code: '',
          durationDays: 30,
          exerciseConfigIds: [],
        });
      }
    };
    void loadData();
  }, [rowData, open, getRecordData, reset]);

  const onSubmit = async (values: TreatmentPackageFormData) => {
    try {
      const payload = {
        name: values.name,
        code: values.code,
        durationDays: values.durationDays,
        exerciseConfigIds: (values.exerciseConfigIds || []).filter(
          (id): id is number => typeof id === 'number'
        ),
      };

      if (rowData) {
        await updateData(rowData, payload);
      } else {
        await createData(payload);
      }
      onClose();
      fetchData();
    } catch (error) {
      showSnackbar(getErrorMessage(error, t('common.saveError', 'Lưu thất bại')), 'error');
    }
  };

  const handleToggleConfig = (configId: number, enabled: boolean) => {
    const current = selectedConfigIds;
    if (enabled) {
      setValue('exerciseConfigIds', [...current, configId], { shouldDirty: true });
    } else {
      setValue(
        'exerciseConfigIds',
        current.filter((id) => id !== configId),
        { shouldDirty: true }
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {readOnly
          ? 'Xem gói điều trị'
          : rowData
            ? 'Cập nhật gói điều trị'
            : 'Tạo gói điều trị'}
      </DialogTitle>
      <Divider />
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid size={12}>
              <FormTextField
                name="name"
                control={control}
                label="Tên gói *"
                disabled={!canEditFields}
              />
            </Grid>
            <Grid size={12}>
              <FormTextField
                name="code"
                control={control}
                label="Mã gói *"
                disabled={!canEditFields || Boolean(rowData)}
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="body2" component="div" sx={{ mb: 0.5 }}>
                <LabelWithHelp help="Tính từ ngày tài khoản được gán gói. Hết hạn thì bệnh nhân không thể vào các chế độ tập luyện trong gói.">
                  Thời gian sử dụng gói (ngày) *
                </LabelWithHelp>
              </Typography>
              <Controller
                name="durationDays"
                control={control}
                render={({ field, fieldState }) => (
                  <CustomTextField
                    {...field}
                    type="number"
                    fullWidth
                    size="small"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    disabled={!canEditFields}
                    inputProps={{ min: 1, max: 3650 }}
                  />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Chế độ tập luyện
                </Typography>
                <HelpTooltip title="Bật/tắt từng chế độ mà bệnh nhân được phép sử dụng khi được gán gói này." />
              </Box>
              {loadingConfigs ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : configs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Chưa có chế độ tập luyện nào.
                </Typography>
              ) : (
                <Box
                  sx={{
                    maxHeight: 280,
                    overflowY: 'auto',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    px: 1.5,
                    py: 0.5,
                  }}
                >
                  {configs.map((config) => (
                    <FormControlLabel
                      key={config.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        ml: 0,
                        mr: 0,
                        width: '100%',
                        py: 0.25,
                      }}
                      labelPlacement="start"
                      label={
                        <Typography variant="body2" sx={{ flex: 1, pr: 1 }}>
                          {config.name}
                        </Typography>
                      }
                      control={
                        <Switch
                          checked={selectedConfigIds.includes(config.id)}
                          onChange={(e) => handleToggleConfig(config.id, e.target.checked)}
                          disabled={!canEditFields}
                          color="primary"
                        />
                      }
                    />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" size="small">
            {t('common.cancel')}
          </Button>
          {canEditFields && (
            <Button type="submit" variant="contained" size="small" disabled={isSubmitting}>
              {t('common.save')}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default TreatmentPackageForm;
