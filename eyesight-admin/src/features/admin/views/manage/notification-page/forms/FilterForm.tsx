import React, { useCallback } from 'react';
import { FormControl, InputLabel, MenuItem, TextField, Autocomplete } from '@mui/material';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { DataTableFilter, FilterField } from 'src/components/shared/DataTableFilter';
import * as PatientService from 'src/services/patient.service';
import { useAutocompleteOptions } from 'src/hooks/useAutocompleteOptions';
import { Patient, FilterFormData, DEFAULT_FILTER_FORM } from '../types';
import { useTranslation } from 'src/hooks/useTranslation';

const FilterForm: React.FC = () => {
  const { t } = useTranslation();

  // Stable references to prevent infinite re-trigger in useAutocompleteOptions
  const fetchPatients = useCallback(async (searchTerm: string) => {
    const params: any = { limit: 50 };
    if (searchTerm) {
      params.name = searchTerm;
    }
    return PatientService.getPatients(params);
  }, []);

  const mapPatientToOption = useCallback((patient: Patient) => {
    const name = patient.user?.name || patient.fullName || 'N/A';
    return {
      value: patient.userId?.toString() || '',
      label: `${patient.code} - ${name}`,
    };
  }, []);

  // Autocomplete with debounce for patients
  const patients = useAutocompleteOptions({
    fetchFn: fetchPatients,
    mapToOption: mapPatientToOption,
    searchOnMount: true,
    initialSearch: '',
  });

  const fields: FilterField<FilterFormData>[] = [
    {
      name: 'receiverId',
      component: (
        <Autocomplete
          size="small"
          fullWidth
          options={patients.options}
          loading={patients.loading}
          onInputChange={(_, value, reason) => {
            if (reason === 'input') patients.search(value);
          }}
          filterOptions={(x) => x} // Server-side filtering — disable MUI local filter
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('common.patient', 'Bệnh nhân')}
              placeholder={t('common.all', 'Tất cả')}
            />
          )}
        />
      ),
    },
    {
      name: 'category',
      component: (
        <FormControl fullWidth size="small">
          <InputLabel id="category-label">
            {t('notification.type.label', 'Loại thông báo')}
          </InputLabel>
          <CustomSelect
            labelId="category-label"
            id="category"
            name="category"
            label={t('notification.type.label', 'Loại thông báo')}
          >
            <MenuItem value="">{t('common.all', 'Tất cả')}</MenuItem>
            <MenuItem value="exam">{t('notification.type.exam', 'Khám bệnh')}</MenuItem>
            <MenuItem value="exercise">{t('notification.type.exercise', 'Bài tập')}</MenuItem>
            <MenuItem value="reminder">{t('notification.type.reminder', 'Nhắc nhở')}</MenuItem>
            <MenuItem value="system">{t('notification.type.system', 'Hệ thống')}</MenuItem>
          </CustomSelect>
        </FormControl>
      ),
    },
    {
      name: 'sent',
      component: (
        <FormControl fullWidth size="small">
          <InputLabel id="status-label">
            {t('notification.status.label', 'Trạng thái gửi')}
          </InputLabel>
          <CustomSelect
            labelId="status-label"
            id="sent"
            name="sent"
            label={t('notification.status.label', 'Trạng thái gửi')}
          >
            <MenuItem value="">{t('common.all', 'Tất cả')}</MenuItem>
            <MenuItem value="true">{t('notification.status.sent', 'Đã gửi')}</MenuItem>
            <MenuItem value="false">{t('notification.status.pending', 'Chưa gửi')}</MenuItem>
          </CustomSelect>
        </FormControl>
      ),
    },
  ];

  return (
    <DataTableFilter<FilterFormData>
      fields={fields}
      initialValues={DEFAULT_FILTER_FORM}
      title={t('notification.search.title', 'Tìm kiếm thông báo')}
      gridColumns={{ xs: 12, sm: 4 }}
    />
  );
};

export default FilterForm;
