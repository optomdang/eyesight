import React from 'react';
import { Chip, Stack } from '@mui/material';

export interface QuickFilterOption {
  key: string;
  label: string;
  value?: string;
}

interface HistoryQuickFilterChipsProps {
  options: QuickFilterOption[];
  activeKey: string;
  onChange: (option: QuickFilterOption) => void;
}

const HistoryQuickFilterChips: React.FC<HistoryQuickFilterChipsProps> = ({
  options,
  activeKey,
  onChange,
}) => (
  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" justifyContent="flex-end">
    {options.map((option) => (
      <Chip
        key={option.key}
        label={option.label}
        size="small"
        clickable
        color={activeKey === option.key ? 'primary' : 'default'}
        variant={activeKey === option.key ? 'filled' : 'outlined'}
        onClick={() => onChange(option)}
      />
    ))}
  </Stack>
);

export default HistoryQuickFilterChips;
