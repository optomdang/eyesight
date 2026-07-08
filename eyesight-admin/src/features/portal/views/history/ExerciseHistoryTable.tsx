import React, { useEffect, useMemo, useState } from 'react';
import { Chip, Button } from '@mui/material';
import { IconHistory } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import { createNestedColumn, createDateColumn } from 'src/utils/tableColumnUtils';
import { useDataTable } from 'src/contexts/data-context/useDataTable';
import { MUIDataTableColumnDef } from 'mui-datatables';
import { useTranslation } from 'src/hooks/useTranslation';
import { getMyAssignments } from 'src/services/patient.service';
import HistoryQuickFilterChips, { QuickFilterOption } from './HistoryQuickFilterChips';

interface PortalExerciseAssignment {
  id: number;
  status: string;
  sessionsCompleted: number;
  assignedAt: string;
  exerciseConfig: {
    id: number;
    name: string;
    frequency: string;
    executionCount: number;
    exercise: {
      id: number;
      name: string;
      code: string;
      exerciseType: string;
    };
  };
}

const ExerciseHistoryTable: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dataRes, tableState, onTableChange, loading, searchData } =
    useDataTable<PortalExerciseAssignment>();
  const [activeFilterKey, setActiveFilterKey] = useState('all');
  const [exerciseFilterOptions, setExerciseFilterOptions] = useState<QuickFilterOption[]>([
    { key: 'all', label: t('common.all', 'Tất cả') },
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadExerciseFilters = async () => {
      try {
        const response = await getMyAssignments({ page: 1, limit: 500 });
        const byExerciseId = new Map<number, string>();

        (response.rows || []).forEach((assignment: PortalExerciseAssignment) => {
          const exercise = assignment.exerciseConfig?.exercise;
          if (exercise?.id && exercise?.name) {
            byExerciseId.set(exercise.id, exercise.name);
          }
        });

        const options: QuickFilterOption[] = [
          { key: 'all', label: t('common.all', 'Tất cả') },
          ...Array.from(byExerciseId.entries())
            .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB, 'vi'))
            .map(([id, name]) => ({
              key: String(id),
              label: name,
              value: String(id),
            })),
        ];

        if (!cancelled) {
          setExerciseFilterOptions(options);
        }
      } catch (error) {
        console.error('Error loading exercise filter options:', error);
      }
    };

    void loadExerciseFilters();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleFilterChange = (option: QuickFilterOption) => {
    setActiveFilterKey(option.key);
    if (option.value) {
      searchData({ exerciseId: option.value });
      return;
    }
    searchData({});
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Đang hoạt động', color: 'success' as const };
      case 'completed':
        return { label: 'Hoàn thành', color: 'info' as const };
      case 'paused':
        return { label: 'Tạm dừng', color: 'warning' as const };
      default:
        return { label: status, color: 'default' as const };
    }
  };

  const handleViewSessions = (assignment: PortalExerciseAssignment) => {
    navigate(`/portal/assignments/${assignment.id}/sessions`);
  };

  const columns: MUIDataTableColumnDef[] = useMemo(
    () => [
      createNestedColumn('exerciseConfig.exercise.name', 'Tên bài tập'),
      {
        name: 'exerciseConfig.frequency',
        label: 'Tần suất',
        options: {
          filter: true,
          sort: false,
          customBodyRender: (value: string) => {
            const frequencyMap: Record<string, string> = {
              daily: 'Hằng ngày',
              weekly: 'Hằng tuần',
              monthly: 'Hằng tháng',
              quarterly: 'Hằng quý',
              yearly: 'Hằng năm',
            };
            return frequencyMap[value] || value;
          },
        },
      },
      {
        name: 'sessionsCompleted',
        label: 'Số session hoàn thành',
        options: {
          filter: false,
          sort: true,
        },
      },
      {
        name: 'status',
        label: 'Trạng thái',
        options: {
          filter: true,
          sort: true,
          customBodyRender: (value: string) => {
            const config = getStatusConfig(value);
            return <Chip label={config.label} color={config.color} size="small" />;
          },
        },
      },
      createDateColumn('assignedAt', 'Ngày giao', 'vi-VN'),
      {
        name: 'actions',
        label: 'Hành động',
        options: {
          filter: false,
          sort: false,
          customBodyRender: (_: any, tableMeta: any) => {
            const assignment = dataRes?.rows?.[tableMeta.rowIndex] as PortalExerciseAssignment;
            return (
              <Button
                variant="outlined"
                size="small"
                startIcon={<IconHistory size={16} />}
                onClick={() => handleViewSessions(assignment)}
              >
                Xem sessions
              </Button>
            );
          },
        },
      },
    ],
    [dataRes?.rows]
  );

  return (
    <CustomDataTable
      title={t('history.exerciseHistory')}
      headerExtra={
        exerciseFilterOptions.length > 1 ? (
          <HistoryQuickFilterChips
            options={exerciseFilterOptions}
            activeKey={activeFilterKey}
            onChange={handleFilterChange}
          />
        ) : undefined
      }
      dataRes={dataRes}
      loading={loading}
      columns={columns}
      tableState={tableState}
      onTableChange={onTableChange}
      options={{
        selectableRows: 'none',
      }}
    />
  );
};

export default ExerciseHistoryTable;
