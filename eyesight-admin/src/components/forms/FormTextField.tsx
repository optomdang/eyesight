import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { InputLabelProps, OutlinedInputProps } from '@mui/material';
import CustomTextField from './theme-elements/CustomTextField';

interface FormTextFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  type?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  multiline?: boolean;
  rows?: number;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  InputProps?: Partial<OutlinedInputProps>;
  InputLabelProps?: Partial<InputLabelProps>;
}

/**
 * Form text field component with React Hook Form integration
 *
 * Features:
 * - Automatic label shrinking for date inputs (type="date")
 * - Full TypeScript support with generic form data types
 * - Error handling and validation display
 * - Support for all common TextField props
 *
 * @example
 * ```tsx
 * <FormTextField
 *   name="dateOfBirth"
 *   control={control}
 *   type="date"
 *   label="Date of Birth"
 * />
 * ```
 */

function FormTextField<T extends FieldValues>({
  name,
  control,
  label,
  type = 'text',
  disabled = false,
  size = 'small',
  multiline = false,
  rows,
  inputProps,
  InputProps,
  InputLabelProps,
}: FormTextFieldProps<T>) {
  // Auto-shrink label for date inputs if not explicitly set
  const finalInputLabelProps =
    type === 'date' ? { shrink: true, ...InputLabelProps } : InputLabelProps;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <CustomTextField
          {...field}
          fullWidth
          type={type}
          label={label}
          error={!!error}
          helperText={error?.message}
          disabled={disabled}
          size={size}
          multiline={multiline}
          rows={rows}
          inputProps={inputProps}
          InputProps={InputProps}
          InputLabelProps={finalInputLabelProps}
        />
      )}
    />
  );
}

export default FormTextField;
