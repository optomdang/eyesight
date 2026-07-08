import React, { useMemo, useState } from 'react';
import { Chip, Box, Typography } from '@mui/material';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import { MUIDataTableColumn } from 'mui-datatables';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { useTranslation } from 'src/hooks/useTranslation';
import { formatVisionLevel } from 'src/utils/visionUtils';
import { createSortableColumn, createDateColumn } from 'src/utils/tableColumnUtils';
import type { ExamHistoryResult } from 'src/types/core';
import HistoryQuickFilterChips, { QuickFilterOption } from './HistoryQuickFilterChips';

const ExamHistoryTable: React.FC = () => {
  const { t } = useTranslation();
  const { dataRes, tableState, onTableChange, loading, searchData } =
    useDataTable<ExamHistoryResult>();
  const [activeFilterKey, setActiveFilterKey] = useState('all');

  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { key: 'all', label: t('common.all', 'Tất cả') },
      { key: 'far', label: t('exam.far', 'Nhìn xa'), value: 'far' },
      { key: 'near', label: t('exam.near', 'Nhìn gần'), value: 'near' },
      { key: 'contrast', label: t('exam.contrast', 'Độ tương phản'), value: 'contrast' },
      {
        key: 'stereopsis',
        label: t('exam.stereopsisFull', 'Thị giác lập thể'),
        value: 'stereopsis',
      },
    ],
    [t]
  );

  const handleFilterChange = (option: QuickFilterOption) => {
    setActiveFilterKey(option.key);
    if (option.value) {
      searchData({ examType: option.value });
      return;
    }
    searchData({});
  };

  // Exam results columns
  const examColumns: MUIDataTableColumn[] = [
    createSortableColumn('examType', t('exam.examType'), {
      customBodyRender: (value: string) => {
        const typeMap: { [key: string]: string } = {
          near: t('exam.near'),
          far: t('exam.far'),
          contrast: t('exam.contrast'),
          stereopsis: t('exam.stereopsis', 'stereopsis'),
        };
        return typeMap[value] || value;
      },
    }),
    {
      name: 'rightEyeLevel',
      label: t('exam.mp', 'MP'),
      options: {
        filter: false,
        sort: false,
        customBodyRenderLite: (dataIndex: number) => {
          const row = dataRes?.rows?.[dataIndex];
          if (!row) return '-';
          if (row.examType === 'stereopsis') return '-';
          return formatVisionLevel(row.examType, row.rightEyeLevel) || '-';
        },
      },
    },
    {
      name: 'leftEyeLevel',
      label: t('exam.mt', 'MT'),
      options: {
        filter: false,
        sort: false,
        customBodyRenderLite: (dataIndex: number) => {
          const row = dataRes?.rows?.[dataIndex];
          if (!row) return '-';
          if (row.examType === 'stereopsis') {
            return formatVisionLevel(row.examType, row.bothEyeLevel) || '-';
          }
          return formatVisionLevel(row.examType, row.leftEyeLevel) || '-';
        },
      },
    },
    createSortableColumn('status', t('exam.status'), {
      customBodyRender: (value: string) => {
        const statusMap: {
          [key: string]: { label: string; color: 'success' | 'warning' | 'default' };
        } = {
          completed: { label: t('common.completed'), color: 'success' },
          incomplete: { label: t('common.incomplete'), color: 'warning' },
        };

        const status = statusMap[value] || { label: value, color: 'default' };

        return <Chip label={status.label} color={status.color} size="small" />;
      },
    }),
    createDateColumn('createdAt', t('exam.createdAt'), 'vi-VN'),
    {
      name: 'completedAt',
      label: t('exam.completedAt', 'Ngày hoàn thành'),
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value: string | null) => {
          if (!value) return t('exam.notCompleted', 'Chưa hoàn thành');
          return new Date(value).toLocaleDateString('vi-VN');
        },
      },
    },
  ];

  return (
    <CustomDataTable
      title={t('exam.history.title', 'Lịch sử khám bệnh')}
      headerExtra={
        <HistoryQuickFilterChips
          options={filterOptions}
          activeKey={activeFilterKey}
          onChange={handleFilterChange}
        />
      }
      dataRes={dataRes}
      loading={loading}
      columns={examColumns}
      tableState={tableState}
      onTableChange={onTableChange}
      options={{
        selectableRows: 'none',
      }}
    />
  );
};

export default ExamHistoryTable;
