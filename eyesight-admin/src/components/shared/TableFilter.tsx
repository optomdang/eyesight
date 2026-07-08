import { useForm, FieldValues, Path } from 'react-hook-form';
import { Box, Button } from '@mui/material';
import Grid from '@mui/material/Grid';
import { FormTextField, FormSelect } from '../forms';

interface FilterField<TFilters extends FieldValues> {
  name: Path<TFilters>;
  label: string;
  type: 'text' | 'select';
  options?: Array<{ value: string | number; label: string }>;
}

interface TableFilterProps<TFilters extends FieldValues> {
  onFilter: (filters: Partial<TFilters>) => void;
  fields: Array<FilterField<TFilters>>;
}

const TableFilter = <TFilters extends FieldValues>({
  onFilter,
  fields,
}: TableFilterProps<TFilters>) => {
  const { control, handleSubmit, reset } = useForm<TFilters>();

  const onSubmit = (data: TFilters) => {
    onFilter(data);
  };

  const onReset = () => {
    reset();
    onFilter({} as Partial<TFilters>);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mb: 2 }}>
      <Grid container spacing={2}>
        {fields.map((field) => (
          <Grid key={field.name} size={{ xs: 12, sm: 6, md: 4 }}>
            {field.type === 'text' ? (
              <FormTextField name={field.name} control={control} label={field.label} />
            ) : (
              <FormSelect
                name={field.name}
                control={control}
                label={field.label}
                options={field.options || []}
              />
            )}
          </Grid>
        ))}
        <Grid size={{ xs: 12 }}>
          <Button type="submit" variant="contained" sx={{ mr: 1 }}>
            Lọc
          </Button>
          <Button onClick={onReset} variant="outlined">
            Xóa lọc
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TableFilter;
