import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { FormControlLabel, Checkbox } from '@mui/material';

interface FormCheckboxProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  disabled?: boolean;
}

function FormCheckbox<T extends FieldValues>({
  name,
  control,
  label,
  disabled = false,
}: FormCheckboxProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControlLabel
          control={<Checkbox {...field} checked={!!field.value} disabled={disabled} />}
          label={label}
        />
      )}
    />
  );
}

export default FormCheckbox;
