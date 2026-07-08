import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { FormControl, InputLabel, MenuItem, FormHelperText } from '@mui/material';
import CustomSelect from './theme-elements/CustomSelect';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';

interface FormSelectProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: Array<{ value: string | number; label: string }>;
  disabled?: boolean;
  size?: 'small' | 'medium';
  /** Informational hint shown as tooltip next to the label (not validation). */
  hint?: string;
}

function FormSelect<T extends FieldValues>({
  name,
  control,
  label,
  options,
  disabled = false,
  size = 'small',
  hint,
}: FormSelectProps<T>) {
  const labelNode = hint ? (
    <LabelWithHelp help={hint}>{label}</LabelWithHelp>
  ) : (
    label
  );

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl fullWidth size={size} error={!!error}>
          <InputLabel>{labelNode}</InputLabel>
          <CustomSelect {...field} label={label} disabled={disabled}>
            {options.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </CustomSelect>
          {error && <FormHelperText>{error.message}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}

export default FormSelect;
