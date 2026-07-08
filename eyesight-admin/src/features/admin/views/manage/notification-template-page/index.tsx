import { useState } from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { MUIDataTableColumnDef } from 'mui-datatables';
import PageContainer from 'src/components/container/PageContainer';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { Box, Button, Chip, Grid } from '@mui/material';
import { Add } from '@mui/icons-material';
import type { NotificationTemplate } from 'src/types/core';
import TemplateForm from 'src/features/admin/views/manage/notification-template-page/forms/template-form';

const getColumns = (t: any): MUIDataTableColumnDef[] => [
  {
    name: 'code',
    label: t('template.code'),
    options: { sort: true }, // Direct field - backend supports
  },
  {
    name: 'name',
    label: t('template.name'),
    options: { sort: true }, // Direct field - backend supports
  },
  {
    name: 'category',
    label: t('template.category'),
    options: {
      sort: true, // Direct field - backend supports
      customBodyRender: (value: string) => (
        <Chip size="small" variant="outlined" label={t(`template.category_${value}`)} />
      ),
    },
  },
  {
    name: 'isActive',
    label: t('template.status'),
    options: {
      sort: true, // Direct field - backend supports
      customBodyRender: (value: boolean) => (
        <Chip
          size="small"
          color={value ? 'success' : 'default'}
          label={value ? t('common.active') : t('common.inactive')}
        />
      ),
    },
  },
];

const NotificationTemplatePage = ({ embedded = false }: { embedded?: boolean }) => {
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
  } = useDataTable<NotificationTemplate>();
  const [openModal, setOpenModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const columns = getColumns(t);

  const handleOpenModal = (id?: number | string) => {
    setSelectedId(id ?? null);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedId(null);
  };

  const handleEditData = (row: NotificationTemplate) => handleOpenModal(row.id);

  const handleDeleteData = async (row: NotificationTemplate) => {
    try {
      await removeData(row.id);
      fetchData();
    } catch (err) {
      // Error handled by removeData
    }
  };

  const handleBatchDelete = async (ids: (string | number)[]) => {
    try {
      await removeBatchData(ids);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to batch delete templates:', err);
    }
  };

  const body = (
    <>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Add />}
            onClick={() => handleOpenModal()}
          >
            {t('template.create')}
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
      />

      <TemplateForm open={openModal} onClose={handleClose} rowData={selectedId} />
    </>
  );

  if (embedded) {
    return body;
  }

  return (
    <PageContainer title={t('template.management')} description={t('template.managementDescription')}>
      {body}
    </PageContainer>
  );
};

export default NotificationTemplatePage;
