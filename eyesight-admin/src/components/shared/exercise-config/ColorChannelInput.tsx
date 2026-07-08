import React from 'react';
import { Box } from '@mui/material';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';

interface ColorChannelInputProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}

/**
 * Hex text + compact swatch. Preview should sit above this row so the native
 * color picker popup does not cover the anaglyph preview letters.
 */
const ColorChannelInput: React.FC<ColorChannelInputProps> = ({
  label,
  value,
  onChange,
  disabled = false,
}) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
    <CustomTextField
      fullWidth
      label={label}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      disabled={disabled}
      size="small"
      sx={{ flex: 1, minWidth: 0 }}
      inputProps={{
        style: { fontFamily: 'monospace', textTransform: 'uppercase' },
        spellCheck: false,
      }}
    />
    <Box
      component="input"
      type="color"
      value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#000000'}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      disabled={disabled}
      title={label}
      aria-label={label}
      sx={{
        width: 40,
        height: 40,
        p: 0.25,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        bgcolor: 'background.paper',
        mb: '2px',
      }}
    />
  </Box>
);

export default ColorChannelInput;
