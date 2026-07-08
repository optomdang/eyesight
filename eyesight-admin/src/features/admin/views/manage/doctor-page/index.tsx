import { useState } from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { MUIDataTableColumnDef } from 'mui-datatables';
import PageContainer from 'src/components/container/PageContainer';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { Button, Box, Typography } from '@mui/material';
import { Doctor } from 'src/types/core';
import { Add } from '@mui/icons-material';
import DoctorUserForm from '../user-page/forms/DoctorUserForm';
import {
  QUALIFICATION_OPTIONS,
  SPECIALIZATION_OPTIONS,
} from '../user-page/forms/user-form.constants';
import {
  adminListTableSx,
  colLayout,
} from 'src/utils/adminDataTableLayout';

const getSpecializationLabel = (specialization: string | undefined, t: any) => {
  if (!specialization) {
    return '-';
  }

  const matchedSpecialization = SPECIALIZATION_OPTIONS.find(
    (option) => option.value === specialization
  );

  if (!matchedSpecialization) {
    return specialization;
  }

  return t(matchedSpecialization.label, matchedSpecialization.defaultLabel);
};

const getQualificationLabel = (qualification: string | undefined, t: any) => {
  if (!qualification) {
    return t('common.notAvailable');
  }

  const matchedQualification = QUALIFICATION_OPTIONS.find(
    (option) => option.value === qualification
  );

  if (!matchedQualification) {
    return qualification;
  }

  return t(matchedQualification.label, matchedQualification.defaultLabel);
};

const getColumns = (t: (key: string, fallback?: string) => string): MUIDataTableColumnDef[] => [
  {
    name: 'user.name',
    label: 'Bác sĩ',
    options: {
      sort: true,
      ...colLayout('left', 140, true),
      customBodyRender: (value: string) => (
        <Typography variant="body2" noWrap title={value || undefined} sx={{ display: 'block' }}>
          {value || '-'}
        </Typography>
      ),
    },
  },
  {
    name: 'user.phoneNumber',
    label: t('doctor.phoneNumber'),
    options: {
      sort: true,
      ...colLayout('center', 120),
      customBodyRender: (value: string) => (
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          {value || '-'}
        </Typography>
      ),
    },
  },
  {
    name: 'specialization',
    label: t('doctor.specialization'),
    options: {
      sort: true,
      ...colLayout('center', 130),
      customBodyRender: (value: string) => {
        const text = getSpecializationLabel(value, t);
        return (
          <Typography variant="body2" noWrap title={text} sx={{ textAlign: 'center' }}>
            {text}
          </Typography>
        );
      },
    },
  },
  {
    name: 'clinic.name',
    label: t('doctor.clinic'),
    options: {
      sort: false,
      ...colLayout('center', 150),
      customBodyRender: (value: string) => {
        const text = value || t('common.notAvailable');
        return (
          <Typography variant="body2" noWrap title={text} sx={{ textAlign: 'center' }}>
            {text}
          </Typography>
        );
      },
    },
  },
  {
    name: 'licenseNumber',
    label: t('doctor.licenseNumber'),
    options: {
      sort: true,
      ...colLayout('center', 120),
      customBodyRender: (value: string) => (
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          {value || '-'}
        </Typography>
      ),
    },
  },
  {
    name: 'qualification',
    label: t('doctor.qualification', 'Trình độ'),
    options: {
      sort: true,
      ...colLayout('center', 120),
      customBodyRender: (value: string) => (
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          {getQualificationLabel(value, t)}
        </Typography>
      ),
    },
  },
  {
    name: 'treatedPatientsCount',
    label: t('doctor.treatedPatientsCount'),
    options: {
      sort: false,
      ...colLayout('center', 100),
      customBodyRender: (value: number) => (
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          {value || 0}
        </Typography>
      ),
    },
  },
];

const DoctorPage = () => {
  const { t } = useTranslation();
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
  } = useDataTable<Doctor>();
  const [openModal, setOpenModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const columns = getColumns(t);

  const handleOpenModal = (doctorId?: string | number) => {
    setSelectedDoctorId(doctorId || null);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedDoctorId(null);
  };

  const handleEditData = (rowData: Doctor) => {
    const userId = rowData.userId;
    handleOpenModal(userId);
  };

  const handleDeleteData = async (rowData: Doctor) => {
    try {
      await removeData(rowData.id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete doctor:', err);
    }
  };

  const handleBatchDelete = async (ids: (string | number)[]) => {
    try {
      await removeBatchData(ids);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to batch delete doctors:', err);
    }
  };

  return (
    <PageContainer
      title={t('doctor.managementTitle')}
      description={t('doctor.managementDescription')}
    >
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Add />}
            onClick={() => handleOpenModal()}
          >
            {t('doctor.create')}
          </Button>
          {selectedIds.length > 0 && (
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
        onEditData={handleEditData}
        onDeleteData={handleDeleteData}
        enableBatchDelete
        onSelectionChange={setSelectedIds}
        resetKey={`${endpoint}-${tableKey}`}
        actionsWidth={140}
        centerIndexColumn
        centerActionsColumn
        tableSx={adminListTableSx}
      />

      <DoctorUserForm open={openModal} onClose={handleClose} rowData={selectedDoctorId} />
    </PageContainer>
  );
};

export default DoctorPage;
