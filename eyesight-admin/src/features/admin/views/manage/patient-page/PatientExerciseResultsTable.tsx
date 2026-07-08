import React from 'react';
import { MUIDataTableColumnDef } from 'mui-datatables';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { Chip, Box, Typography } from '@mui/material';
import { Patient } from 'src/types/core';
import dayjs from 'dayjs';
import {
  createSortableColumn,
  createDateColumn,
  createNestedColumn,
} from 'src/utils/tableColumnUtils';
import type { PatientExerciseResult } from 'src/types/admin/patient-detail';

interface PatientExerciseResultsTableProps {
  patient: Patient;
}

const PatientExerciseResultsTable: React.FC<PatientExerciseResultsTableProps> = ({ patient }) => {
  const { dataRes, tableState, onTableChange, loading } = useDataTable<PatientExerciseResult>();

  const columns: MUIDataTableColumnDef[] = [
    createNestedColumn('exercise.name', 'Bài tập', 'N/A', {
      customBodyRender: (value: string) => (
        <Typography variant="body2" fontWeight="medium">
          {value}
        </Typography>
      ),
    }),
    // {
    //   name: 'level',
    //   label: 'Cấp độ',
    //   options: {
    //     filter: true,
    //     sort: true,
    //     customBodyRender: (value: number) => (
    //       <Chip label={`Level ${value}`} variant="outlined" size="small" />
    //     ),
    //   },
    // },
    createSortableColumn('score', 'Điểm số', {
      filter: false,
      customBodyRender: (value: number) => (
        <Typography variant="body2" fontWeight="medium">
          {value?.toLocaleString()}
        </Typography>
      ),
    }),
    {
      name: 'accuracy',
      label: 'Độ chính xác',
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value: number) => {
          const percentage = Math.round(value * 100);
          const color = percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'error';
          return <Chip label={`${percentage}%`} color={color} size="small" variant="outlined" />;
        },
      },
    },
    createSortableColumn('duration', 'Thời gian', {
      filter: false,
      customBodyRender: (value: number) => {
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return (
          <Typography variant="body2">
            {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
          </Typography>
        );
      },
    }),
    {
      name: 'status',
      label: 'Kết quả',
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value: 'incomplete' | 'completed') => {
          if (value === 'completed') {
            return <Chip label="Hoàn thành" color="success" size="small" />;
          }

          return <Chip label="Chưa hoàn thành" color="default" size="small" />;
        },
      },
    },
    {
      name: 'visualSettings',
      label: 'Cài đặt thị giác',
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value: PatientExerciseResult['visualSettings']) => {
          if (!value) return <Typography variant="body2">-</Typography>;

          return (
            <Box sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
              <Typography variant="caption" display="block">
                Font: {value.fontSize}px
              </Typography>
              <Typography variant="caption" display="block">
                Độ tương phản: {value.contrast}%
              </Typography>
            </Box>
          );
        },
      },
    },
    {
      name: 'passConditions',
      label: 'Điều kiện đạt',
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value: PatientExerciseResult['passConditions']) => {
          if (!value) return <Typography variant="body2">-</Typography>;

          return (
            <Box sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
              <Typography variant="caption" display="block">
                Điểm: ≥{value.minScore}
              </Typography>
              <Typography variant="caption" display="block">
                Thời gian: ≤{value.maxTime}s
              </Typography>
              <Typography variant="caption" display="block">
                Chính xác: ≥{Math.round(value.minAccuracy * 100)}%
              </Typography>
            </Box>
          );
        },
      },
    },
    createSortableColumn('movesCount', 'Số lượt di chuyển', {
      filter: false,
      customBodyRender: (value: number | undefined) => (
        <Typography variant="body2">
          {value !== undefined ? value?.toLocaleString() : '-'}
        </Typography>
      ),
    }),
    createDateColumn('createdAt', 'Ngày thực hiện', 'DD/MM/YYYY HH:mm'),
  ];

  return (
    <CustomDataTable
      dataRes={dataRes}
      loading={loading}
      columns={columns}
      tableState={tableState}
      onTableChange={onTableChange}
      options={{
        rowsPerPage: 5,
        rowsPerPageOptions: [5],
        pagination: true,
      }}
    />
  );
};

export default PatientExerciseResultsTable;
