import React, { useState, useMemo, useCallback } from 'react';
import { MUIDataTableColumnDef } from 'mui-datatables';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { Button, Box, Chip, Typography } from '@mui/material';
import { Add, PauseCircleOutline, PlayCircleOutline } from '@mui/icons-material';
import PatientAssignmentForm from './forms/PatientAssignmentForm';
import type { ExerciseAssignment, Patient } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';
import useSnackbar from 'src/contexts/UseSnackbar';
import { useConfirm } from 'src/hooks/useConfirm';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import * as PatientService from 'src/services/patient.service';
import * as assignmentService from 'src/services/assignment.service';
import { createNestedColumn } from 'src/utils/tableColumnUtils';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

interface PatientExerciseDetailProps {
  patient: Patient;
}

// Helper functions for column rendering
const getConfigTypeChip = (value: string, t: any) => {
  let color: 'primary' | 'secondary' | 'default' = 'default';
  let label = value;

  switch (value) {
    case 'admin':
      color = 'primary';
      label = t('config.types.admin', 'Quản trị viên');
      break;
    case 'doctor':
      color = 'secondary';
      label = t('config.types.doctor', 'Bác sĩ');
      break;
  }

  return <Chip label={label} size="small" color={color} variant="outlined" />;
};

const getEyeChip = (value: string, t: any) => (
  <Chip
    label={
      value === 'both'
        ? t('config.eyes.both', 'Cả hai')
        : value === 'left'
          ? t('config.eyes.left', 'Trái')
          : value === 'right'
            ? t('config.eyes.right', 'Phải')
            : '-'
    }
    size="small"
    variant="outlined"
  />
);

const getStatusChip = (value: string, t: any) => {
  let color: 'success' | 'warning' | 'error' | 'default' = 'default';
  let label = value;

  switch (value) {
    case 'active':
      color = 'success';
      label = t('assignment.status.active', 'Đang thực hiện');
      break;
    case 'paused':
      color = 'warning';
      label = t('assignment.status.paused', 'Tạm dừng');
      break;
    case 'completed':
      color = 'default';
      label = t('assignment.status.completed', 'Hoàn thành');
      break;
  }

  return <Chip label={label} size="small" color={color} />;
};

