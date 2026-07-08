import React from 'react';
import { FormControl, InputLabel, MenuItem } from '@mui/material';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { DataTableFilter, FilterField } from 'src/components/shared/DataTableFilter';
import { useTranslation } from 'src/hooks/useTranslation';

type Filters = {
  name: string;
  configType: '' | 'admin' | 'doctor';
};

const FilterForm = () => {
  const { t } = useTranslation();

  const initialValues: Filters = {
    name: '',
    configType: '',
  };

  const fields: FilterField<Filters>[] = [
    {
      name: 'name',
      component: (
        <CustomTextField
          fullWidth
          size="small"
          variant="outlined"
          id="name"
          name="name"
          label={t('config.name', 'Tên cấu hình')}
        />
      ),
    },
    {
      name: 'configType',
      component: (
        <FormControl fullWidth size="small" variant="outlined">
          <InputLabel id="configType-label">{t('config.type', 'Loại cấu hình')}</InputLabel>
          <CustomSelect
            labelId="configType-label"
            id="configType"
            name="configType"
            label={t('config.type', 'Loại cấu hình')}
            variant="outlined"
          >
            <MenuItem value="">{t('common.all', 'Tất cả')}</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="doctor">Doctor</MenuItem>
          </CustomSelect>
        </FormControl>
      ),
    },
  ];

  return <DataTableFilter<Filters> fields={fields} initialValues={initialValues} />;
};

export default FilterForm;
