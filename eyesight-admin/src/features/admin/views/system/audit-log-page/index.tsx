import { useMemo, useState } from 'react';
import { Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { MUIDataTableColumnDef } from 'mui-datatables';
import PageContainer from 'src/components/container/PageContainer';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { useTranslation } from 'src/hooks/useTranslation';
import { AuditLog } from 'src/types/core';
import { createDateColumn, createSortableColumn } from 'src/utils/tableColumnUtils';
import FilterForm from './forms/filter-form';
import AuditLogDetailDialog from './AuditLogDetailDialog';
import { getAuditActionLabel } from './actionLabels';

const getStatusColor = (status: AuditLog['status']) => {
  if (status === 'success') {
    return 'success';
  }

  if (status === 'failed') {
    return 'error';
  }

  return 'warning';
};

const getStatusLabel = (status: AuditLog['status'], t: ReturnType<typeof useTranslation>['t']) => {
  if (status === 'success') {
    return t('auditLog.statusSuccess', 'Thành công');
  }

  if (status === 'failed') {
    return t('auditLog.statusFailed', 'Thất bại');
  }

  return t('auditLog.statusPartial', 'Một phần');
};

const AuditLogPage = () => {
  const { t } = useTranslation();
  const { dataRes, tableState, onTableChange, endpoint, loading } = useDataTable<AuditLog>();
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  const columns = useMemo<MUIDataTableColumnDef[]>(
    () => [
      createSortableColumn('action', t('auditLog.action', 'Hành động'), {
        customBodyRender: (value: string) => (
          <Tooltip title={value} arrow>
            <Typography variant="body2">{getAuditActionLabel(value, t)}</Typography>
          </Tooltip>
        ),
      }),
      createSortableColumn('status', t('common.status', 'Trạng thái'), {
        customBodyRender: (value: AuditLog['status']) => (
          <Chip label={getStatusLabel(value, t)} color={getStatusColor(value)} size="small" />
        ),
      }),
      {
        name: 'actorUser.name',
        label: t('auditLog.actor', 'Người thực hiện'),
        options: {
          filter: false,
          sort: false,
          customBodyRenderLite: (dataIndex: number) => {
            const rowData = dataRes.rows[dataIndex];
            const actorName = rowData?.actorUser?.name || rowData?.actorUser?.email || '-';
            return (
              <Typography variant="body2">
                {actorName}
                {rowData?.actorUserId ? ` (#${rowData.actorUserId})` : ''}
              </Typography>
            );
          },
        },
      },
      createSortableColumn('actorUserType', t('auditLog.actorType', 'Loại người dùng'), {
        customBodyRender: (value: string) => (
          <Typography variant="body2">{value || '-'}</Typography>
        ),
      }),
      {
        name: 'entityType',
        label: t('auditLog.entity', 'Đối tượng'),
        options: {
          filter: false,
          sort: false,
          customBodyRenderLite: (dataIndex: number) => {
            const rowData = dataRes.rows[dataIndex];
            const entityParts = [rowData?.entityType, rowData?.entityId].filter(Boolean);
            return <Typography variant="body2">{entityParts.join(' #') || '-'}</Typography>;
          },
        },
      },
      {
        name: 'requestMethod',
        label: t('auditLog.request', 'Request'),
        options: {
          filter: false,
          sort: false,
          customBodyRenderLite: (dataIndex: number) => {
            const rowData = dataRes.rows[dataIndex];
            const method = rowData?.requestMethod || '-';
            const path = rowData?.requestPath || '-';
            return (
              <Tooltip title={path} arrow>
                <Typography variant="body2" sx={{ maxWidth: 280 }} noWrap>
                  {method} {path}
                </Typography>
              </Tooltip>
            );
          },
        },
      },
      createDateColumn('occurredAt', t('auditLog.occurredAt', 'Thời điểm'), 'DD/MM/YYYY HH:mm'),
    ],
    [dataRes.rows, t]
  );

  const customActions = (auditLog: AuditLog) => {
    return (
      <Tooltip title={t('common.view', 'Xem')}>
        <IconButton size="small" onClick={() => setSelectedAuditLog(auditLog)} color="primary">
          <Visibility fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  };

  return (
    <PageContainer
      title={t('auditLog.title', 'Nhật ký hệ thống')}
      description={t(
        'auditLog.description',
        'Theo dõi thao tác người dùng, request và trạng thái xử lý trên hệ thống'
      )}
    >
      <FilterForm />

      <CustomDataTable
        dataRes={dataRes}
        loading={loading}
        columns={columns}
        tableState={tableState}
        onTableChange={onTableChange}
        customActions={customActions}
        resetKey={endpoint}
      />

      <AuditLogDetailDialog
        open={!!selectedAuditLog}
        auditLog={selectedAuditLog}
        onClose={() => setSelectedAuditLog(null)}
      />
    </PageContainer>
  );
};

export default AuditLogPage;
