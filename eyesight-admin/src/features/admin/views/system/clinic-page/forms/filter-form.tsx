import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { DataTableFilter, FilterField } from 'src/components/shared/DataTableFilter';
import { useTranslation } from 'src/hooks/useTranslation';

type Filters = { name: string; code: string };

const FilterForm = () => {
  const { t } = useTranslation();
  const initialValues: Filters = { name: '', code: '' };
  const fields: FilterField<Filters>[] = [
    {
      name: 'name',
      component: <CustomTextField fullWidth size="small" name="name" label={t('clinic.name', 'Tên phòng khám')} />,
    },
    {
      name: 'code',
      component: <CustomTextField fullWidth size="small" name="code" label={t('common.code', 'Mã')} />,
    },
  ];
  return <DataTableFilter<Filters> fields={fields} initialValues={initialValues} />;
};

export default FilterForm;
