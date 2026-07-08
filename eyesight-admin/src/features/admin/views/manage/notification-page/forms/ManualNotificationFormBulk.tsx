import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Button,
  Box,
  Typography,
  Chip,
  CircularProgress,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Email as EmailIcon,
  Chat as ZaloIcon,
  Sms as SmsIcon,
  Web as WebIcon,
  Error as ErrorIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import * as PatientService from 'src/services/patient.service';
import * as NotificationService from 'src/services/notification.service';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';
import { Patient } from '../types';
import { useTranslation } from 'src/hooks/useTranslation';
import type { NotificationTemplate } from 'src/types/core/notification';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import { useAsyncMultiAutocomplete } from 'src/hooks/useAsyncMultiAutocomplete';

interface ManualNotificationFormBulkProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ManualNotificationFormBulk: React.FC<ManualNotificationFormBulkProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    total: number;
    success: number;
    failed: number;
    details: Array<{
      patientId: number;
      success: boolean;
      error: string | null;
      notificationId: number | null;
    }>;
  } | null>(null);

  // Async multi-select for patients
  const patients = useAsyncMultiAutocomplete<Patient>({
    fetchFn: (searchTerm) => {
      const params: any = { limit: searchTerm ? 50 : 5 };
      if (searchTerm) params.name = searchTerm;
      return PatientService.getPatients(params);
    },
    mapToOption: (patient) => {
      const name = patient.user?.name || patient.fullName || 'N/A';
      return { value: patient.id || 0, label: `${patient.code} - ${name}` };
    },
    getItemId: (patient) => patient.id || 0,
    minChars: 2,
    debounceMs: 500,
  });

  // Load initial data
  useEffect(() => {
    if (open) {
      loadTemplates();
      setSendResult(null);
      patients.reset();
      patients.initialFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [form, setForm] = useState({
    templateId: '',
    channel: 'web' as 'email' | 'zalo' | 'sms' | 'web',
    subject: '',
    content: '',
  });

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await NotificationService.getNotificationTemplates({
        limit: 100,
        isActive: true,
      });
      setTemplates(response.rows);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientsChange = (newValue: Array<{ value: string | number; label: string }>) => {
    patients.handleChange(newValue.map((v) => ({ value: Number(v.value), label: v.label })));
  };

  const handleTemplateChange = (template: NotificationTemplate | null) => {
    setSelectedTemplate(template);
    setForm((prev) => ({
      ...prev,
      templateId: template?.id?.toString() || '',
      subject: template?.subject || '',
      content: template?.content || '',
    }));
  };

  const handleChannelChange = (channel: 'email' | 'zalo' | 'sms' | 'web') => {
    setForm((prev) => ({ ...prev, channel }));
  };

  const handleFieldChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (patients.selectedItems.length === 0) {
      showSnackbar('Vui lòng chọn ít nhất 1 bệnh nhân', SNACKBAR_SEVERITY.WARNING);
      return;
    }

    if (!form.content.trim()) {
      showSnackbar('Vui lòng nhập nội dung thông báo', SNACKBAR_SEVERITY.WARNING);
      return;
    }

    try {
      setSending(true);
      const result = (await NotificationService.sendManualNotification({
        patientIds: patients.selectedItems.map((p) => p.id!),
        channel: form.channel,
        subject: form.subject,
        content: form.content,
        templateId: form.templateId ? Number(form.templateId) : undefined,
      })) as {
        total: number;
        success: number;
        failed: number;
        details: Array<{
          patientId: number;
          success: boolean;
          error: string | null;
          notificationId: number | null;
        }>;
      };

      setSendResult(result);

      if (result.failed === 0) {
        showSnackbar(`Gửi thành công cho ${result.success} bệnh nhân`, SNACKBAR_SEVERITY.SUCCESS);
        if (onSuccess) onSuccess();
      } else {
        showSnackbar(
          `Gửi thành công: ${result.success}, Thất bại: ${result.failed}`,
          SNACKBAR_SEVERITY.WARNING
        );
      }
    } catch (error: any) {
      showSnackbar(error.message || 'Có lỗi xảy ra khi gửi thông báo', SNACKBAR_SEVERITY.ERROR);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setForm({
        templateId: '',
        channel: 'web',
        subject: '',
        content: '',
      });
      patients.reset();
      setSelectedTemplate(null);
      setSendResult(null);
      onClose();
    }
  };

  const getPatientName = (patientId: number): string => {
    const patient = patients.findItem(patientId);
    if (!patient) return `ID: ${patientId}`;
    const name = patient.user?.name || patient.fullName || 'N/A';
    return `${patient.code} - ${name}`;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('notification.sendManualBulk', 'Gửi thông báo cho nhiều bệnh nhân')}
      </DialogTitle>
      <DialogContent dividers>
        {sending && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Đang gửi thông báo...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {sendResult && (
          <Alert
            severity={sendResult.failed === 0 ? 'success' : 'warning'}
            sx={{ mb: 2 }}
            onClose={() => setSendResult(null)}
          >
            <Typography variant="body2">
              Tổng số: {sendResult.total} | Thành công: {sendResult.success} | Thất bại:{' '}
              {sendResult.failed}
            </Typography>
            {sendResult.failed > 0 && (
              <List dense sx={{ mt: 1 }}>
                {sendResult.details
                  .filter((d) => !d.success)
                  .map((detail, idx) => (
                    <ListItem key={idx} sx={{ py: 0 }}>
                      <ErrorIcon fontSize="small" color="error" sx={{ mr: 1 }} />
                      <ListItemText
                        primary={getPatientName(detail.patientId)}
                        secondary={detail.error}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
              </List>
            )}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Multi-Patient Selection */}
          <Autocomplete
            multiple
            options={patients.options}
            getOptionLabel={(option) => option.label}
            filterOptions={(x) => x} // Disable built-in filtering for async search
            isOptionEqualToValue={(option, value) => option.value === value.value}
            value={patients.selectedOptions}
            onChange={(_, newValue) => handlePatientsChange(newValue)}
            onInputChange={(_, newInputValue, reason) =>
              patients.handleInputChange(newInputValue, reason)
            }
            onOpen={() => {
              // Do nothing - only search when user types
            }}
            loading={patients.loading}
            disableCloseOnSelect
            clearOnBlur={false}
            blurOnSelect={false}
            renderOption={(props, option, { selected }) => {
              const { key, ...optionProps } = props;
              const SelectionIcon = selected ? CheckBoxIcon : CheckBoxOutlineBlankIcon;
              return (
                <li key={key} {...optionProps}>
                  <SelectionIcon fontSize="small" style={{ marginRight: 8 }} />
                  {option.label}
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={
                  <LabelWithHelp help="Nhập tên hoặc mã bệnh nhân (tối thiểu 2 ký tự).">
                    {`${t('notification.selectPatients', 'Chọn bệnh nhân')} (${patients.selectedItems.length})`}
                  </LabelWithHelp>
                }
                required
                fullWidth
                size="small"
                placeholder="Nhập tên hoặc mã bệnh nhân (tối thiểu 2 ký tự)..."
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {patients.loading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
            noOptionsText={
              patients.loading
                ? 'Đang tải...'
                : 'Không tìm thấy bệnh nhân. Nhập ít nhất 2 ký tự để tìm kiếm.'
            }
            disabled={sending}
          />

          {/* Template Selection */}
          <Autocomplete
            options={templates}
            getOptionLabel={(option) => `${option.name} (${option.category})`}
            value={selectedTemplate}
            onChange={(_, newValue) => handleTemplateChange(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={
                  <LabelWithHelp help="Mẫu sẽ điền sẵn nội dung, bạn có thể chỉnh sửa sau">
                    {t('notification.selectTemplate', 'Chọn mẫu thông báo (tùy chọn)')}
                  </LabelWithHelp>
                }
                fullWidth
                size="small"
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            loading={loading}
            disabled={patients.selectedItems.length === 0 || sending}
          />

          {/* Channel Selection */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('notification.channel', 'Kênh gửi')} *
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<EmailIcon />}
                label={t('channel.email', 'Email')}
                color={form.channel === 'email' ? 'info' : 'default'}
                variant={form.channel === 'email' ? 'filled' : 'outlined'}
                onClick={() => !sending && handleChannelChange('email')}
                clickable={!sending}
                disabled={sending}
              />
              <Chip
                icon={<ZaloIcon />}
                label={t('channel.zalo', 'Zalo')}
                color={form.channel === 'zalo' ? 'primary' : 'default'}
                variant={form.channel === 'zalo' ? 'filled' : 'outlined'}
                onClick={() => !sending && handleChannelChange('zalo')}
                clickable={!sending}
                disabled={sending}
              />
              <Chip
                icon={<SmsIcon />}
                label={t('channel.sms', 'SMS')}
                color={form.channel === 'sms' ? 'success' : 'default'}
                variant={form.channel === 'sms' ? 'filled' : 'outlined'}
                onClick={() => !sending && handleChannelChange('sms')}
                clickable={!sending}
                disabled={sending}
              />
              <Chip
                icon={<WebIcon />}
                label={t('channel.web', 'Web')}
                color={form.channel === 'web' ? 'secondary' : 'default'}
                variant={form.channel === 'web' ? 'filled' : 'outlined'}
                onClick={() => !sending && handleChannelChange('web')}
                clickable={!sending}
                disabled={sending}
              />
            </Box>
          </Box>

          {/* Subject Field (for email channel) */}
          {form.channel === 'email' && (
            <TextField
              fullWidth
              label={t('notification.subject', 'Tiêu đề')}
              value={form.subject}
              onChange={(e) => handleFieldChange('subject', e.target.value)}
              size="small"
              placeholder="Nhập tiêu đề email..."
              disabled={sending}
            />
          )}

          {/* Content Field */}
          <TextField
            fullWidth
            multiline
            rows={8}
            label={
              <LabelWithHelp help="Nội dung này sẽ được gửi cho tất cả bệnh nhân đã chọn">
                {t('notification.content', 'Nội dung')}
              </LabelWithHelp>
            }
            value={form.content}
            onChange={(e) => handleFieldChange('content', e.target.value)}
            required
            placeholder="Nhập nội dung thông báo hoặc chọn mẫu để điền sẵn..."
            disabled={sending}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button variant="outlined" onClick={handleClose} disabled={sending}>
          {t('common.close', 'Đóng')}
        </Button>
        {!sendResult && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={sending || patients.selectedItems.length === 0 || !form.content}
          >
            {sending ? 'Đang gửi...' : `Gửi cho ${patients.selectedItems.length} bệnh nhân`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ManualNotificationFormBulk;
