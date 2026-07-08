import { useCallback, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MUIDataTableColumnDef } from 'mui-datatables';
import PageContainer from 'src/components/container/PageContainer';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import PatientUserForm from '../user-page/forms/PatientUserForm.tsx';
import { Button, Box, Chip, Typography } from '@mui/material';
import { Add, PauseCircleOutline, PlayCircleOutline } from '@mui/icons-material';
import FilterForm from './forms/FilterForm.tsx';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { IconEye } from '@tabler/icons-react';
import { Patient } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';
import useAuth from 'src/contexts/authGuard/useAuth';
import { formatVisionLevel } from 'src/utils/visionUtils';
import * as patientService from 'src/services/patient.service';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import { useConfirm } from 'src/hooks/useConfirm';
import {
  adminListTableSx,
  colLayout,
} from 'src/utils/adminDataTableLayout';

const renderFarEyeVision = (
  patient: Patient | undefined,
  eye: 'left' | 'right',
  fallback: string
) => {
  const level =
    eye === 'right'
      ? patient?.examResults?.far?.currentResult?.rightEye
      : patient?.examResults?.far?.currentResult?.leftEye;
  const text = level ? formatVisionLevel('far', level) : fallback;
  return (
    <Typography variant="body2" sx={{ textAlign: 'center' }}>
      {text}
    </Typography>
  );
};

