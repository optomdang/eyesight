import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Box,
  Typography,
  Tooltip,
  IconButton,
  Chip,
  Paper,
  MenuItem,
} from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';
import { useTranslation } from 'src/hooks/useTranslation';
import useDataTable from 'src/contexts/data-context/useDataTable';
import type { NotificationTemplate } from 'src/types/core';
import { generateCode } from 'src/utils';

export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  rowData: number | string | null;
}

// Template variables organized by category
const TEMPLATE_VARIABLES = {
  basic: [
    { label: 'Tên bệnh nhân', value: '{{patientName}}', color: 'success' as const },
    { label: 'Mã bệnh nhân', value: '{{patientCode}}', color: 'success' as const },
    { label: 'Bác sĩ', value: '{{doctorName}}', color: 'success' as const },
    { label: 'Trung tâm', value: '{{centerName}}', color: 'success' as const },
  ],
  exam: [
    { label: 'Ngày khám', value: '{{examDate}}', color: 'primary' as const },
    { label: 'Loại khám', value: '{{examType}}', color: 'primary' as const },
    { label: 'Tần suất', value: '{{frequency}}', color: 'primary' as const },
  ],
  exercise: [
    { label: 'Tên bài tập', value: '{{exerciseName}}', color: 'warning' as const },
    { label: 'Tần suất', value: '{{frequency}}', color: 'warning' as const },
    { label: 'Buổi hoàn thành', value: '{{sessionsCompleted}}', color: 'warning' as const },
    { label: 'Tổng buổi', value: '{{targetSessions}}', color: 'warning' as const },
    { label: 'Số ngày quá hạn', value: '{{daysPastDue}}', color: 'warning' as const },
    { label: 'Buổi cuối', value: '{{lastSessionAt}}', color: 'warning' as const },
  ],
};

const TemplateForm: React.FC<FormDialogProps> = ({ open, onClose, rowData }) => {
  const { t } = useTranslation();
  const { createData, updateData, getRecordData, fetchData } = useDataTable<NotificationTemplate>();
  const [values, setValues] = React.useState<Partial<NotificationTemplate>>({
    isActive: true,
  });
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (rowData && open) {
      getRecordData(Number(rowData)).then((data) => {
        setValues({ ...data });
      });
    } else if (!rowData && open) {
      // Reset to default values for create mode with new code
      setValues({
        code: generateCode('NT'),
        isActive: true,
      });
    }
  }, [rowData, open, getRecordData]);

  const handleSubmit = async () => {
    if (values?.id) {
      await updateData(values.id, values);
    } else {
      await createData(values as NotificationTemplate);
    }
    fetchData();
    onClose();
  };

  const handleInsertVariable = (variable: string, field: 'content' | 'subject' = 'content') => {
    if (field === 'subject') {
      const input = subjectInputRef.current;
      if (!input) return;

      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentSubject = values.subject || '';

      const newSubject =
        currentSubject.substring(0, start) + variable + currentSubject.substring(end);
      setValues((s) => ({ ...s, subject: newSubject }));

      setTimeout(() => {
        input.focus();
        const newPosition = start + variable.length;
        input.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      const textarea = contentInputRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = values.content || '';

      const newContent =
        currentContent.substring(0, start) + variable + currentContent.substring(end);
      setValues((s) => ({ ...s, content: newContent }));

      setTimeout(() => {
        textarea.focus();
        const newPosition = start + variable.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{values?.id ? t('template.edit') : t('template.create')}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label={
                <LabelWithHelp help="Auto-generated: NT + Date + Random (e.g., NT250109ABC)">
                  {t('template.code')}
                </LabelWithHelp>
              }
              value={values.code || ''}
              onChange={(e) => setValues((s) => ({ ...s, code: e.target.value }))}
              disabled
              size="small"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label={t('template.name')}
              value={values.name || ''}
              onChange={(e) => setValues((s) => ({ ...s, name: e.target.value }))}
              required
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              select
              label={
                <LabelWithHelp help="Chọn loại thông báo phù hợp">Loại thông báo</LabelWithHelp>
              }
              value={values.category || ''}
              onChange={(e) => setValues((s) => ({ ...s, category: e.target.value }))}
              required
              size="small"
            >
              <MenuItem value="exam">Lịch khám</MenuItem>
              <MenuItem value="exercise">Bài tập</MenuItem>
              <MenuItem value="system">Hệ thống</MenuItem>
              <MenuItem value="reminder">Nhắc nhở</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {t('template.subject')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {TEMPLATE_VARIABLES.basic.map((variable) => (
                  <Chip
                    key={variable.value}
                    label={variable.value}
                    size="small"
                    variant="outlined"
                    onClick={() => handleInsertVariable(variable.value, 'subject')}
                    sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
            </Box>
            <TextField
              fullWidth
              value={values.subject || ''}
              onChange={(e) => setValues((s) => ({ ...s, subject: e.target.value }))}
              placeholder="Nhắc lịch khám - {{centerName}}"
              size="small"
              inputRef={subjectInputRef}
            />
          </Grid>
          <Grid size={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2">{t('template.content')} *</Typography>
              <Tooltip
                title="Click vào các chip bên dưới để chèn biến vào nội dung tại vị trí con trỏ"
                arrow
                placement="right"
              >
                <IconButton size="small">
                  <HelpIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Variable Chips Section */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, display: 'block', mb: 1, color: 'text.secondary' }}
              >
                Nhấp vào biến để chèn vào nội dung:
              </Typography>

              {/* Basic Variables */}
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, display: 'block', mb: 0.5, color: 'success.main' }}
                >
                  Thông tin cơ bản:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {TEMPLATE_VARIABLES.basic.map((variable) => (
                    <Chip
                      key={variable.value}
                      label={variable.label}
                      size="small"
                      color={variable.color}
                      onClick={() => handleInsertVariable(variable.value)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Exam Variables */}
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, display: 'block', mb: 0.5, color: 'primary.main' }}
                >
                  Lịch khám:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {TEMPLATE_VARIABLES.exam.map((variable) => (
                    <Chip
                      key={variable.value}
                      label={variable.label}
                      size="small"
                      color={variable.color}
                      onClick={() => handleInsertVariable(variable.value)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Exercise Variables */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, display: 'block', mb: 0.5, color: 'warning.main' }}
                >
                  Bài tập:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {TEMPLATE_VARIABLES.exercise.map((variable) => (
                    <Chip
                      key={variable.value}
                      label={variable.label}
                      size="small"
                      color={variable.color}
                      onClick={() => handleInsertVariable(variable.value)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            </Paper>

            <TextField
              fullWidth
              multiline
              rows={10}
              value={values.content || ''}
              onChange={(e) => setValues((s) => ({ ...s, content: e.target.value }))}
              placeholder="Xin chào {{patientName}},&#10;&#10;Đây là lời nhắc về lịch khám của bạn...&#10;&#10;Trân trọng,&#10;{{centerName}}"
              required
              size="small"
              inputRef={contentInputRef}
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(values.isActive)}
                  onChange={(e) => setValues((s) => ({ ...s, isActive: e.target.checked }))}
                />
              }
              label={t('template.isActive')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="small">
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleSubmit}
          disabled={!values.code || !values.name || !values.category || !values.content}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateForm;
