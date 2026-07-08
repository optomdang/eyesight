import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, MenuItem, Chip, Box } from '@mui/material';
import { useTranslation } from 'src/hooks/useTranslation';
import type { ExerciseConfig } from 'src/types/core';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';

interface ConfigurationSelectorProps {
  availableConfigs: ExerciseConfig[];
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export const ConfigurationSelector: React.FC<ConfigurationSelectorProps> = ({
  availableConfigs,
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  const handleConfigChange = (e: any) => {
    const configId = e.target.value;
    if (configId === '' || configId === null) {
      onChange(null);
    } else {
      onChange(Number(configId));
    }
  };

  const getConfigTypeLabel = (type: string) => {
    switch (type) {
      case 'admin':
        return t('config.types.admin');
      case 'doctor':
        return t('config.types.doctor');
      default:
        return type;
    }
  };

  return (
    <FormControl fullWidth size="small">
      <InputLabel>{t('config.selectBaseConfiguration')}</InputLabel>
      <CustomSelect
        value={value || ''}
        onChange={handleConfigChange}
        label={t('config.selectBaseConfiguration')}
        disabled={disabled}
        size="small"
      >
        {availableConfigs.map((config) => (
          <MenuItem key={config.id} value={config.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <span style={{ flex: 1, fontStyle: 'normal' }}>{config.name}</span>

              <Chip label={getConfigTypeLabel(config.configType)} size="small" />
            </Box>
          </MenuItem>
        ))}
      </CustomSelect>
    </FormControl>
  );
};
