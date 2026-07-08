import { useState } from 'react';
import { MUIDataTableColumnDef } from 'mui-datatables';
import PageContainer from 'src/components/container/PageContainer';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import ClinicForm from './forms/clinic-form';
import { Button, Box } from '@mui/material';
import { Add } from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import FilterForm from './forms/filter-form.tsx';
import { Clinic } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';
import { createSortableColumn } from 'src/utils/tableColumnUtils';

const ClinicPage = () => {
  const { t } = useTranslation();

  const columns: MUIDataTableColumnDef[] = [
    createSortableColumn('code', t('clinic.code')),
    createSortableColumn('name', t('clinic.name')),
    { name: 'phoneNumber', label: t('clinic.phoneNumber'), options: { sort: false } },
    { name: 'address', label: t('clinic.address'), options: { sort: false } },
  ];
  const {
    dataRes,
    tableState,
    onTableChange,
    removeData,
    removeBatchData,
    fetchData,
    loading,
    endpoint,
    tableKey,
  } = useDataTable<Clinic>();
  const [openModal, setOpenModal] = useState(false);
  const [selectedClinicId, setSelectedClinicId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const handleOpenModal = (clinicId?: string | number) => {
    setSelectedClinicId(clinicId || null);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedClinicId(null);
  };

  const handleEditData = (rowData: Clinic) => {
    const clinicId = rowData.id; // rowData[0] là id
    handleOpenModal(clinicId);
  };

  const handleDeleteData = async (rowData: Clinic) => {
    try {
      await removeData(rowData.id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete clinic:', err);
    }
  };

  const handleBatchDelete = async (ids: (string | number)[]) => {
    try {
      await removeBatchData(ids);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to batch delete clinics:', err);
    }
  };
  return (
    <PageContainer title={t('clinic.management')} description={t('clinic.managementDescription')}>
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
            {t('common.create')}
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

      <ClinicForm open={openModal} onClose={handleClose} rowData={selectedClinicId} />
    </PageContainer>
  );
};

export default ClinicPage;
