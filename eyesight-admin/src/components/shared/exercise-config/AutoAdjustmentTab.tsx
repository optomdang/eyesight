import React from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { Box, Typography, Grid, TextField, FormControlLabel, Switch } from '@mui/material';

interface AutoAdjustmentTabProps {
  isReadOnly: boolean;
  config: any;
  onFieldChange?: (field: string, value: any) => void;
}

export const AutoAdjustmentTab: React.FC<AutoAdjustmentTabProps> = ({
  isReadOnly,
  config,
  onFieldChange,
}) => {
  const isAutoAdjustEnabled = config?.autoAdjustLevel ?? false;
  const { t } = useTranslation();

  return (
    <Box>
      {/* Auto Adjust Level Toggle */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('exercise.autoAdjustmentTab')}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isAutoAdjustEnabled}
                onChange={(e) => {
                  onFieldChange?.('config.autoAdjustLevel', e.target.checked);
                }}
                disabled={isReadOnly}
              />
            }
            label={t('exercise.autoAdjustLevel')}
          />
        </Grid>
      </Grid>

      {/* Auto Adjustment Rules - Only show when auto adjust is enabled */}
      {isAutoAdjustEnabled && (
        <>
          <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>
            {t('exercise.autoAdjustmentRules')}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label={t('exercise.increaseAfterSuccess')}
                type="number"
                value={config?.autoAdjustmentRules?.increaseAfterSuccess || 3}
                onChange={(e) =>
                  onFieldChange?.(
                    'config.autoAdjustmentRules.increaseAfterSuccess',
                    Number(e.target.value)
                  )
                }
                size="small"
                disabled={isReadOnly}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label={t('exercise.decreaseAfterFailure')}
                type="number"
                value={config?.autoAdjustmentRules?.decreaseAfterFailure || 2}
                onChange={(e) =>
                  onFieldChange?.(
                    'config.autoAdjustmentRules.decreaseAfterFailure',
                    Number(e.target.value)
                  )
                }
                size="small"
                disabled={isReadOnly}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label={t('exercise.maxLevel')}
                type="number"
                value={config?.autoAdjustmentRules?.maxLevel || 5}
                onChange={(e) =>
                  onFieldChange?.('config.autoAdjustmentRules.maxLevel', Number(e.target.value))
                }
                size="small"
                disabled={isReadOnly}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label={t('exercise.minLevel')}
                type="number"
                value={config?.autoAdjustmentRules?.minLevel || 1}
                onChange={(e) =>
                  onFieldChange?.('config.autoAdjustmentRules.minLevel', Number(e.target.value))
                }
                size="small"
                disabled={isReadOnly}
              />
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};
