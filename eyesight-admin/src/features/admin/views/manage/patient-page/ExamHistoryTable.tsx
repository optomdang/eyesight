import React from 'react';
import { MUIDataTableColumnDef } from 'mui-datatables';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { Button, Chip, Typography } from '@mui/material';
import { ExamResult } from 'src/types/core';
import dayjs from 'dayjs';
import { useTranslation } from 'src/hooks/useTranslation';
import { formatVisionLevel } from 'src/utils/visionUtils';
import { createSortableColumn, createDateColumn } from 'src/utils/tableColumnUtils';

interface ExamHistoryTableProps {
  onViewDetail?: (result: ExamResult) => void;
  getExamTypeName: (type: string) => string;
}

const ExamHistoryTable: React.FC<ExamHistoryTableProps> = ({ onViewDetail, getExamTypeName }) => {
  const { dataRes, tableState, onTableChange, loading } = useDataTable<ExamResult>();
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return t('status.completed', 'Hoàn thành');
      case 'incomplete':
        return t('status.incomplete', 'Chưa hoàn thành');
      default:
        return status;
    }
  };

  const columns: MUIDataTableColumnDef[] = [
    createSortableColumn('code', t('exam.resultDetail.code', 'Mã kết quả'), {
      customBodyRender: (value: string) => (
        <Typography variant="body2" fontWeight="medium">
          {value}
        </Typography>
      ),
    }),
    createSortableColumn('examType', t('exam.resultDetail.type', 'Loại kiểm tra'), {
      customBodyRender: (value: string) => (
        <Typography variant="body2">{getExamTypeName(value)}</Typography>
      ),
    }),
    {
      name: 'status',
      label: t('exam.resultDetail.status', 'Trạng thái'),
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value: string) => (
          <Chip
            label={getStatusLabel(value)}
            color={
              getStatusColor(value) as
                | 'default'
                | 'primary'
                | 'secondary'
                | 'error'
                | 'info'
                | 'success'
                | 'warning'
            }
            size="small"
          />
        ),
      },
    },
    {
      name: 'resultSummary',
      label: t('exam.resultDetail.summary', 'Kết quả'),
      options: {
        filter: false,
        sort: false,
        customBodyRenderLite: (dataIndex: number) => {
          const row = dataRes.rows?.[dataIndex];
          if (!row) return <Typography variant="body2">-</Typography>;

          if (row.examType === 'stereopsis') {
            return (
              <Typography variant="body2">
                {formatVisionLevel(row.examType, row.bothEyeLevel)}
              </Typography>
            );
          }

          const mp = formatVisionLevel(row.examType, row.rightEyeLevel);
          const mt = formatVisionLevel(row.examType, row.leftEyeLevel);

          return (
            <Typography variant="body2">
              MP: {mp} | MT: {mt}
            </Typography>
          );
        },
      },
    },
    createDateColumn('startedAt', t('exam.resultDetail.startedAt', 'Bắt đầu'), 'DD/MM/YYYY HH:mm'),
    createDateColumn(
      'completedAt',
      t('exam.resultDetail.completedAt', 'Hoàn thành'),
      'DD/MM/YYYY HH:mm'
    ),
  ];

  const customActions = onViewDetail
    ? (rowData: ExamResult) => {
        return (
          <Button size="small" variant="outlined" onClick={() => onViewDetail(rowData)}>
            {t('exam.resultDetail.viewDetail', 'Xem chi tiết')}
          </Button>
        );
      }
    : undefined;

  return (
    <CustomDataTable
      dataRes={dataRes}
      loading={loading}
      columns={columns}
      tableState={tableState}
      onTableChange={onTableChange}
      customActions={customActions}
      options={{
        rowsPerPage: 5,
        rowsPerPageOptions: [5],
        pagination: true,
      }}
    />
  );
};

export default ExamHistoryTable;
