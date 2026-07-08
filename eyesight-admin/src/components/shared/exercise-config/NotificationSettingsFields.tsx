import React, { useEffect, useState } from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import {
  FormControlLabel,
  Checkbox,
  TextField,
  MenuItem,
  Grid,
  Box,
  Typography,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { getData } from 'src/utils/request';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';
import type { NotificationTemplate, PaginatedResponse } from 'src/types/core';

interface NotificationSettingsFieldsProps {
  isReadOnly: boolean;
  config: any;
  onFieldChange?: (field: string, value: any) => void;
}
export const NotificationSettingsFields: React.FC<NotificationSettingsFieldsProps> = ({
  isReadOnly,
  config,
  onFieldChange,
}) => {
  const notificationSettings = config?.notificationSettings || {
    enabled: false,
    templateId: null,
    methods: [],
    maxReminders: 3,
    reminderInterval: 24,
  };

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Load notification templates
  useEffect(() => {
    if (notificationSettings.enabled) {
      setLoadingTemplates(true);
      getData<PaginatedResponse<NotificationTemplate>>(
        '/notification-templates?category=exercise&isActive=true&limit=100'
      )
        .then((response) => {
          setTemplates(response.rows);
        })
        .catch((error) => {
          console.error('Failed to load notification templates:', error);
          setTemplates([]);
        })
        .finally(() => {
          setLoadingTemplates(false);
        });
    }
  }, [notificationSettings.enabled]);

  const handleMethodChange = (method: string, checked: boolean) => {
    const methods = notificationSettings.methods || [];
    const newMethods = checked ? [...methods, method] : methods.filter((m: string) => m !== method);
    onFieldChange?.('notificationSettings.methods', newMethods);
  };

  const { t } = useTranslation();
  return (
    <>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={notificationSettings.enabled}
                onChange={(e) => onFieldChange?.('notificationSettings.enabled', e.target.checked)}
                disabled={isReadOnly}
              />
            }
            label={t('exercise.enableReminderNotification')}
          />
        </Grid>
      </Grid>

      {notificationSettings.enabled && (
        <>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                fullWidth
                options={templates}
                getOptionLabel={(option) => option.name}
                value={templates.find((t) => t.id === notificationSettings.templateId) || null}
                onChange={(_, newValue) => {
                  onFieldChange?.('notificationSettings.templateId', newValue?.id || null);
                }}
                loading={loadingTemplates}
                disabled={isReadOnly}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('exam.notificationTemplate')}
                    size="small"
                    required
                    error={!notificationSettings.templateId}
                    helperText={!notificationSettings.templateId ? t('exam.templateRequired') : ''}
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingTemplates ? (
                              <CircularProgress color="inherit" size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('exercise.notificationMethod')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={notificationSettings.methods.includes('email')}
                      onChange={(e) => handleMethodChange('email', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label={t('exercise.email')}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={notificationSettings.methods.includes('zalo')}
                      onChange={(e) => handleMethodChange('zalo', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label={t('exercise.zalo')}
                />
              </Box>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={
                  <LabelWithHelp
                    help={t(
                      'exercise.maxRemindersHelp',
                      'Số lần nhắc nhở tối đa cho bài tập quá hạn'
                    )}
                  >
                    {t('exercise.maxReminders')}
                  </LabelWithHelp>
                }
                type="number"
                value={notificationSettings.maxReminders}
                onChange={(e) =>
                  onFieldChange?.('notificationSettings.maxReminders', Number(e.target.value))
                }
                slotProps={{
                  htmlInput: { min: 1, max: 10 },
                }}
                disabled={isReadOnly}
                size="small"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={
                  <LabelWithHelp
                    help={t(
                      'exercise.reminderIntervalHelp',
                      'Số giờ giữa các lần nhắc (1-168 giờ)'
                    )}
                  >
                    {t('exercise.reminderInterval')}
                  </LabelWithHelp>
                }
                type="number"
                value={notificationSettings.reminderInterval}
                onChange={(e) =>
                  onFieldChange?.('notificationSettings.reminderInterval', Number(e.target.value))
                }
                slotProps={{
                  htmlInput: { min: 1, max: 168 },
                }}
                disabled={isReadOnly}
                size="small"
              />
            </Grid>
          </Grid>
        </>
      )}
    </>
  );
};
