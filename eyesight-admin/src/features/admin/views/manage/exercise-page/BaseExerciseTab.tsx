import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Chip, IconButton, Tooltip } from '@mui/material';
import { Delete, Edit, PlayArrow } from '@mui/icons-material';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import { DataTableFilter, FilterField } from 'src/components/shared/DataTableFilter';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { useTranslation } from 'src/hooks/useTranslation';
import type { Exercise } from 'src/types/core';
import { MUIDataTableColumnDef } from 'mui-datatables';
import { isExerciseSupported } from 'src/components/exercises/registry';
import * as exerciseService from 'src/services/exercise.service';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import { useConfirm } from 'src/hooks/useConfirm';
import { createDateColumn } from 'src/utils/tableColumnUtils';
import BaseExerciseForm from './forms/BaseExerciseForm';
import BaseGameTestDialog from './components/BaseGameTestDialog';
import { requestExerciseFullscreen } from 'src/hooks/useExerciseFullscreen';
import { compactDataTableTitleSx } from 'src/utils/compactDataTableTitleSx';
import { colLayout } from 'src/utils/adminDataTableLayout';
import { useExercisePageHeader } from './ExercisePageHeaderContext';

type BaseExerciseFilters = {
  name: string;
  code: string;
};

const BaseExerciseFilterForm: React.FC = () => {
  const { t } = useTranslation();

  const fields: FilterField<BaseExerciseFilters>[] = [
    {
      name: 'name',
      component: (
        <CustomTextField
          fullWidth
          size="small"
          variant="outlined"
          name="name"
          label={t('exercise.baseGame.name', 'Bài tập gốc')}
        />
      ),
    },
    {
      name: 'code',
      component: (
        <CustomTextField
          fullWidth
          size="small"
          variant="outlined"
          name="code"
          label={t('exercise.baseGame.code', 'Mã bài tập')}
        />
      ),
    },
  ];

  return (
    <DataTableFilter<BaseExerciseFilters>
      fields={fields}
      initialValues={{ name: '', code: '' }}
    />
  );
};

