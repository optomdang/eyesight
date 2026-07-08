import { memo, useMemo, useState, ReactNode } from 'react';
import MUIDataTable, {
  MUIDataTableColumn,
  MUIDataTableColumnDef,
  MUIDataTableMeta,
  MUIDataTableOptions,
  MUIDataTableState,
} from 'mui-datatables';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import IconButton from '@mui/material/IconButton';
import { CustomDataTableProps } from 'src/types/core';
import { Box, CircularProgress, SxProps, Theme } from '@mui/material';
import { useTranslation } from 'src/hooks/useTranslation';
import { useConfirm } from 'src/hooks/useConfirm';

const CustomDataTableComponent = memo(
  <T extends (object | number[] | string[])[]>(
    props: CustomDataTableProps<T>
  ): React.JSX.Element => {
    const {
      title,
      headerExtra,
      dataRes,
      columns,
      loading,
      options,
      onTableChange,
      tableState,
      onEditData,
      onDeleteData,
      onViewData,
      enableBatchDelete = false,
      onSelectionChange,
      customActions,
      resetKey,
      actionsWidth = 220,
      centerIndexColumn = false,
      centerActionsColumn = false,
      tableSx,
    } = props;

    const { t } = useTranslation();
    const { confirm } = useConfirm();
    const [_selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);

    const handleDeleteClick = async (rowData: any) => {
      if (!onDeleteData) return;

      const confirmed = await confirm({
        title: t('common.confirmDeleteTitle', 'Xác nhận xóa'),
        message: t('common.confirmDelete', 'Bạn có chắc chắn muốn xóa?'),
        confirmText: t('common.delete', 'Xóa'),
        cancelText: t('common.cancel', 'Hủy'),
        confirmColor: 'error',
      });

      if (!confirmed) return;
      await Promise.resolve(onDeleteData(rowData));
    };
    const defaultOptions: MUIDataTableOptions = useMemo(
      () => ({
        filterType: 'checkbox',
        download: false,
        print: false,
        viewColumns: false,
        filter: false,
        search: false,
        selectToolbarPlacement: 'none',
        rowsPerPageOptions: [10, 25, 50],
        page: 0,
        rowsPerPage: 10,
        serverSide: true,
        enableNestedDataAccess: '.',
        selectableRowsHideCheckboxes: !enableBatchDelete,
        selectableRows: enableBatchDelete ? 'multiple' : 'single',
        onRowSelectionChange: (_currentRowsSelected, _allRowsSelected, rowsSelected) => {
          if (!enableBatchDelete) return;
          const ids = (rowsSelected ?? [])
            .map((idx) => {
              const row = dataRes.rows[idx] as any;
              return row?.id as string | number;
            })
            .filter(Boolean);
          setSelectedRowIds(ids);
          onSelectionChange?.(ids);
        },
        textLabels: {
          body: {
            noMatch: loading
              ? t('common.loading', 'Đang tải...')
              : t('datatable.noData', 'Rất tiếc, không tìm thấy bản ghi phù hợp'),
            toolTip: t('common.sort', 'Sắp xếp'),
            columnHeaderTooltip: (column) => `${t('common.sort', 'Sắp xếp theo')} ${column.label}`,
          },
          pagination: {
            next: t('datatable.next', 'Trang tiếp theo'),
            previous: t('datatable.previous', 'Trang trước'),
            rowsPerPage: t('datatable.rowsPerPage', 'Số dòng mỗi trang:'),
            displayRows: t('datatable.of', 'trong tổng số'),
          },
          toolbar: {
            search: t('datatable.search', 'Tìm kiếm'),
            downloadCsv: t('datatable.downloadCsv', 'Tải xuống CSV'),
            print: t('datatable.print', 'In'),
            viewColumns: t('datatable.viewColumns', 'Xem cột'),
            filterTable: t('datatable.filterTable', 'Lọc bảng'),
          },
          filter: {
            all: t('datatable.all', 'Tất cả'),
            title: t('datatable.filter', 'BỘ LỌC'),
            reset: t('datatable.reset', 'ĐẶT LẠI'),
          },
          viewColumns: {
            title: t('datatable.showColumns', 'Hiển thị cột'),
            titleAria: t('datatable.showHideColumns', 'Hiển thị/Ẩn cột bảng'),
          },
          selectedRows: {
            text: t('common.selected', 'dòng đã được chọn'),
            delete: t('common.delete', 'Xóa'),
            deleteAria: t('common.confirmDelete', 'Xóa các dòng đã chọn'),
          },
        },
      }),
      [t, loading, enableBatchDelete, dataRes.rows, onSelectionChange]
    );

    const indexColumn: MUIDataTableColumn = useMemo(
      () => ({
        name: 'id',
        label: t('common.stt', 'STT'),
        options: {
          sort: false,
          customBodyRender: (_value, tableMeta: MUIDataTableMeta) => {
            const { rowsPerPage, page } = tableMeta.tableState;
            const stt = rowsPerPage * page + tableMeta.rowIndex + 1;
            if (!centerIndexColumn) return stt;
            return (
              <Box component="span" sx={{ display: 'block', width: '100%', textAlign: 'center' }}>
                {stt}
              </Box>
            );
          },
          setCellHeaderProps: () => ({
            className: centerIndexColumn ? 'dt-align-center' : undefined,
            style: { width: '70px', minWidth: '70px' },
          }),
          setCellProps: () => ({
            className: centerIndexColumn ? 'dt-align-center' : undefined,
            style: { width: '70px', minWidth: '70px' },
          }),
        },
      }),
      [t, centerIndexColumn]
    );
    const customColumns = useMemo<MUIDataTableColumnDef[]>(() => {
      const baseColumns = [indexColumn, ...columns];

      // Only add Actions column if there are any actions to show
      if (onEditData || onDeleteData || onViewData || customActions) {
        baseColumns.push({
          name: 'Actions',
          label: t('common.actions', 'Hành động'),
          options: {
            sort: false,
            filter: false,
            customBodyRenderLite: (dataIndex: number) => {
              if (dataRes?.rows?.length && dataRes?.rows?.length > 0) {
                const rowData = dataRes.rows[dataIndex];
                return (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'nowrap',
                      gap: 0.5,
                      minWidth: 'max-content',
                      width: '100%',
                      justifyContent: centerActionsColumn ? 'center' : 'flex-start',
                    }}
                  >
                    {customActions && customActions(rowData)}
                    {onViewData && (
                      <Tooltip title={t('common.view', 'Xem')} arrow>
                        <IconButton size="small" onClick={() => onViewData(rowData)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onEditData && (
                      <Tooltip title={t('common.edit', 'Sửa')} arrow>
                        <IconButton size="small" onClick={() => onEditData(rowData)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onDeleteData && (
                      <Tooltip title={t('common.delete', 'Xóa')} arrow>
                        <IconButton size="small" onClick={() => void handleDeleteClick(rowData)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                );
              }
            },
            setCellHeaderProps: () => ({
              className: centerActionsColumn ? 'dt-align-center' : undefined,
              style: {
                width: `${actionsWidth}px`,
                minWidth: `${actionsWidth}px`,
              },
            }),
            setCellProps: () => ({
              className: centerActionsColumn ? 'dt-align-center' : undefined,
              style: {
                width: `${actionsWidth}px`,
                minWidth: `${actionsWidth}px`,
                whiteSpace: 'nowrap',
              },
            }),
          },
        });
      }

      return baseColumns;
    }, [
      columns,
      customActions,
      dataRes?.rows,
      handleDeleteClick,
      onDeleteData,
      onEditData,
      onViewData,
      indexColumn,
      t,
      actionsWidth,
      centerActionsColumn,
    ]);

    const customOptions: Partial<MUIDataTableOptions> = useMemo(() => {
      return {
        ...defaultOptions,
        ...tableState,
        ...options,
        count: dataRes.count,
        onTableInit: (_action: string, tableState: MUIDataTableState) => {
          onTableChange('init', tableState);
        },
        onTableChange: (action: string, tableState: MUIDataTableState) => {
          if (action === 'changePage' || action === 'changeRowsPerPage' || action === 'sort') {
            onTableChange(action, tableState);
          }
        },
      } as Partial<MUIDataTableOptions>;
    }, [defaultOptions, tableState, options, onTableChange, dataRes.count]);

    const tableTitle = useMemo(() => {
      if (!headerExtra) return title;
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            width: '100%',
            flexWrap: 'wrap',
          }}
        >
          <Box component="span">{title}</Box>
          <Box sx={{ ml: 'auto' }}>{headerExtra}</Box>
        </Box>
      );
    }, [title, headerExtra]);

    return (
      <Box sx={{ position: 'relative', ...(tableSx as object) }}>
        <MUIDataTable
          key={resetKey} // Force remount when resetKey changes
          title={tableTitle}
          data={dataRes.rows}
          columns={customColumns}
          options={customOptions}
        />

        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              opacity: 0.65,
              zIndex: 1,
            }}
          >
            <CircularProgress size={28} />
          </Box>
        )}
      </Box>
    );
  }
);

const CustomDataTable = memo(CustomDataTableComponent) as <T>(
  props: CustomDataTableProps<T>
) => React.JSX.Element;

export default CustomDataTable;
