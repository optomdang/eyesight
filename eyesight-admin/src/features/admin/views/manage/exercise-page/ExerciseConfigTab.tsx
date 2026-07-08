import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { Box, Chip, IconButton, Tooltip, Button } from '@mui/material';
import { Delete, Edit, People } from '@mui/icons-material';
import useDataTable from 'src/contexts/data-context/useDataTable';
import useAuth from 'src/contexts/authGuard/useAuth';
import CustomDataTable from 'src/components/shared/CustomDataTable.tsx';
import FilterForm from './forms/FilterForm';
import ExerciseConfigForm from './forms/ExerciseConfigForm';
import BulkAssignModal from './components/BulkAssignModal';
import type { ExerciseConfig } from 'src/types/core';
import { MUIDataTableColumnDef } from 'mui-datatables';
import * as exerciseService from 'src/services/exercise.service';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import { useConfirm } from 'src/hooks/useConfirm';
import { compactDataTableTitleSx } from 'src/utils/compactDataTableTitleSx';
import { colLayout } from 'src/utils/adminDataTableLayout';
import { useExercisePageHeader } from './ExercisePageHeaderContext';

const ExerciseConfigTab: React.FC = () => {
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const {
    dataRes: configDataRes,
    tableState: configTableState,
    onTableChange: onConfigTableChange,
    fetchData,
    endpoint,
    tableKey,
    loading: configLoading,
    removeBatchData,
  } = useDataTable<ExerciseConfig>();

  const [openConfigModal, setOpenConfigModal] = useState(false);
  const [configData, setConfigData] = useState<ExerciseConfig | undefined>(undefined);
  const [openAssignmentModal, setOpenAssignmentModal] = useState(false);
  const [selectedConfigForAssignment, setSelectedConfigForAssignment] =
    useState<ExerciseConfig | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const { setCreateAction } = useExercisePageHeader();
  const canEdit = true;
  const canAssign = user?.userType === 'doctor';

  const handleCreateConfig = useCallback(() => {
    setConfigData(undefined);
    setOpenConfigModal(true);
  }, []);

  useEffect(() => {
    setCreateAction({
      label: t('config.create'),
      onClick: handleCreateConfig,
    });
    return () => setCreateAction(null);
  }, [handleCreateConfig, setCreateAction, t]);

  const handleEditConfig = async (configId: string | number) => {
    try {
      const config = await exerciseService.getExerciseConfigById(Number(configId));
      if (!config) {
        showSnackbar(t('config.notFound'), SNACKBAR_SEVERITY.ERROR);
        return;
      }
      setConfigData(config);
      setOpenConfigModal(true);
    } catch {
      showSnackbar(t('config.editError'), SNACKBAR_SEVERITY.ERROR);
    }
  };

  const handleDeleteConfig = async (configId: string | number) => {
    try {
      const confirmed = await confirm({
        title: t('common.confirmDeleteTitle', 'Xác nhận xóa'),
        message: t('common.confirmDelete', 'Bạn có chắc chắn muốn xóa?'),
        confirmText: t('common.delete', 'Xóa'),
        cancelText: t('common.cancel', 'Hủy'),
        confirmColor: 'error',
      });

      if (!confirmed) return;

      await exerciseService.deleteExerciseConfigById(Number(configId));
      showSnackbar(t('config.deleteSuccess'), SNACKBAR_SEVERITY.SUCCESS);
      fetchData();
    } catch {
      showSnackbar(t('config.deleteError'), SNACKBAR_SEVERITY.ERROR);
    }
  };

  const handleBatchDeleteConfig = async (ids: (string | number)[]) => {
    try {
      await removeBatchData(ids);
      setSelectedIds([]);
    } catch {
      showSnackbar(t('config.deleteError'), SNACKBAR_SEVERITY.ERROR);
    }
  };

  const handleAssignConfig = (config: ExerciseConfig) => {
    setSelectedConfigForAssignment(config);
    setOpenAssignmentModal(true);
  };

  const handleCloseAssignmentModal = () => {
    setOpenAssignmentModal(false);
    setSelectedConfigForAssignment(null);
  };

  const handlePatientAssignment = async () => {
    try {
      fetchData();
      setOpenAssignmentModal(false);
      setSelectedConfigForAssignment(null);
    } catch {
      showSnackbar(t('assignment.error'), SNACKBAR_SEVERITY.ERROR);
    }
  };

  const configColumns: MUIDataTableColumnDef[] = [
    {
      name: 'name',
      label: t('config.name'),
      options: {
        sort: true,
        ...colLayout('left', 150),
      },
    },
    {
      name: 'exercise.name',
      label: t('config.exercise'),
      options: {
        sort: true,
        ...colLayout('left', 130),
      },
    },
    {
      name: 'configType',
      label: t('config.type'),
      options: {
        sort: true,
        ...colLayout('center', 160),
        customBodyRender: (value, tableMeta) => {
          const rowData = configDataRes?.rows?.[tableMeta.rowIndex];

          if (value === 'admin') {
            return <Chip label={t('config.types.admin')} size="small" color="primary" variant="outlined" />;
          }

          if (value === 'doctor' && rowData?.createdByUser?.name) {
            return <Chip label={rowData.createdByUser.name} size="small" color="secondary" variant="outlined" />;
          }

          return <Chip label={t(`config.types.${value}`)} size="small" variant="outlined" />;
        },
      },
    },
    {
      name: 'eye',
      label: t('config.eye'),
      options: {
        sort: true,
        ...colLayout('center', 90),
        customBodyRender: (value) => (
          <Chip
            label={
              value === 'both'
                ? t('config.eyes.both')
                : value === 'left'
                  ? t('config.eyes.left')
                  : t('config.eyes.right')
            }
            size="small"
            variant="outlined"
          />
        ),
      },
    },
    {
      name: 'duration',
      label: t('config.duration'),
      options: {
        sort: true,
        ...colLayout('center', 110),
        customBodyRender: (value) => `${value} min`,
      },
    },
    {
      name: 'frequency',
      label: t('config.frequency'),
      options: {
        sort: true,
        ...colLayout('center', 100),
        customBodyRender: (value) => t(`config.frequencies.${value}`),
      },
    },
    {
      name: 'distance',
      label: t('config.distance'),
      options: {
        sort: true,
        ...colLayout('center', 100),
        customBodyRender: (value) => `${value}m`,
      },
    },
    {
      name: 'executionCount',
      label: t('config.executionCount'),
      options: {
        sort: true,
        ...colLayout('center', 80),
      },
    },
    {
      name: 'actions',
      label: t('common.actions'),
      options: {
        sort: false,
        filter: false,
        ...colLayout('center', 120),
        customBodyRender: (_value, tableMeta) => {
          const rowData = configDataRes?.rows?.[tableMeta.rowIndex];

          return (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              {canEdit && (
                <Tooltip title={t('common.edit')}>
                  <IconButton
                    size="small"
                    color="secondary"
                    onClick={() => handleEditConfig(rowData?.id)}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {canAssign && (
                <Tooltip title={t('patient.assignment.assign')}>
                  <IconButton size="small" color="info" onClick={() => handleAssignConfig(rowData)}>
                    <People fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={t('common.delete')}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteConfig(rowData?.id)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    },
  ];

  const handleCloseConfig = () => {
    setOpenConfigModal(false);
    setConfigData(undefined);
  };

  return (
    <>
      <Box sx={{ mb: 0.5 }}>
        <FilterForm />
        {selectedIds.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => void handleBatchDeleteConfig(selectedIds)}
            >
              {t('common.delete', 'Xóa')} ({selectedIds.length})
            </Button>
          </Box>
        )}
      </Box>

      <CustomDataTable
        title={t('exercise.tabs.configsTitle', 'Chế độ tập luyện')}
        tableSx={compactDataTableTitleSx}
        dataRes={configDataRes}
        loading={configLoading}
        columns={configColumns}
        tableState={configTableState}
        onTableChange={onConfigTableChange}
        enableBatchDelete
        onSelectionChange={setSelectedIds}
        resetKey={`${endpoint}-${tableKey}`}
        centerIndexColumn
      />

      <ExerciseConfigForm
        open={openConfigModal}
        onClose={handleCloseConfig}
        configData={configData}
      />

      {openAssignmentModal && (
        <BulkAssignModal
          open={openAssignmentModal}
          onClose={handleCloseAssignmentModal}
          config={selectedConfigForAssignment}
          onSuccess={handlePatientAssignment}
        />
      )}
    </>
  );
};

export default ExerciseConfigTab;
