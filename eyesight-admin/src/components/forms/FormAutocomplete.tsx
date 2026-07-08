import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { Autocomplete } from '@mui/material';
import CustomTextField from './theme-elements/CustomTextField';

interface FormAutocompleteProps<T extends FieldValues, TOption = unknown> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: Array<{ value: TOption; label: string }>;
  disabled?: boolean;
  size?: 'small' | 'medium';
  loading?: boolean;
  onInputChange?: (value: string) => void;
}

function FormAutocomplete<T extends FieldValues>({
  name,
  control,
  label,
  options,
  disabled = false,
  size = 'small',
  loading = false,
  onInputChange,
}: FormAutocompleteProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <Autocomplete
          value={options.find((opt) => opt.value === value) || null}
          onChange={(_, data) => onChange(data?.value)}
          onInputChange={(_, newInputValue, reason) => {
            // Only trigger server search on actual user typing
            // Skip 'reset' (option selected / value set) and 'clear' to prevent infinite loop
            if (onInputChange && reason === 'input') {
              onInputChange(newInputValue);
            }
          }}
          options={options}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, val) => option.value === val.value}
          // When onInputChange is provided, filtering is server-side — disable MUI's local filter
          // to prevent Vietnamese diacritics mismatch (e.g. "dai" ≠ "Đại" in client filter)
          filterOptions={onInputChange ? (x) => x : undefined}
          disabled={disabled}
          loading={loading}
          size={size}
          renderInput={(params) => (
            <CustomTextField
              {...params}
              label={label}
              error={!!error}
              helperText={error?.message}
            />
          )}
        />
      )}
    />
  );
}

export default FormAutocomplete;
