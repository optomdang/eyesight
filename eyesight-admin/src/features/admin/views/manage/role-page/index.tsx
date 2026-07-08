import { useState } from 'react';
import { MUIDataTableColumnDef } from 'mui-datatables';
import PageContainer from 'src/components/container/PageContainer';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import RoleForm from './forms/role-form';
import { Button, Box } from '@mui/material';
import { Add } from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import FilterForm from './forms/filter-form.tsx';
import { Role } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';

const useRoleColumns = () => {
  const { t } = useTranslation();
  return [
    {
      name: 'code',
      label: t('common.code'),
      options: { sort: true }, // Direct field - backend supports
    },
    {
      name: 'name',
      label: t('role.name'),
      options: { sort: true }, // Direct field - backend supports
    },
  ];
};

const RolePage = ({ embedded = false }: { embedded?: boolean }) => {
  const { t } = useTranslation();
  const columns = useRoleColumns();
  const {
    dataRes,
    tableState,
    onTableChange,
    removeData,
    removeBatchData,
    fetchData,
    endpoint,
    tableKey,
    loading,
  } = useDataTable<Role>();
  const [openModal, setOpenModal] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const handleOpenModal = (roleId?: string | number) => {
    setSelectedRoleId(roleId || null);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedRoleId(null);
  };

  const handleEditData = (rowData: Role) => {
    const roleId = rowData.id; // rowData[0] là id
    handleOpenModal(roleId);
  };

  const handleDeleteData = async (rowData: Role) => {
    try {
      await removeData(rowData.id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete role:', err);
    }
  };

  const handleBatchDelete = async (ids: (string | number)[]) => {
    try {
      await removeBatchData(ids);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to batch delete roles:', err);
    }
  };
  const body = (
    <>
      <Box sx={{ mb: 1 }}>
        <FilterForm />
        <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Add />}
            onClick={() => handleOpenModal()}
          >
            {t('form.create')}
          </Button>
          {selectedIds.length > 0 && (
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => void handleBatchDelete(selectedIds)}
            >
              {t('common.delete', 'Xóa')} ({selectedIds.length})
            </Button>
          )}
        </Box>
      </Box>
      <CustomDataTable
        dataRes={dataRes}
        loading={loading}
        columns={columns}
        tableState={tableState}
        onTableChange={onTableChange}
        onEditData={handleEditData}
        onDeleteData={handleDeleteData}
        enableBatchDelete
        onSelectionChange={setSelectedIds}
        resetKey={`${endpoint}-${tableKey}`}
      />

      <RoleForm open={openModal} onClose={handleClose} rowData={selectedRoleId} />
    </>
  );

  if (embedded) {
    return body;
  }

  return (
    <PageContainer title={t('role.title')} description={t('role.pageDescription')}>
      {body}
    </PageContainer>
  );
};

export default RolePage;
