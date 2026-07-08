import React, { useState } from 'react';
import { Chip, Box, IconButton, Tooltip, Button } from '@mui/material';
import { Visibility, Send, Delete } from '@mui/icons-material';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { Notification } from './types';
import { useTranslation } from 'src/hooks/useTranslation';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import FilterForm from './forms/FilterForm';
import ManualNotificationFormBulk from './forms/ManualNotificationFormBulk';
import NotificationDetailDialog from './NotificationDetailDialog';
import PageContainer from 'src/components/container/PageContainer';
import { useConfirm } from 'src/hooks/useConfirm';

const NotificationPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    dataRes,
    tableState,
    onTableChange,
    endpoint,
    loading,
    fetchData,
    removeBatchData,
    removeData,
    tableKey,
  } = useDataTable<Notification>();
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const { confirm } = useConfirm();
  const [detailOpen, setDetailOpen] = useState(false);
  const [manualBulkOpen, setManualBulkOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const handleViewDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setDetailOpen(true);
  };

  const handleResendNotification = async (notification: Notification) => {
    try {
      // TODO: Implement resend API call
      showSnackbar(
        t('notification.resendSuccess', 'Đã gửi lại thông báo'),
        SNACKBAR_SEVERITY.SUCCESS
      );
    } catch (error) {
      showSnackbar(
        t('notification.resendError', 'Lỗi khi gửi lại thông báo'),
        SNACKBAR_SEVERITY.ERROR
      );
    }
  };

  const handleDeleteNotification = async (notification: Notification) => {
    const confirmed = await confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa thông báo này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      confirmColor: 'error',
    });
    if (!confirmed) return;
    try {
      await removeData(notification.id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleBatchDelete = async (ids: (string | number)[]) => {
    try {
      await removeBatchData(ids);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to batch delete notifications:', err);
    }
  };

  const columns = [
    {
      name: 'id',
      label: 'ID',
      options: {
        filter: false,
        sort: true,
        display: false,
      },
    },
    {
      name: 'category',
      label: 'Phân loại',
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value: string) => {
          const categoryLabels: Record<string, string> = {
            exam: 'Khám',
            exercise: 'Tập luyện',
            reminder: 'Nhắc nhở',
            system: 'Hệ thống',
          };
          return categoryLabels[value] || value;
        },
      },
    },
    {
      name: 'title',
      label: t('notification.subject', 'Tiêu đề'),
      options: {
        filter: false,
        sort: true,
      },
    },
    {
      name: 'receiver.name',
      label: 'Người nhận',
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value: string, tableMeta: any) => {
          const rowData = dataRes.rows[tableMeta.rowIndex];
          return rowData?.receiver?.name || '-';
        },
      },
    },
    {
      name: 'channel',
      label: 'Kênh gửi',
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value: string) => {
          const channelLabels: Record<string, string> = {
            email: 'Email',
            zalo: 'Zalo',
            sms: 'SMS',
            web: 'Web',
          };
          return channelLabels[value] || value || '-';
        },
      },
    },
    {
      name: 'receiver.contact',
      label: 'Liên hệ',
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value: string, tableMeta: any) => {
          const rowData = dataRes.rows[tableMeta.rowIndex];
          const receiver = rowData?.receiver;
          const channel = rowData?.channel;
          if (!receiver) return '-';

          if (channel === 'email') return receiver.email || '-';
          if (channel === 'sms' || channel === 'zalo') return receiver.phoneNumber || '-';
          return '-';
        },
      },
    },
    {
      name: 'sent',
      label: 'Trạng thái',
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value: boolean, tableMeta: any) => {
          const rowData = dataRes.rows[tableMeta.rowIndex];
          if (value) {
            return <Chip label="Đã gửi" color="success" size="small" />;
          } else if (rowData?.errorMessage) {
            return <Chip label="Lỗi" color="error" size="small" />;
          } else {
            return <Chip label="Chưa gửi" color="default" size="small" />;
          }
        },
      },
    },
  ];

  const customActions = (notification: Notification) => {
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title={t('common.view', 'Xem')}>
          <IconButton size="small" onClick={() => handleViewDetail(notification)} color="primary">
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        {notification.status === 'failed' && (
          <Tooltip title={t('notification.resend', 'Gửi lại')}>
            <IconButton
              size="small"
              onClick={() => handleResendNotification(notification)}
              color="warning"
            >
              <Send fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={t('common.delete', 'Xóa')}>
          <IconButton
            size="small"
            onClick={() => void handleDeleteNotification(notification)}
            color="error"
          >
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  const body = (
    <>
      <Box sx={{ mb: 2 }}>
        <FilterForm />
        <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Send />}
            onClick={() => setManualBulkOpen(true)}
          >
            {t('notification.sendManual', 'Gửi thông báo')}
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
        customActions={customActions}
        enableBatchDelete
        onSelectionChange={setSelectedIds}
        resetKey={`${endpoint}-${tableKey}`}
      />

      <NotificationDetailDialog
        open={detailOpen}
        notification={selectedNotification}
        onClose={() => setDetailOpen(false)}
      />

      {manualBulkOpen && (
        <ManualNotificationFormBulk
          open={manualBulkOpen}
          onClose={() => setManualBulkOpen(false)}
          onSuccess={() => {
            setManualBulkOpen(false);
            fetchData();
          }}
        />
      )}
    </>
  );

  if (embedded) {
    return body;
  }

  return (
    <PageContainer title={t('notification.title')} description={t('notification.description')}>
      {body}
    </PageContainer>
  );
};

export default NotificationPage;
