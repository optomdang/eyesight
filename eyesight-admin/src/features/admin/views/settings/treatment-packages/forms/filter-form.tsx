import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { DataTableFilter, FilterField } from 'src/components/shared/DataTableFilter';

type Filters = { name: string; code: string };

const TreatmentPackageFilterForm = () => {
  const initialValues: Filters = { name: '', code: '' };
  const fields: FilterField<Filters>[] = [
    {
      name: 'name',
      component: <CustomTextField fullWidth size="small" name="name" label="Tên gói" />,
    },
    {
      name: 'code',
      component: <CustomTextField fullWidth size="small" name="code" label="Mã gói" />,
    },
  ];
  return <DataTableFilter<Filters> fields={fields} initialValues={initialValues} />;
};

export default TreatmentPackageFilterForm;