const getColumns = (
  t: (key: string, fallback?: string) => string,
  dataRes: { rows: Patient[] },
  getTreatmentStatusChip: (patient: Patient) => ReactNode
): MUIDataTableColumnDef[] => [
  {
    name: 'user.name',
    label: t('patient.fullName', 'Họ và tên'),
    options: {
      sort: true,
      ...colLayout('left', 140, true),
      customBodyRender: (value: string) => (
        <Typography variant="body2" noWrap title={value || undefined} sx={{ display: 'block' }}>
          {value || t('common.notAvailable')}
        </Typography>
      ),
    },
  },
  {
    name: 'doctor.user.name',
    label: 'Bác sĩ phụ trách',
    options: {
      sort: false,
      ...colLayout('left', 130, true),
      customBodyRender: (_value, tableMeta) => {
        const patient = dataRes.rows[tableMeta.rowIndex];
        const name = patient?.doctor?.user?.name || t('common.notAvailable');
        return (
          <Typography variant="body2" noWrap title={name !== t('common.notAvailable') ? name : undefined}>
            {name}
          </Typography>
        );
      },
    },
  },
  {
    name: 'user.phoneNumber',
    label: t('patient.phone'),
    options: {
      sort: true,
      ...colLayout('center', 120),
      customBodyRender: (value: string) => (
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          {value || t('common.notAvailable')}
        </Typography>
      ),
    },
  },
  {
    name: 'treatmentStatus',
    label: 'Trạng thái',
    options: {
      sort: true,
      ...colLayout('center', 130),
      customBodyRender: (_value, tableMeta) => {
        const patient = dataRes.rows[tableMeta.rowIndex];
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            {patient ? getTreatmentStatusChip(patient) : t('common.notAvailable')}
          </Box>
        );
      },
    },
  },
  {
    name: 'farVisionMP',
    label: 'MP',
    options: {
      sort: false,
      ...colLayout('center', 72),
      customBodyRender: (_value, tableMeta) =>
        renderFarEyeVision(dataRes.rows[tableMeta.rowIndex], 'right', '-'),
    },
  },
  {
    name: 'farVisionMT',
    label: 'MT',
    options: {
      sort: false,
      ...colLayout('center', 72),
      customBodyRender: (_value, tableMeta) =>
        renderFarEyeVision(dataRes.rows[tableMeta.rowIndex], 'left', '-'),
    },
  },
  {
    name: 'activeFrom',
    label: 'Đã hoạt động',
    options: {
      sort: false,
      ...colLayout('center', 120),
      customBodyRender: (value) => {
        if (!value) return t('common.notAvailable');
        const days = Math.floor(
          (new Date().getTime() - new Date(value).getTime()) / (1000 * 60 * 60 * 24)
        );
        return (
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            {`${days} Ngày`}
          </Typography>
        );
      },
    },
  },
  {
    name: 'activeTo',
    label: 'Còn lại',
    options: {
      sort: false,
      ...colLayout('center', 120),
      customBodyRender: (value) => {
        if (!value) return t('common.notAvailable');
        const days = Math.max(
          0,
          Math.floor((new Date(value).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        );
        return (
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            {`${days} Ngày`}
          </Typography>
        );
      },
    },
  },
];

const PatientPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const {
    dataRes,
    tableState,
    onTableChange,
    removeData,
    removeBatchData,
    fetchData,
    endpoint,
    tableKey,
    loading,
  } = useDataTable<Patient>();
  const [openModal, setOpenModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  // Check user permissions
  const userRights = user?.role?.rights || [];
  const canManagePatients = userRights.includes('managePatients');

  const getTreatmentStatusChip = useCallback(
    (patient: Patient) => {
      const isActive = patient.treatmentStatus !== false;
      return (
        <Chip
          label={
            isActive
              ? t('patient.treatmentActive', 'Đang điều trị')
              : t('patient.pause', 'Tạm dừng')
          }
          color={isActive ? 'success' : 'warning'}
          size="small"
          variant={isActive ? 'filled' : 'outlined'}
        />
      );
    },
    [t]
  );

  const columns = getColumns(t, dataRes, getTreatmentStatusChip);

  const handleOpenModal = (patientId?: string | number) => {
    setSelectedPatientId(patientId || null);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedPatientId(null);
  };

  const handleEditData = (rowData: Patient) => {
    const userId = rowData.userId;
    handleOpenModal(userId);
  };

  const handleViewDetail = (rowData: Patient) => {
    const patientId = rowData.id;
    if (patientId) {
      navigate(`/admin/patients/${patientId}`);
    }
  };

  const handleDeleteData = async (rowData: Patient) => {
    try {
      await removeData(rowData.id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete patient:', err);
    }
  };

  const handleBatchDelete = async (ids: (string | number)[]) => {
    try {
      await removeBatchData(ids);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to batch delete patients:', err);
    }
  };

  const handlePausePatient = useCallback(
    async (rowData: Patient) => {
      if (!rowData.id) return;

      const confirmed = await confirm({
        title: t('patient.pauseTitle', 'Tạm dừng điều trị'),
        message: t(
          'patient.pauseConfirm',
          'Bạn có chắc chắn muốn tạm dừng điều trị cho bệnh nhân này?'
        ),
        confirmText: t('patient.pause', 'Tạm dừng'),
        cancelText: t('common.cancel', 'Hủy'),
        confirmColor: 'warning',
      });

      if (!confirmed) return;

      try {
        await patientService.pausePatientTreatment(rowData.id);
        showSnackbar(
          t('patient.pauseSuccess', 'Đã tạm dừng điều trị thành công'),
          SNACKBAR_SEVERITY.SUCCESS
        );
        fetchData();
      } catch {
        showSnackbar(t('patient.pauseError', 'Lỗi khi tạm dừng điều trị'), SNACKBAR_SEVERITY.ERROR);
      }
    },
    [confirm, fetchData, showSnackbar, t]
  );

  const handleResumePatient = useCallback(
    async (rowData: Patient) => {
      if (!rowData.id) return;

      const confirmed = await confirm({
        title: t('patient.resumeTitle', 'Tiếp tục điều trị'),
        message: t(
          'patient.resumeConfirm',
          'Bạn có muốn tiếp tục điều trị cho bệnh nhân này không?'
        ),
        confirmText: t('patient.resumeAction', 'Tiếp tục'),
        cancelText: t('common.cancel', 'Hủy'),
        confirmColor: 'primary',
      });

      if (!confirmed) return;

      try {
        await patientService.resumePatientTreatment(rowData.id);
        showSnackbar(
          t('patient.resumeSuccess', 'Đã tiếp tục điều trị thành công'),
          SNACKBAR_SEVERITY.SUCCESS
        );
        fetchData();
      } catch {
        showSnackbar(
          t('patient.resumeError', 'Lỗi khi tiếp tục điều trị'),
          SNACKBAR_SEVERITY.ERROR
        );
      }
    },
    [confirm, fetchData, showSnackbar, t]
  );

  const customActions = (rowData: Patient) => {
    return (
      <>
        <Tooltip title={t('common.view')} arrow>
          <IconButton size="small" onClick={() => handleViewDetail(rowData)}>
            <IconEye />
          </IconButton>
        </Tooltip>
        {canManagePatients && rowData.treatmentStatus !== false && (
          <Tooltip title={t('patient.pause', 'Tạm dừng')} arrow>
            <IconButton size="small" onClick={() => void handlePausePatient(rowData)}>
              <PauseCircleOutline />
            </IconButton>
          </Tooltip>
        )}
        {canManagePatients && rowData.treatmentStatus === false && (
          <Tooltip title={t('patient.resumeAction', 'Tiếp tục')} arrow>
            <IconButton size="small" onClick={() => void handleResumePatient(rowData)}>
              <PlayCircleOutline />
            </IconButton>
          </Tooltip>
        )}
      </>
    );
  };

  return (
    <PageContainer title={t('patient.title')} description={t('patient.description')}>
      <Box sx={{ mb: 2 }}>
        <FilterForm />
        <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Add />}
            disabled={!canManagePatients}
            onClick={() => handleOpenModal()}
          >
            {t('common.addNew')}
          </Button>
          {canManagePatients && selectedIds.length > 0 && (
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
        onEditData={canManagePatients ? handleEditData : undefined}
        onDeleteData={canManagePatients ? handleDeleteData : undefined}
        enableBatchDelete={canManagePatients}
        onSelectionChange={canManagePatients ? setSelectedIds : undefined}
        customActions={customActions}
        resetKey={`${endpoint}-${tableKey}`}
        actionsWidth={180}
        centerIndexColumn
        centerActionsColumn
        tableSx={adminListTableSx}
      />

      <PatientUserForm open={openModal} onClose={handleClose} rowData={selectedPatientId} />
    </PageContainer>
  );
};

export default PatientPage;
