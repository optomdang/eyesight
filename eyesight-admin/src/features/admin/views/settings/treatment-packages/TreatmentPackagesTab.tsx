import { useState } from 'react';
import { MUIDataTableColumnDef } from 'mui-datatables';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import TreatmentPackageForm from './forms/TreatmentPackageForm';
import TreatmentPackageFilterForm from './forms/filter-form';
import { Button, Box } from '@mui/material';
import { Add } from '@mui/icons-material';
import { TreatmentPackage } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';
import { compactDataTableTitleSx } from 'src/utils/compactDataTableTitleSx';
import { usePermission } from 'src/hooks/usePermission';

const useTreatmentPackageColumns = () => {
  return [
    {
      name: 'name',
      label: 'Tên gói',
      options: { sort: true },
    },
    {
      name: 'exerciseCount',
      label: 'Số bài tập',
      options: {
        sort: false,
        customBodyRender: (value: number) => value ?? 0,
      },
    },
    {
      name: 'userCount',
      label: 'Số người dùng',
      options: {
        sort: false,
        customBodyRender: (value: number) => value ?? 0,
      },
    },
    {
      name: 'improvementPercent',
      label: '% Cải thiện',
      options: {
        sort: false,
        customBodyRender: (value: number) => `${value ?? 0}%`,
      },
    },
  ] as MUIDataTableColumnDef[];
};

const TreatmentPackagesTab = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermission();
  const canManage = hasPermission('manageExercises');
  const columns = useTreatmentPackageColumns();
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
  } = useDataTable<TreatmentPackage>();
  const [openModal, setOpenModal] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const handleOpenModal = (packageId?: string | number) => {
    setSelectedPackageId(packageId || null);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedPackageId(null);
  };

  const handleEditData = (rowData: TreatmentPackage) => {
    handleOpenModal(rowData.id);
  };

  const handleDeleteData = async (rowData: TreatmentPackage) => {
    try {
      await removeData(rowData.id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete treatment package:', err);
    }
  };

  const handleBatchDelete = async (ids: (string | number)[]) => {
    try {
      await removeBatchData(ids);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to batch delete treatment packages:', err);
    }
  };

  return (
    <>
      <Box sx={{ mb: 1 }}>
        <TreatmentPackageFilterForm />
        <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          {canManage && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<Add />}
              onClick={() => handleOpenModal()}
            >
              {t('form.create')}
            </Button>
          )}
          {canManage && selectedIds.length > 0 && (
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
        onEditData={canManage ? handleEditData : undefined}
        onDeleteData={canManage ? handleDeleteData : undefined}
        enableBatchDelete={canManage}
        onSelectionChange={setSelectedIds}
        resetKey={`${endpoint}-${tableKey}`}
        centerIndexColumn
        centerActionsColumn
        tableSx={compactDataTableTitleSx}
      />

      <TreatmentPackageForm open={openModal} onClose={handleClose} rowData={selectedPackageId} />
    </>
  );
};

export default TreatmentPackagesTab;
