import { createContext, useCallback, useState, useEffect } from 'react';
import { deleteData, getData, getDataTable, patchData, postData } from 'src/utils/request.ts';
import useSnackbar from '../UseSnackbar.ts';
import { SNACKBAR_SEVERITY } from 'src/utils/constant.ts';
import { MUIDataTableState } from 'mui-datatables';
import {
  DataTableContextState,
  DataTableProviderProps,
  FilterTable,
  PaginatedResponse,
} from 'src/types/core';
import { getErrorMessage } from 'src/utils/errorHandler';
import { useConfirm } from 'src/hooks/useConfirm';

const DataTableContext = createContext<DataTableContextState<any> | undefined>(undefined);

// Tạo provider component với generic type
const DataTableProvider = <T,>({ children, endpoint, defaultRowsPerPage = 10, filter: initialFilter }: DataTableProviderProps) => {
  const [dataRes, setDataRes] = useState<PaginatedResponse<T>>({
    count: 0,
    limit: 0,
    page: 0,
    rows: [],
    totalPages: 0,
  });
  const [filter, setFilter] = useState<FilterTable>(initialFilter ?? {});
  const [loading, setLoading] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const [tableState, setTableState] = useState<Partial<MUIDataTableState>>({
    page: 0,
    rowsPerPage: defaultRowsPerPage,
    sortOrder: undefined,
  });
  const { showSnackbar } = useSnackbar();
  const { confirm } = useConfirm();

  // Reset table state when endpoint changes (user navigates to different page)
  useEffect(() => {
    setTableState({
      page: 0,
      rowsPerPage: defaultRowsPerPage,
      sortOrder: undefined,
    });
    setFilter(initialFilter ?? {});
    setDataRes({ count: 0, limit: 0, page: 0, rows: [], totalPages: 0 });
  }, [endpoint]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hàm tạo query string
  const getQueryString = useCallback(
    (
      currentPage: number,
      currentLimit: number,
      currentSortOrder?: { name: string; direction: 'asc' | 'desc' },
      filterOverride?: FilterTable
    ) => {
      const params = new URLSearchParams();
      params.append('page', (currentPage + 1).toString());
      params.append('limit', currentLimit.toString());
      if (currentSortOrder && currentSortOrder.name && currentSortOrder.direction) {
        // Backend buildSortBy expects "field:ASC|DESC" (also accepts separate order for compat).
        params.append(
          'sortBy',
          `${currentSortOrder.name}:${currentSortOrder.direction.toUpperCase()}`
        );
      }
      // Thêm các tham số filter
      Object.entries(filterOverride ?? filter).forEach(([key, value]) => {
        if (value) {
          params.append(key, String(value));
        }
      });
      return params.toString();
    },
    [filter]
  );

  // Hàm fetch dữ liệu
  const fetchData = useCallback(
    async (
      currentPage?: number,
      currentLimit?: number,
      currentSortOrder?: { name: string; direction: 'asc' | 'desc' },
      filterOverride?: FilterTable
    ) => {
      setLoading(true);
      try {
        // Nếu không có tham số truyền vào, lấy mặc định từ tableState
        const page = currentPage !== undefined ? currentPage : (tableState.page ?? 0);
        const limit = currentLimit !== undefined ? currentLimit : (tableState.rowsPerPage ?? 10);
        const sortOrder = currentSortOrder !== undefined ? currentSortOrder : tableState.sortOrder;
        const query = getQueryString(page, limit, sortOrder, filterOverride);
        const response = await getDataTable<T>(`${endpoint}?${query}`); // Sử dụng endpoint động
        setDataRes(response);
      } catch (error) {
        console.error('Lỗi khi fetch dữ liệu:', error);
        // Keep previous rows on failure — clearing first caused empty "Không có dữ liệu" on sort errors.
      } finally {
        setLoading(false);
      }
    },
    [tableState.page, tableState.rowsPerPage, tableState.sortOrder, getQueryString, endpoint]
  );

  // Hàm khi nhấn "Search"
  const searchData = useCallback(
    async (nextFilter?: FilterTable) => {
      if (nextFilter) {
        setFilter(nextFilter);
      }
      await fetchData(0, tableState.rowsPerPage, tableState.sortOrder, nextFilter);
      setTableState((prevState) => ({
        ...prevState,
        page: 0,
      }));
    },
    [fetchData, tableState.rowsPerPage, tableState.sortOrder]
  );

  // Xử lý thay đổi bảng
  const onTableChange = useCallback(
    (action: string, tableState: MUIDataTableState) => {
      if (action === 'changePage' && tableState.page !== undefined) {
        void fetchData(tableState.page, tableState.rowsPerPage, tableState.sortOrder);
        setDataRes((prev) => ({ ...prev, page: tableState.page }));
      } else if (action === 'changeRowsPerPage' && tableState.rowsPerPage !== undefined) {
        const resetPage = 0;
        void fetchData(resetPage, tableState.rowsPerPage, tableState.sortOrder);
        setDataRes((prev) => ({ ...prev, page: resetPage, limit: tableState.rowsPerPage }));
      } else if (action === 'sort' && tableState.sortOrder) {
        void fetchData(tableState.page, tableState.rowsPerPage, tableState.sortOrder);
      } else if (action === 'init') {
        void fetchData(tableState.page, tableState.rowsPerPage, tableState.sortOrder);
      }
      setTableState({
        rowsPerPage: tableState.rowsPerPage,
        page: tableState.page,
        sortOrder: tableState.sortOrder,
      });
    },
    [fetchData]
  );

  const getRecordData = useCallback(
    async (id: number | string) => {
      setLoading(true);
      try {
        return await getData<T>(`${endpoint}/${id}`);
      } catch (err: any) {
        showSnackbar(getErrorMessage(err, 'Có lỗi xảy ra'), SNACKBAR_SEVERITY.ERROR);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, showSnackbar]
  );

  // Hàm tạo người dùng mới (Create)
  const createData = useCallback(
    async (createdData: T) => {
      setLoading(true);
      try {
        await postData(endpoint, createdData); // Gửi yêu cầu POST bằng postData
        showSnackbar('Cập nhật thành công', SNACKBAR_SEVERITY.SUCCESS);
      } catch (err: any) {
        showSnackbar(getErrorMessage(err, 'Có lỗi xảy ra'), SNACKBAR_SEVERITY.ERROR);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, showSnackbar]
  );

  const updateData = useCallback(
    async (id: string | number, updatedData: Partial<T>) => {
      setLoading(true);
      try {
        // Filter out metadata fields that backend validation doesn't allow
        const {
          id: _id,
          createdAt,
          updatedAt,
          createdBy,
          updatedBy,
          deletedAt,
          deleted,
          creator,
          updater,
          center,
          ...allowedData
        } = updatedData as T & Record<string, any>;

        await patchData(`${endpoint}/${id}`, allowedData); // Send only allowed fields
        showSnackbar('Cập nhật thành công', SNACKBAR_SEVERITY.SUCCESS);

        // Fetch lại dữ liệu sau khi cập nhật
      } catch (err: any) {
        showSnackbar(getErrorMessage(err, 'Cập nhật thất bại'), SNACKBAR_SEVERITY.ERROR);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, showSnackbar]
  );

  // Hàm xóa dữ liệu (Delete)
  const removeData = useCallback(
    async (id: number | string) => {
      setLoading(true);
      try {
        await deleteData(`${endpoint}/${id}`);
        showSnackbar('Xóa dữ liệu thành công', SNACKBAR_SEVERITY.SUCCESS);
      } catch (err) {
        showSnackbar(getErrorMessage(err, 'Xóa thất bại'), SNACKBAR_SEVERITY.ERROR);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, showSnackbar]
  );

  // Hàm xóa nhiều dữ liệu (Batch Delete)
  const removeBatchData = useCallback(
    async (ids: (number | string)[]) => {
      const confirmed = await confirm({
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa ${ids.length} bản ghi đã chọn?`,
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        confirmColor: 'error',
      });
      if (!confirmed) return;

      setLoading(true);
      try {
        await deleteData(endpoint, { ids });
        showSnackbar(`Đã xóa ${ids.length} bản ghi thành công`, SNACKBAR_SEVERITY.SUCCESS);
        setTableKey((k) => k + 1); // force remount → clear selection
        await fetchData();
      } catch (err) {
        showSnackbar(getErrorMessage(err, 'Xóa thất bại'), SNACKBAR_SEVERITY.ERROR);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [confirm, endpoint, fetchData, showSnackbar]
  );

  return (
    <DataTableContext
      value={{
        dataRes,
        tableState,
        tableKey,
        filter,
        setFilter,
        loading,
        searchData,
        fetchData,
        onTableChange,
        getRecordData,
        createData,
        updateData,
        removeData,
        removeBatchData,
        endpoint,
      }}
    >
      {children}
    </DataTableContext>
  );
};
export { DataTableProvider, DataTableContext };