const PatientExerciseDetail: React.FC<PatientExerciseDetailProps> = ({ patient }) => {
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const { confirm } = useConfirm();
  // The endpoint is configured via DataTableProvider: `exercise-assignments/patients/${patient.id}/assignments`
  const { dataRes, tableState, onTableChange, fetchData, loading } =
    useDataTable<ExerciseAssignment>();
  const [openModal, setOpenModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<number | null>(null);

  // Memoized columns for better performance
  const columns: MUIDataTableColumnDef[] = useMemo(
    () => [
      createNestedColumn('exerciseConfig.name', t('assignment.configName', 'Tên cấu hình')),
      createNestedColumn('exerciseConfig.exercise.name', t('assignment.exercise', 'Bài tập')),
      createNestedColumn(
        'exerciseConfig.configType',
        t('assignment.configType', 'Loại cấu hình'),
        '-',
        {
          customBodyRender: (value) => getConfigTypeChip(value, t),
        }
      ),
      createNestedColumn('exerciseConfig.eye', t('assignment.eye', 'Mắt'), '-', {
        customBodyRender: (value) => (value ? getEyeChip(value, t) : '-'),
      }),
      createNestedColumn('exerciseConfig.duration', t('assignment.duration', 'Thời lượng'), '-', {
        customBodyRender: (value) =>
          value != null ? `${value} ${t('common.minutes', 'phút')}` : '-',
      }),
      {
        name: 'status',
        label: t('assignment.status', 'Trạng thái'),
        options: {
          sort: true,
          customBodyRender: (value) => getStatusChip(value, t),
        },
      },
      {
        name: 'assignedAt',
        label: t('assignment.assignedAt', 'Ngày gán'),
        options: {
          sort: true,
          customBodyRender: (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
        },
      },
    ],
    [t]
  );

  // Memoized event handlers for better performance
  const handleOpenAssignModal = useCallback(() => {
    setEditingAssignment(null); // Clear edit mode
    setOpenModal(true);
  }, []);

  const handleEditAssignment = useCallback((assignment: any) => {
    setEditingAssignment(assignment.id); // Set assignment ID for edit mode
    setOpenModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setOpenModal(false);
    setEditingAssignment(null); // Clear edit mode
  }, []);

  const handleAssignmentSuccess = useCallback(() => {
    fetchData(); // Reload the assignments table
    handleCloseModal();
  }, [fetchData, handleCloseModal]);

  const handleDeleteAssignment = useCallback(
    async (assignment: ExerciseAssignment) => {
      try {
        // API endpoint: DELETE /patients/:patientId/assignments/:exerciseConfigId
        await PatientService.deletePatientAssignment(patient.id, assignment.id);
        showSnackbar(
          t('assignment.deleteSuccess', 'Xóa phân công thành công'),
          SNACKBAR_SEVERITY.SUCCESS
        );
        fetchData();
      } catch {
        showSnackbar(t('assignment.deleteError', 'Lỗi khi xóa phân công'), SNACKBAR_SEVERITY.ERROR);
      }
    },
    [patient.id, showSnackbar, t, fetchData]
  );

  const handlePauseAssignment = useCallback(
    async (assignment: ExerciseAssignment) => {
      const confirmed = await confirm({
        title: t('assignment.pauseTitle', 'Tạm dừng bài tập'),
        message: t('assignment.pauseConfirm', 'Bạn có chắc chắn muốn tạm dừng bài tập này?'),
        confirmText: t('assignment.pause', 'Tạm dừng'),
        cancelText: t('common.cancel', 'Hủy'),
        confirmColor: 'warning',
      });

      if (!confirmed) return;

      try {
        await assignmentService.pauseAssignment(assignment.id);
        showSnackbar(
          t('assignment.pauseSuccess', 'Đã tạm dừng bài tập thành công'),
          SNACKBAR_SEVERITY.SUCCESS
        );
        fetchData();
      } catch {
        showSnackbar(
          t('assignment.pauseError', 'Lỗi khi tạm dừng bài tập'),
          SNACKBAR_SEVERITY.ERROR
        );
      }
    },
    [confirm, fetchData, showSnackbar, t]
  );

  const handleResumeAssignment = useCallback(
    async (assignment: ExerciseAssignment) => {
      const confirmed = await confirm({
        title: t('assignment.resumeTitle', 'Tiếp tục bài tập'),
        message: t('assignment.resumeConfirm', 'Bạn có muốn tiếp tục bài tập này không?'),
        confirmText: t('assignment.resume', 'Tiếp tục'),
        cancelText: t('common.cancel', 'Hủy'),
        confirmColor: 'primary',
      });

      if (!confirmed) return;

      try {
        await assignmentService.resumeAssignment(assignment.id);
        showSnackbar(
          t('assignment.resumeSuccess', 'Đã tiếp tục bài tập thành công'),
          SNACKBAR_SEVERITY.SUCCESS
        );
        fetchData();
      } catch {
        showSnackbar(
          t('assignment.resumeError', 'Lỗi khi tiếp tục bài tập'),
          SNACKBAR_SEVERITY.ERROR
        );
      }
    },
    [confirm, fetchData, showSnackbar, t]
  );

  const customActions = useCallback(
    (assignment: ExerciseAssignment) => {
      if (assignment.status === 'active') {
        return (
          <Tooltip title={t('assignment.pause', 'Tạm dừng')} arrow>
            <IconButton size="small" onClick={() => void handlePauseAssignment(assignment)}>
              <PauseCircleOutline />
            </IconButton>
          </Tooltip>
        );
      }

      if (assignment.status === 'paused') {
        return (
          <Tooltip title={t('assignment.resume', 'Tiếp tục')} arrow>
            <IconButton size="small" onClick={() => void handleResumeAssignment(assignment)}>
              <PlayCircleOutline />
            </IconButton>
          </Tooltip>
        );
      }

      return null;
    },
    [handlePauseAssignment, handleResumeAssignment, t]
  );

  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {t('patient.exerciseAssignments', 'Phân công bài tập')}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={handleOpenAssignModal}
        >
          {t('assignment.assignExercise', 'Phân công bài tập')}
        </Button>
      </Box>

      <CustomDataTable
        dataRes={dataRes}
        loading={loading}
        columns={columns}
        tableState={tableState}
        onTableChange={onTableChange}
        onEditData={handleEditAssignment}
        onDeleteData={handleDeleteAssignment}
        customActions={customActions}
      />
      {openModal && (
        <PatientAssignmentForm
          open={openModal}
          onClose={handleCloseModal}
          patient={patient}
          assignmentId={editingAssignment}
          onAssign={handleAssignmentSuccess}
        />
      )}
    </>
  );
};

export default PatientExerciseDetail;
