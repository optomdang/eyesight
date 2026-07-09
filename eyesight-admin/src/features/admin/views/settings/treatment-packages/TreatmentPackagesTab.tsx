import { useState } from 'react';
import { MUIDataTableColumnDef } from 'mui-datatables';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import TreatmentPackageForm from './forms/TreatmentPackageForm';
import TreatmentPackageFilterForm from './forms/filter-form';
import { Button, Box, Chip, IconButton, Tooltip } from '@mui/material';
import { Add, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { TreatmentPackage } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';
import { compactDataTableTitleSx } from 'src/utils/compactDataTableTitleSx';
import useAuth from 'src/contexts/authGuard/useAuth';
import { useConfirm } from 'src/hooks/useConfirm';

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
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const isAdmin = user?.userType === 'admin';
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
    if (!isAdmin) return;
    handleOpenModal(rowData.id);
  };

  const handleDeleteData = async (rowData: TreatmentPackage) => {
    if (!isAdmin) return;
    try {
      await removeData(rowData.id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete treatment package:', err);
    }
  };

  const handleDeleteWithConfirm = async (rowData: TreatmentPackage) => {
    if (!isAdmin) return;

    const confirmed = await confirm({
      title: t('common.confirmDeleteTitle', 'Xác nhận xóa'),
      message: t('common.confirmDelete', 'Bạn có chắc chắn muốn xóa?'),
      confirmText: t('common.delete', 'Xóa'),
      cancelText: t('common.cancel', 'Hủy'),
      confirmColor: 'error',
    });

    if (!confirmed) return;
    await handleDeleteData(rowData);
  };

  const renderRowActions = (row: TreatmentPackage) => (
    <>
      <Tooltip
        title={
          isAdmin
            ? t('common.edit', 'Sửa')
            : t('admin.adminOnlyAction', 'Chỉ quản trị viên mới có quyền thực hiện')
        }
        arrow
      >
        <span>
          <IconButton
            size="small"
            disabled={!isAdmin}
            onClick={() => handleEditData(row)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip
        title={
          isAdmin
            ? t('common.delete', 'Xóa')
            : t('admin.adminOnlyAction', 'Chỉ quản trị viên mới có quyền thực hiện')
        }
        arrow
      >
        <span>
          <IconButton
            size="small"
            disabled={!isAdmin}
            onClick={() => void handleDeleteWithConfirm(row)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </>
  );

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
        customActions={renderRowActions}
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
