import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'src/hooks/useTranslation';
import { MUIDataTableColumnDef } from 'mui-datatables';
import PageContainer from 'src/components/container/PageContainer';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import UserForm from './forms/user-form';
import { Button, Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
import { IconPlayerPlay, IconPlayerPause, IconEye } from '@tabler/icons-react';

import FilterForm from './forms/filter-form.tsx';
import { User } from 'src/types/core';
import {
  adminListTableSx,
  colLayout,
  colLayoutHeadCenterBodyLeft,
} from 'src/utils/adminDataTableLayout';

const getColumns = (t: (key: string, fallback?: string) => string): MUIDataTableColumnDef[] => [
  {
    name: 'name',
    label: t('patient.patient', 'Bệnh nhân'),
    options: {
      filter: false,
      sort: true,
      ...colLayoutHeadCenterBodyLeft(140, true),
      customBodyRender: (value: string) => (
        <Typography variant="body2" noWrap title={value || undefined} sx={{ display: 'block' }}>
          {value || '-'}
        </Typography>
      ),
    },
  },
  {
    name: 'email',
    label: t('user.email', 'Email'),
    options: {
      filter: false,
      sort: true,
      ...colLayoutHeadCenterBodyLeft(160, true),
      customBodyRender: (value: string) => (
        <Typography variant="body2" noWrap title={value || undefined} sx={{ display: 'block' }}>
          {value || '-'}
        </Typography>
      ),
    },
  },
  {
    name: 'phoneNumber',
    label: t('user.phoneNumber', 'Số điện thoại'),
    options: {
      filter: false,
      sort: true,
      ...colLayout('center', 120),
      customBodyRender: (value: string) => (
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          {value || '-'}
        </Typography>
      ),
    },
  },
  {
    name: 'userType',
    label: t('user.type', 'Loại tài khoản'),
    options: {
      sort: true,
      ...colLayout('center', 130),
      customBodyRender: (value: string) => {
        const colorMap: Record<string, 'primary' | 'success' | 'info'> = {
          admin: 'primary',
          doctor: 'success',
          patient: 'info',
        };
        const labelMap: Record<string, string> = {
          admin: 'Admin',
          doctor: 'Bác sĩ',
          patient: 'Bệnh nhân',
        };
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Chip
              label={labelMap[value] || value}
              color={colorMap[value] || 'default'}
              size="small"
            />
          </Box>
        );
      },
    },
  },
  {
    name: 'active',
    label: t('user.accountStatus', 'Trạng thái'),
    options: {
      sort: true,
      ...colLayout('center', 100),
      customBodyRender: (value: boolean) => (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Tooltip title={value ? 'Đang hoạt động' : 'Tạm dừng'} arrow>
            <IconButton size="small" disabled>
              {value ? (
                <IconPlayerPlay size={20} color="green" />
              ) : (
                <IconPlayerPause size={20} color="gray" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  },
];

const UserPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  } = useDataTable<User>();
  const [openModal, setOpenModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const columns = getColumns(t);

  const handleOpenModal = (userId?: string | number) => {
    setSelectedUserId(userId ?? null);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedUserId(null);
  };

  const handleViewPatient = (rowData: User) => {
    const patientId = rowData.patient?.id;
    if (patientId) {
      navigate(`/admin/patients/${patientId}`);
    }
  };

  const handleEditData = (rowData: User) => {
    handleOpenModal(rowData.id);
  };

  const handleDeleteData = async (rowData: User) => {
    try {
      await removeData(rowData.id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleBatchDelete = async (ids: (string | number)[]) => {
    try {
      await removeBatchData(ids);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to batch delete users:', err);
    }
  };

  const customActions = (rowData: User) => {
    if (rowData.userType !== 'patient' || !rowData.patient?.id) {
      return null;
    }
    return (
      <Tooltip title={t('common.view', 'Xem')} arrow>
        <IconButton size="small" onClick={() => handleViewPatient(rowData)}>
          <IconEye size={18} />
        </IconButton>
      </Tooltip>
    );
  };

  const createUserButton = (
    <Button
      variant="contained"
      color="primary"
      size="small"
      startIcon={<Add />}
      onClick={() => handleOpenModal()}
    >
      {t('user.create')}
    </Button>
  );

  return (
    <PageContainer title={t('user.managementTitle')} description={t('user.managementDescription')}>
      <Box sx={{ mb: 2 }}>
        <FilterForm trailingActions={createUserButton} />
        {selectedIds.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => void handleBatchDelete(selectedIds)}
            >
              {t('common.delete', 'Xóa')} ({selectedIds.length})
            </Button>
          </Box>
        )}
      </Box>
      <CustomDataTable
        dataRes={dataRes}
        loading={loading}
        columns={columns}
        tableState={tableState}
        onTableChange={onTableChange}
        customActions={customActions}
        onEditData={handleEditData}
        onDeleteData={handleDeleteData}
        enableBatchDelete
        onSelectionChange={setSelectedIds}
        resetKey={`${endpoint}-${tableKey}`}
        actionsWidth={140}
        centerIndexColumn
        centerActionsColumn
        tableSx={adminListTableSx}
      />

      <UserForm open={openModal} onClose={handleClose} rowData={selectedUserId} />
    </PageContainer>
  );
};

export default UserPage;
