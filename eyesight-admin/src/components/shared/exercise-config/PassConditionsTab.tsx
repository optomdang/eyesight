import React from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { Box, Typography, Grid, TextField } from '@mui/material';

interface PassConditionsTabProps {
  isReadOnly: boolean;
  config: any;
  onFieldChange?: (field: string, value: any) => void;
}

export const PassConditionsTab: React.FC<PassConditionsTabProps> = ({
  isReadOnly,
  config,
  onFieldChange,
}) => {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('exercise.passConditionsTab')}
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label={t('exercise.minScore')}
            type="number"
            value={config?.passConditions?.minScore || 70}
            onChange={(e) =>
              onFieldChange?.('config.passConditions.minScore', Number(e.target.value))
            }
            size="small"
            disabled={isReadOnly}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label={t('exercise.maxTime')}
            type="number"
            value={config?.passConditions?.maxTime || 120}
            onChange={(e) =>
              onFieldChange?.('config.passConditions.maxTime', Number(e.target.value))
            }
            size="small"
            disabled={isReadOnly}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label={t('exercise.minAccuracy')}
            type="number"
            value={config?.passConditions?.minAccuracy || 0.75}
            onChange={(e) =>
              onFieldChange?.('config.passConditions.minAccuracy', Number(e.target.value))
            }
            slotProps={{
              htmlInput: { min: 0, max: 1, step: 0.01 },
            }}
            disabled={isReadOnly}
            size="small"
          />
        </Grid>
      </Grid>
    </Box>
  );
};
