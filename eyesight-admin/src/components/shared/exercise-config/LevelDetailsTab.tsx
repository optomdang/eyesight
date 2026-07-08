import React from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { Box, Typography, Grid, TextField, MenuItem } from '@mui/material';
import { VisualSettings } from 'src/types/core';
import { Game2048Preview } from 'src/components/exercises/admin';

interface LevelDetailsTabProps {
  isReadOnly: boolean;
  config: any;
  exerciseCode: string;
  previewLevel: string;
  onConfigChange?: (levelKey: string, field: keyof VisualSettings, value: string | number) => void;
}

export const LevelDetailsTab: React.FC<LevelDetailsTabProps> = ({
  isReadOnly,
  config,
  exerciseCode,
  previewLevel,
  onConfigChange,
}) => {
  const is2048Exercise = exerciseCode === '2048';
  const levelSettings = config?.levels?.[previewLevel];
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
        {t('exercise.levelConfigTitle')} {previewLevel}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label={t('exercise.fontSize')}
            type="number"
            value={levelSettings?.fontSize || 16}
            onChange={(e) => onConfigChange?.(previewLevel, 'fontSize', Number(e.target.value))}
            slotProps={{
              htmlInput: { min: 8, max: 110 },
            }}
            disabled={isReadOnly}
            size="small"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label={t('exercise.contrast')}
            type="number"
            value={levelSettings?.contrast || 100}
            onChange={(e) => onConfigChange?.(previewLevel, 'contrast', Number(e.target.value))}
            slotProps={{
              htmlInput: { min: 0, max: 100, step: 1 },
            }}
            disabled={isReadOnly}
            size="small"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label={t('exercise.colorScheme')}
            select={!isReadOnly}
            value={levelSettings?.colorScheme || 'standard'}
            onChange={(e) => onConfigChange?.(previewLevel, 'colorScheme', e.target.value)}
            size="small"
            disabled={isReadOnly}
          >
            <MenuItem value="redgreen">{t('exercise.colorSchemeRedGreen')}</MenuItem>
            <MenuItem value="bluewhite">{t('exercise.colorSchemeBlueWhite')}</MenuItem>
            <MenuItem value="standard">{t('exercise.colorSchemeStandard')}</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {is2048Exercise && levelSettings && (
        <Box sx={{ border: '1px solid #ddd', borderRadius: 2, p: 1.5, mt: 1 }}>
          <Game2048Preview visualSettings={levelSettings} />
        </Box>
      )}
    </Box>
  );
};
