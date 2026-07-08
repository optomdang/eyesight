import { useState } from 'react';
import { MUIDataTableColumnDef } from 'mui-datatables';
import PageContainer from 'src/components/container/PageContainer';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import CenterForm from './forms/center-form';
import { Button, Box } from '@mui/material';
import { Add } from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import FilterForm from './forms/filter-form.tsx';
import { Center } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';
import { createSortableColumn } from 'src/utils/tableColumnUtils';

const CenterPage = () => {
  const { t } = useTranslation();

  const columns: MUIDataTableColumnDef[] = [
    createSortableColumn('name', t('center.name')),
    createSortableColumn('code', t('center.code')),
  ];
  const { dataRes, tableState, onTableChange, removeData, fetchData, loading } =
    useDataTable<Center>();
  const [openModal, setOpenModal] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState<string | number | null>(null);

  const handleOpenModal = (centerId?: string | number) => {
    setSelectedCenterId(centerId || null);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedCenterId(null);
  };

  const handleEditData = (rowData: Center) => {
    const centerId = rowData.id; // rowData[0] là id
    handleOpenModal(centerId);
  };

  const handleDeleteData = async (rowData: Center) => {
    try {
      await removeData(rowData.id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete center:', err);
    }
  };
  return (
    <PageContainer title={t('center.management')} description={t('center.managementDescription')}>
      <Box sx={{ mb: 1 }}>
        <FilterForm />
        <Grid container spacing={1}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Add />}
            onClick={() => handleOpenModal()}
          >
            {t('common.create')}
          </Button>
        </Grid>
      </Box>
      <CustomDataTable
        dataRes={dataRes}
        loading={loading}
        columns={columns}
        tableState={tableState}
        onTableChange={onTableChange}
        onEditData={handleEditData}
        onDeleteData={handleDeleteData}
      />

      <CenterForm open={openModal} onClose={handleClose} rowData={selectedCenterId} />
    </PageContainer>
  );
};

export default CenterPage;
