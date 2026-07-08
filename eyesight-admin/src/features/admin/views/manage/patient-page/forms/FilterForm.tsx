import { FormControl, InputLabel, MenuItem, Autocomplete } from '@mui/material';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { DataTableFilter, FilterField } from 'src/components/shared/DataTableFilter';
import { useTranslation } from 'src/hooks/useTranslation';
import { useCountries } from 'src/hooks/useCountries';

type PatientFilters = {
  name: string;
  code: string;
  phoneNumber: string;
  status: string;
  inactiveDays: string;
  effectiveness: string;
  severityLevel: string;
  country: string;
};

const initialValues: PatientFilters = {
  name: '',
  code: '',
  phoneNumber: '',
  status: '',
  inactiveDays: '',
  effectiveness: '',
  severityLevel: '',
  country: '',
};

const FilterForm = () => {
  const { t } = useTranslation();
  const { options: countryOptions, loading: countriesLoading } = useCountries();

  const fields: FilterField<PatientFilters>[] = [
    {
      name: 'name',
      component: (
        <CustomTextField
          fullWidth
          size="small"
          name="name"
          label={t('filter.patientName', 'Tên bệnh nhân')}
        />
      ),
    },
    {
      name: 'code',
      component: (
        <CustomTextField
          fullWidth
          size="small"
          name="code"
          label={t('filter.patientCode', 'Mã bệnh nhân')}
        />
      ),
    },
    {
      name: 'phoneNumber',
      component: (
        <CustomTextField
          fullWidth
          size="small"
          name="phoneNumber"
          label={t('filter.phoneNumber', 'Số điện thoại')}
        />
      ),
    },
    {
      name: 'status',
      component: (
        <FormControl fullWidth size="small">
          <InputLabel>{t('filter.status', 'Trạng thái')}</InputLabel>
          <CustomSelect name="status" label={t('filter.status', 'Trạng thái')}>
            <MenuItem value="">{t('filter.allStatus', 'Tất cả')}</MenuItem>
            <MenuItem value="active">{t('filter.inTreatment', 'Đang điều trị')}</MenuItem>
            <MenuItem value="inactive">{t('filter.stopTreatment', 'Dừng điều trị')}</MenuItem>
            <MenuItem value="completed">{t('filter.completed', 'Hoàn thành')}</MenuItem>
          </CustomSelect>
        </FormControl>
      ),
    },
    {
      name: 'inactiveDays',
      component: (
        <FormControl fullWidth size="small">
          <InputLabel>Ngày không hoạt động</InputLabel>
          <CustomSelect name="inactiveDays" label="Ngày không hoạt động">
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="no_config">Chưa có cài thiện</MenuItem>
            <MenuItem value="has_config">Đã cài thiện</MenuItem>
            <MenuItem value="0-7">&lt; 7 ngày</MenuItem>
            <MenuItem value="7-30">7-30 ngày</MenuItem>
            <MenuItem value="30-90">30-90 ngày</MenuItem>
            <MenuItem value="90+">&gt; 90 ngày</MenuItem>
          </CustomSelect>
        </FormControl>
      ),
    },
    {
      name: 'effectiveness',
      component: (
        <FormControl fullWidth size="small">
          <InputLabel>Hiệu quả</InputLabel>
          <CustomSelect name="effectiveness" label="Hiệu quả">
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="no_improvement">Chưa cải thiện</MenuItem>
            <MenuItem value="has_improvement">Đã cải thiện</MenuItem>
          </CustomSelect>
        </FormControl>
      ),
    },
    {
      name: 'severityLevel',
      component: (
        <FormControl fullWidth size="small">
          <InputLabel>Phân loại</InputLabel>
          <CustomSelect name="severityLevel" label="Phân loại">
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="mild">Nhẹ</MenuItem>
            <MenuItem value="moderate">Trung bình</MenuItem>
            <MenuItem value="severe">Nặng</MenuItem>
            <MenuItem value="critical">Rất nặng</MenuItem>
          </CustomSelect>
        </FormControl>
      ),
    },
    {
      name: 'country',
      component: (
        <Autocomplete
          options={countryOptions}
          getOptionLabel={(opt) => opt.label}
          isOptionEqualToValue={(opt, val) => opt.cca2 === val.cca2}
          loading={countriesLoading}
          noOptionsText="Không có dữ liệu"
          loadingText="Đang tải..."
          renderOption={(props, opt) => {
            const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
            return (
              <li key={opt.cca2} {...rest}>
                {opt.cca2 === 'VN' ? <strong>{opt.label}</strong> : opt.label}
              </li>
            );
          }}
          renderInput={(params) => (
            <CustomTextField
              {...params}
              size="small"
              label="Quốc gia"
              placeholder="Chọn quốc gia"
            />
          )}
        />
      ),
    },
  ];

  return (
    <DataTableFilter<PatientFilters>
      fields={fields}
      initialValues={initialValues}
      gridColumns={{ xs: 12, sm: 3 }}
    />
  );
};

export default FilterForm;
