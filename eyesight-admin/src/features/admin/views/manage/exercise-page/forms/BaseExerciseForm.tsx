import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  TextField,
} from '@mui/material';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';
import { useTranslation } from 'src/hooks/useTranslation';
import type { Exercise } from 'src/types/core';
import { getAllRegisteredTypes } from 'src/components/exercises/registry';
import * as exerciseService from 'src/services/exercise.service';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import { getErrorMessage } from 'src/utils/errorHandler';
interface BaseExerciseFormProps {
  open: boolean;
  onClose: () => void;
  exerciseData?: Exercise;
  onSuccess: () => void;
}

interface FormValues {
  name: string;
  code: string;
  exerciseType: string;
  description: string;
  status: 'active' | 'inactive';
}

const emptyValues: FormValues = {
  name: '',
  code: '',
  exerciseType: '',
  description: '',
  status: 'active',
};

const BaseExerciseForm: React.FC<BaseExerciseFormProps> = ({
  open,
  onClose,
  exerciseData,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  const registeredTypes = useMemo(() => getAllRegisteredTypes(), []);

  useEffect(() => {
    if (!open) return;

    if (exerciseData) {
      setValues({
        name: exerciseData.name || '',
        code: exerciseData.code || '',
        exerciseType: exerciseData.exerciseType || '',
        description: exerciseData.description || '',
        status: exerciseData.status || 'active',
      });
    } else {
      setValues({
        ...emptyValues,
        exerciseType: registeredTypes[0]?.type || '',
        code: registeredTypes[0]?.type || '',
      });
    }
    setErrors({});
  }, [open, exerciseData, registeredTypes]);

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormValues, string>> = {};
    if (!values.name.trim()) next.name = t('validation.required', 'Bắt buộc');
    if (!values.code.trim()) next.code = t('validation.required', 'Bắt buộc');
    if (!values.exerciseType.trim()) next.exerciseType = t('validation.required', 'Bắt buộc');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim(),
        exerciseType: values.exerciseType.trim(),
        description: values.description.trim() || undefined,
        status: values.status,
      };

      if (exerciseData?.id) {
        await exerciseService.updateExercise(exerciseData.id, payload);
        showSnackbar(t('exercise.baseGame.updateSuccess', 'Cập nhật game gốc thành công'), SNACKBAR_SEVERITY.SUCCESS);
      } else {
        await exerciseService.createExercise(payload);
        showSnackbar(t('exercise.baseGame.createSuccess', 'Tạo game gốc thành công'), SNACKBAR_SEVERITY.SUCCESS);
      }

      onSuccess();
      onClose();
    } catch (error) {
      showSnackbar(
        getErrorMessage(error, t('exercise.baseGame.saveError', 'Lưu game gốc thất bại')),
        SNACKBAR_SEVERITY.ERROR
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleTypeChange = (exerciseType: string) => {
    setValues((prev) => ({
      ...prev,
      exerciseType,
      code: exerciseData ? prev.code : exerciseType,
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {exerciseData
          ? t('exercise.baseGame.editTitle', 'Sửa game gốc')
          : t('exercise.baseGame.createTitle', 'Thêm game gốc')}
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t(
            'exercise.baseGame.registryHint',
            'Loại game phải khớp mã đã triển khai trong hệ thống (registry). Thêm game mới cần bổ sung code frontend trước.'
          )}
        </Alert>

        <TextField
          fullWidth
          margin="normal"
          size="small"
          label={t('exercise.baseGame.name', 'Tên hiển thị')}
          value={values.name}
          error={Boolean(errors.name)}
          helperText={errors.name}
          onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
        />

        <FormControl fullWidth margin="normal" size="small" error={Boolean(errors.exerciseType)}>
          <InputLabel>{t('exercise.baseGame.type', 'Loại game (registry)')}</InputLabel>
          <CustomSelect
            label={t('exercise.baseGame.type', 'Loại game (registry)')}
            value={values.exerciseType}
            onChange={(e: any) => handleTypeChange(String(e.target.value))}
            disabled={Boolean(exerciseData)}
          >
            {registeredTypes.map((entry) => (
              <MenuItem key={entry.type} value={entry.type}>
                {entry.displayName} ({entry.type})
              </MenuItem>
            ))}
          </CustomSelect>
          {errors.exerciseType && <FormHelperText>{errors.exerciseType}</FormHelperText>}
        </FormControl>

        <TextField
          fullWidth
          margin="normal"
          size="small"
          label={
            <LabelWithHelp
              help={t(
                'exercise.baseGame.codeHint',
                'Mã duy nhất trong cơ sở, dùng khi tham chiếu cấu hình.'
              )}
            >
              {t('exercise.baseGame.code', 'Mã game')}
            </LabelWithHelp>
          }
          value={values.code}
          error={Boolean(errors.code)}
          helperText={errors.code || ''}
          onChange={(e) => setValues((prev) => ({ ...prev, code: e.target.value }))}
          disabled={Boolean(exerciseData)}
        />

        <TextField
          fullWidth
          margin="normal"
          size="small"
          multiline
          minRows={2}
          label={t('exercise.baseGame.description', 'Mô tả')}
          value={values.description}
          onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
        />

        {exerciseData && (
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>{t('common.status', 'Trạng thái')}</InputLabel>
            <CustomSelect
              label={t('common.status', 'Trạng thái')}
              value={values.status}
              onChange={(e: any) =>
                setValues((prev) => ({ ...prev, status: e.target.value as FormValues['status'] }))
              }
            >
              <MenuItem value="active">{t('common.active', 'Đang hoạt động')}</MenuItem>
              <MenuItem value="inactive">{t('common.inactive', 'Ngưng hoạt động')}</MenuItem>
            </CustomSelect>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {t('common.cancel', 'Hủy')}
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={submitting}>
          {exerciseData ? t('common.save', 'Lưu') : t('common.create', 'Tạo mới')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BaseExerciseForm;
