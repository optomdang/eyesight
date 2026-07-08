import { MenuItem } from '@mui/material';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { DataTableFilter, FilterField } from 'src/components/shared/DataTableFilter';
import { useTranslation } from 'src/hooks/useTranslation';

type AuditLogFilters = {
  action: string;
  status: string;
  actorUserType: string;
  entityType: string;
  entityId: string;
  startDate: string;
  endDate: string;
};

const initialValues: AuditLogFilters = {
  action: '',
  status: '',
  actorUserType: '',
  entityType: '',
  entityId: '',
  startDate: '',
  endDate: '',
};

const FilterForm = () => {
  const { t } = useTranslation();

  const fields: FilterField<AuditLogFilters>[] = [
    {
      name: 'action',
      component: (
        <CustomTextField fullWidth size="small" name="action" label={t('auditLog.action', 'Hành động')} />
      ),
    },
    {
      name: 'status',
      component: (
        <CustomTextField select fullWidth size="small" name="status" label={t('common.status', 'Trạng thái')}>
          <MenuItem value="">{t('common.all', 'Tất cả')}</MenuItem>
          <MenuItem value="success">{t('auditLog.statusSuccess', 'Thành công')}</MenuItem>
          <MenuItem value="failed">{t('auditLog.statusFailed', 'Thất bại')}</MenuItem>
          <MenuItem value="partial">{t('auditLog.statusPartial', 'Một phần')}</MenuItem>
        </CustomTextField>
      ),
    },
    {
      name: 'actorUserType',
      component: (
        <CustomTextField select fullWidth size="small" name="actorUserType" label={t('auditLog.actorType', 'Loại người dùng')}>
          <MenuItem value="">{t('common.all', 'Tất cả')}</MenuItem>
          <MenuItem value="admin">{t('auditLog.typeAdmin', 'Quản trị viên')}</MenuItem>
          <MenuItem value="doctor">{t('auditLog.typeDoctor', 'Bác sĩ')}</MenuItem>
          <MenuItem value="patient">{t('auditLog.typePatient', 'Bệnh nhân')}</MenuItem>
        </CustomTextField>
      ),
    },
    {
      name: 'entityType',
      component: (
        <CustomTextField fullWidth size="small" name="entityType" label={t('auditLog.entityType', 'Loại đối tượng')} />
      ),
    },
    {
      name: 'entityId',
      component: (
        <CustomTextField fullWidth size="small" name="entityId" label={t('auditLog.entityId', 'ID đối tượng')} />
      ),
    },
    {
      name: 'startDate',
      component: (
        <CustomTextField
          fullWidth size="small" type="date" name="startDate"
          label={t('auditLog.fromDate', 'Từ ngày')}
          InputLabelProps={{ shrink: true }}
        />
      ),
    },
    {
      name: 'endDate',
      component: (
        <CustomTextField
          fullWidth size="small" type="date" name="endDate"
          label={t('auditLog.toDate', 'Đến ngày')}
          InputLabelProps={{ shrink: true }}
        />
      ),
    },
  ];

  return <DataTableFilter<AuditLogFilters> fields={fields} initialValues={initialValues} />;
};

export default FilterForm;
