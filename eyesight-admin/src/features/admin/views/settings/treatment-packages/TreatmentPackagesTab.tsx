import { useState } from 'react';
import { MUIDataTableColumnDef } from 'mui-datatables';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import TreatmentPackageForm from './forms/TreatmentPackageForm';
import TreatmentPackageFilterForm from './forms/filter-form';
import { Button, Box, Chip } from '@mui/material';
import { Add } from '@mui/icons-material';
import { TreatmentPackage } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';
import { compactDataTableTitleSx } from 'src/utils/compactDataTableTitleSx';
import { usePermission } from 'src/hooks/usePermission';
import useAuth from 'src/contexts/authGuard/useAuth';

const useTreatmentPackageColumns = () => {
  return [
    {
      name: 'name',
      label: 'Tên gói',
      options: {
        sort: true,
        customBodyRender: (value: string, tableMeta: { rowData: unknown[] }) => {
          // Columns: [STT/id, name, packageType, exerciseCount, ...]
          const packageType = tableMeta.rowData[2] as string | undefined;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <span>{value}</span>
              {packageType === 'system' && (
                <Chip label="Hệ thống" size="small" color="primary" variant="outlined" />
              )}
            </Box>
          );
        },
      },
    },
    {
      name: 'packageType',
      label: 'packageType',
      options: { display: false, sort: false },
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
  const { user } = useAuth();
  const isAdmin = user?.userType === 'admin';
  const canManageCustom = hasPermission('manageExercises');
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

  const canMutatePackage = (pkg: TreatmentPackage) => {
    if (pkg.packageType === 'system') return isAdmin;
    return canManageCustom;
  };

  const handleEditData = (rowData: TreatmentPackage) => {
    handleOpenModal(rowData.id);
  };

  const handleDeleteData = async (rowData: TreatmentPackage) => {
    if (!canMutatePackage(rowData)) return;
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
          {isAdmin && (
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
          {isAdmin && selectedIds.length > 0 && (
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
        onEditData={(row) => (canMutatePackage(row) ? handleEditData(row) : handleOpenModal(row.id))}
        onDeleteData={(row) => (canMutatePackage(row) ? handleDeleteData(row) : undefined)}
        enableBatchDelete={isAdmin}
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
