import { MenuItem } from '@mui/material';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { DataTableFilter, FilterField } from 'src/components/shared/DataTableFilter';
import { useTranslation } from 'src/hooks/useTranslation';

type Filters = { search: string; userType: string };

interface FilterFormProps {
  trailingActions?: React.ReactNode;
}

const FilterForm = ({ trailingActions }: FilterFormProps) => {
  const { t } = useTranslation();
  const initialValues: Filters = { search: '', userType: '' };
  const fields: FilterField<Filters>[] = [
    {
      name: 'search',
      sx: { flex: '1 1 200px', minWidth: 160, maxWidth: 280 },
      component: (
        <CustomTextField
          fullWidth
          size="small"
          name="search"
          label={t('user.searchNameOrPhone', 'Họ tên hoặc SĐT')}
          placeholder={t('user.searchNameOrPhonePlaceholder', 'Nhập họ tên hoặc số điện thoại')}
        />
      ),
    },
    {
      name: 'userType',
      sx: { flex: '0 1 180px', minWidth: 140, maxWidth: 200 },
      component: (
        <CustomTextField
          select
          fullWidth
          size="small"
          name="userType"
          label={t('user.type', 'Loại tài khoản')}
        >
          <MenuItem value="">{t('common.all', 'Tất cả')}</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="doctor">{t('user.doctor', 'Bác sĩ')}</MenuItem>
          <MenuItem value="patient">{t('user.patient', 'Bệnh nhân')}</MenuItem>
        </CustomTextField>
      ),
    },
  ];
  return (
    <DataTableFilter<Filters>
      fields={fields}
      initialValues={initialValues}
      inline
      trailingActions={trailingActions}
    />
  );
};

export default FilterForm;
