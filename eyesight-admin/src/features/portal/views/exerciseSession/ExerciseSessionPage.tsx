import React from 'react';
import { Box, Chip, Typography, IconButton, Tooltip } from '@mui/material';
import { IconList } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import PortalBreadcrumb from 'src/components/shared/PortalBreadcrumb';
import { MUIDataTableColumnDef } from 'mui-datatables';
import useDataTable from 'src/contexts/data-context/useDataTable';
import dayjs from 'dayjs';
import { useTranslation } from 'src/hooks/useTranslation';
import { createNestedColumn } from 'src/utils/tableColumnUtils';
import type { ExerciseSession } from 'src/types/core';

// SessionsPageContent - Component thực tế với useDataTable
const SessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { dataRes, tableState, onTableChange, loading } = useDataTable<ExerciseSession>();
  const { t } = useTranslation();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'incomplete':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t('common.completed', 'Đã hoàn thành');
      case 'incomplete':
        return t('common.incomplete', 'Chưa hoàn thành');
      default:
        return status;
    }
  };

  const handleViewSessionHistory = (session: ExerciseSession) => {
    // Navigate to session results page
    navigate(`/portal/assignments/${assignmentId}/sessions/${session.id}/results`);
  };

  // Render only view history button - no execute action
  const renderCustomActions = (session: ExerciseSession) => {
    return (
      <Box display="flex" gap={1}>
        <Tooltip title="Xem chi tiết">
          <IconButton
            color="default"
            size="small"
            onClick={() => handleViewSessionHistory(session)}
          >
            <IconList size={16} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  const formatLocalTime = (value?: string | null) => (value ? dayjs(value).format('HH:mm') : '-');

  const colProps = (width: number) => ({
    setCellHeaderProps: () => ({ style: { minWidth: `${width}px`, width: `${width}px` } }),
    setCellProps: () => ({ style: { minWidth: `${width}px`, width: `${width}px`, whiteSpace: 'nowrap' as const } }),
  });

  const columns: MUIDataTableColumnDef[] = [
    createNestedColumn('exerciseAssignment.exerciseConfig.name', 'Tên chế độ', '-', colProps(120)),
    createNestedColumn('exerciseAssignment.exerciseConfig.exercise.name', 'Tên bài tập', '-', colProps(120)),
    createNestedColumn(
      'exerciseAssignment.exerciseConfig.frequency',
      t('config.frequency', 'Tần suất'),
      '-',
      {
        ...colProps(100),
        customBodyRender: (value: string) => {
          return value ? t(`config.frequencies.${value}`, value) : '-';
        },
      }
    ),
    {
      name: 'date',
      label: 'Ngày thực hiện',
      options: {
        filter: false,
        sort: true,
        ...colProps(110),
        customBodyRender: (value: string, tableMeta: any) => {
          const session = dataRes?.rows?.[tableMeta.rowIndex] as ExerciseSession;
          const dateValue = value || session.startedAt || session.completedAt;
          return dateValue ? dayjs(dateValue).format('DD/MM/YYYY') : '-';
        },
      },
    },
    {
      name: 'status',
      label: 'Trạng thái',
      options: {
        filter: true,
        sort: true,
        ...colProps(130),
        customBodyRender: (value: string) => (
          <Chip label={getStatusText(value)} color={getStatusColor(value)} size="small" />
        ),
      },
    },
    {
      name: 'executionsCompleted',
      label: 'Số lần thực hiện',
      options: {
        filter: false,
        sort: true,
        ...colProps(90),
        customBodyRender: (value: number) => value || 0,
      },
    },
    {
      name: 'validExecutions',
      label: 'Số lần hợp lệ',
      options: {
        filter: false,
        sort: true,
        ...colProps(90),
        customBodyRender: (_: any, tableMeta: any) => {
          const session = dataRes?.rows?.[tableMeta.rowIndex] as ExerciseSession;
          const executionCount = session.exerciseAssignment?.exerciseConfig?.executionCount || 3;

          return (
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2">
                {session.validExecutions || 0}/{executionCount}
              </Typography>
            </Box>
          );
        },
      },
    },
    {
      name: 'bestScore',
      label: 'Điểm cao nhất',
      options: {
        filter: false,
        sort: true,
        ...colProps(90),
        customBodyRender: (value: number) => (value > 0 ? value : '-'),
      },
    },
    {
      name: 'averageScore',
      label: 'Điểm TB',
      options: {
        filter: false,
        sort: true,
        ...colProps(70),
        customBodyRender: (value: string | number) => {
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          return numValue && numValue > 0 ? numValue.toFixed(1) : '-';
        },
      },
    },
    {
      name: 'firstPlayedAt',
      label: 'Bắt đầu',
      options: {
        filter: false,
        sort: true,
        ...colProps(70),
        customBodyRender: (_: string, tableMeta: any) => {
          const session = dataRes?.rows?.[tableMeta.rowIndex] as ExerciseSession;
          return formatLocalTime(session?.firstPlayedAt ?? session?.startedAt);
        },
      },
    },
    {
      name: 'lastPlayedAt',
      label: 'Hoàn thành',
      options: {
        filter: false,
        sort: true,
        ...colProps(80),
        customBodyRender: (_: string, tableMeta: any) => {
          const session = dataRes?.rows?.[tableMeta.rowIndex] as ExerciseSession;
          return formatLocalTime(session?.lastPlayedAt ?? session?.completedAt);
        },
      },
    },
    {
      name: 'exerciseAssignment.exerciseConfig.duration',
      label: 'Thời lượng yêu cầu',
      options: {
        filter: false,
        sort: true,
        ...colProps(100),
        customBodyRender: (value: number, tableMeta: any) => {
          const session = dataRes?.rows?.[tableMeta.rowIndex] as ExerciseSession;
          const executionCount = session?.exerciseAssignment?.exerciseConfig?.executionCount || 1;
          return value ? `${value * executionCount} phút` : '-';
        },
      },
    },
    {
      name: 'duration',
      label: 'Thời gian thực hiện',
      options: {
        filter: false,
        sort: true,
        ...colProps(100),
        customBodyRender: (value: number) => {
          if (!value || value === 0) return '-';
          const minutes = Math.floor(value / 60);
          const seconds = value % 60;
          return minutes > 0 ? `${minutes}p ${seconds}s` : `${seconds}s`;
        },
      },
    },
  ];

  const breadcrumbItems = [
    {
      label: 'Assignment',
      onClick: () => navigate('/portal/exercises'),
    },
    {
      label: assignmentId || 'Unknown',
    },
  ];

  return (
    <Box>
      <PortalBreadcrumb items={breadcrumbItems} />

      <CustomDataTable
        title="Lịch sử thực hiện bài tập"
        dataRes={dataRes}
        loading={loading}
        tableState={tableState}
        columns={columns}
        onTableChange={onTableChange}
        customActions={renderCustomActions}
        actionsWidth={60}
        options={{
          selectableRows: 'none',
          rowsPerPageOptions: [10, 25, 50],
          elevation: 0,
        }}
      />
    </Box>
  );
};

export default SessionsPage;