const BaseExerciseTab: React.FC = () => {
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const { confirm } = useConfirm();
  const {
    dataRes,
    tableState,
    onTableChange,
    fetchData,
    endpoint,
    tableKey,
    loading,
    removeBatchData,
  } = useDataTable<Exercise>();

  const { setCreateAction } = useExercisePageHeader();

  const [openForm, setOpenForm] = useState(false);
  const [exerciseData, setExerciseData] = useState<Exercise | undefined>(undefined);
  const [testExercise, setTestExercise] = useState<Exercise | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const handleCreate = useCallback(() => {
    setExerciseData(undefined);
    setOpenForm(true);
  }, []);

  useEffect(() => {
    setCreateAction({
      label: t('exercise.baseGame.create', 'Thêm bài tập'),
      onClick: handleCreate,
    });
    return () => setCreateAction(null);
  }, [handleCreate, setCreateAction, t]);

  const handleEdit = async (id: number) => {
    try {
      const exercise = await exerciseService.getExercise(id);
      setExerciseData(exercise);
      setOpenForm(true);
    } catch {
      showSnackbar(t('exercise.baseGame.loadError', 'Không tải được game gốc'), SNACKBAR_SEVERITY.ERROR);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: t('common.confirmDeleteTitle', 'Xác nhận xóa'),
      message: t(
        'exercise.baseGame.deleteConfirm',
        'Xóa game gốc có thể ảnh hưởng các chế độ tập đang tham chiếu. Bạn có chắc?'
      ),
      confirmText: t('common.delete', 'Xóa'),
      cancelText: t('common.cancel', 'Hủy'),
      confirmColor: 'error',
    });
    if (!confirmed) return;

    try {
      await exerciseService.deleteExercise(id);
      showSnackbar(t('exercise.baseGame.deleteSuccess', 'Xóa game gốc thành công'), SNACKBAR_SEVERITY.SUCCESS);
      fetchData();
    } catch {
      showSnackbar(t('exercise.baseGame.deleteError', 'Xóa game gốc thất bại'), SNACKBAR_SEVERITY.ERROR);
    }
  };

  const columns: MUIDataTableColumnDef[] = [
    {
      name: 'name',
      label: t('exercise.baseGame.name', 'Bài tập gốc'),
      options: { sort: true, ...colLayout('left', 150) },
    },
    {
      name: 'code',
      label: t('exercise.baseGame.code', 'Mã bài tập'),
      options: { sort: true, ...colLayout('center', 120) },
    },
    {
      name: 'exerciseType',
      label: t('exercise.baseGame.type', 'Dạng (registry)'),
      options: { sort: true, ...colLayout('center', 120) },
    },
    {
      name: 'implementation',
      label: t('exercise.baseGame.implementation', 'Triển khai'),
      options: {
        sort: false,
        ...colLayout('center', 130),
        customBodyRenderLite: (dataIndex: number) => {
          const row = dataRes.rows[dataIndex];
          const supported = isExerciseSupported(row?.exerciseType, row?.code);
          return (
            <Chip
              size="small"
              color={supported ? 'success' : 'warning'}
              variant="outlined"
              label={
                supported
                  ? t('exercise.baseGame.implemented', 'Đã triển khai')
                  : t('exercise.baseGame.notImplemented', 'Chưa triển khai')
              }
            />
          );
        },
      },
    },
    {
      name: 'status',
      label: t('common.status', 'Trạng thái'),
      options: {
        sort: true,
        ...colLayout('center', 120),
        customBodyRender: (value: string) => (
          <Chip
            size="small"
            color={value === 'active' ? 'success' : 'default'}
            label={
              value === 'active'
                ? t('common.active', 'Đang hoạt động')
                : t('common.inactive', 'Ngưng hoạt động')
            }
          />
        ),
      },
    },
    createDateColumn('createdAt', t('common.createdAt', 'Ngày tạo'), 'vi-VN', colLayout('center', 110)),
    {
      name: 'actions',
      label: t('common.actions', 'Hành động'),
      options: {
        sort: false,
        filter: false,
        ...colLayout('center', 120),
        customBodyRenderLite: (dataIndex: number) => {
          const row = dataRes.rows[dataIndex];
          if (!row?.id) return null;
          const canTest = isExerciseSupported(row.exerciseType, row.code);
          return (
            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
              <Tooltip
                title={
                  canTest
                    ? t('exercise.baseGame.testPlay', 'Chơi thử')
                    : t('exercise.baseGame.testUnavailable', 'Game chưa triển khai — không thể chơi thử')
                }
              >
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    disabled={!canTest}
                    onClick={() => {
                      void requestExerciseFullscreen(document.documentElement).catch(() => {
                        // Browser may still require another gesture; exercise-level hook will retry.
                      });
                      setTestExercise(row);
                    }}
                  >
                    <PlayArrow fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('common.edit', 'Sửa')}>
                <IconButton size="small" color="secondary" onClick={() => void handleEdit(row.id)}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.delete', 'Xóa')}>
                <IconButton size="small" color="error" onClick={() => void handleDelete(row.id)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    },
  ];

  return (
    <>
      <Box sx={{ mb: 0.5 }}>
        <BaseExerciseFilterForm />
        {selectedIds.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => void removeBatchData(selectedIds).then(() => setSelectedIds([]))}
            >
              {t('common.delete', 'Xóa')} ({selectedIds.length})
            </Button>
          </Box>
        )}
      </Box>

      <CustomDataTable
        title={t('exercise.tabs.baseGamesTitle', 'Bài tập gốc')}
        tableSx={compactDataTableTitleSx}
        dataRes={dataRes}
        loading={loading}
        columns={columns}
        tableState={tableState}
        onTableChange={onTableChange}
        enableBatchDelete
        onSelectionChange={setSelectedIds}
        resetKey={`${endpoint}-${tableKey}`}
        centerIndexColumn
      />

      <BaseExerciseForm
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setExerciseData(undefined);
        }}
        exerciseData={exerciseData}
        onSuccess={() => fetchData()}
      />

      <BaseGameTestDialog
        open={Boolean(testExercise)}
        exercise={testExercise}
        onClose={() => setTestExercise(null)}
      />
    </>
  );
};

export default BaseExerciseTab;
