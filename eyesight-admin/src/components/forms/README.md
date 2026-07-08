# Form Components & Validation Guide

## Overview
Form components wrapper React Hook Form với MUI components, có validation Yup tích hợp sẵn.

## Form Components

### FormTextField
```tsx
<FormTextField
  name="code"
  control={control}
  label="Mã bệnh nhân"
  type="text"           // optional: 'text' (default), 'number', 'email', 'password', 'date'
  disabled={false}      // optional
  size="small"          // optional: 'small' (default), 'medium'
  multiline={false}     // optional: for textarea
  rows={3}              // optional: số dòng khi multiline={true}
/>
```

### FormSelect
```tsx
<FormSelect
  name="gender"
  control={control}
  label="Giới tính"
  options={[
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
  ]}
  disabled={false}      // optional
  size="small"          // optional
/>
```

### FormAutocomplete
```tsx
<FormAutocomplete
  name="userId"
  control={control}
  label="Tài khoản"
  options={[
    { value: 1, label: 'User 1' },
    { value: 2, label: 'User 2' },
  ]}
  loading={false}       // optional: show loading state
  disabled={false}      // optional
  size="small"          // optional
/>
```

### FormCheckbox
```tsx
<FormCheckbox
  name="isActive"
  control={control}
  label="Kích hoạt"
  disabled={false}      // optional
/>
```

## Validation Schemas

### Available Schemas
```tsx
import {
  userSchema,
  patientSchema,
  exerciseSchema,
  exerciseConfigSchema,
  exerciseAssignmentSchema,
} from 'src/validations';
```

### Usage with React Hook Form
```tsx
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { patientSchema } from 'src/validations';

const { control, handleSubmit } = useForm({
  resolver: yupResolver(patientSchema),
  defaultValues: {
    code: '',
    userId: undefined,
  },
});
```

## Complete Example

```tsx
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { FormTextField, FormSelect } from 'src/components/forms';
import { patientSchema } from 'src/validations';

export const PatientForm = () => {
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(patientSchema),
  });

  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormTextField name="code" control={control} label="Mã bệnh nhân" />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <FormSelect
            name="gender"
            control={control}
            label="Giới tính"
            options={[
              { value: 'male', label: 'Nam' },
              { value: 'female', label: 'Nữ' },
            ]}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Button type="submit" variant="contained">
            Lưu
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};
```

## Grid Syntax
**ALWAYS** use `size={{ xs: 12, sm: 6, md: 4 }}` syntax.

**NEVER** use old syntax: `item xs={12}` ❌

## Custom Validation Messages
All error messages in Vietnamese. Edit `src/validations/messages.ts` to customize.

## Creating New Schemas
```tsx
// src/validations/schemas/mySchema.ts
import * as Yup from 'yup';
import * as common from './common';

export const mySchema = Yup.object({
  name: common.name('Tên'),
  email: common.email,
  phone: common.phone,
});

export type MyFormData = Yup.InferType<typeof mySchema>;
```

Then export in `src/validations/index.ts`:
```tsx
export { mySchema, type MyFormData } from './schemas/mySchema';
```
