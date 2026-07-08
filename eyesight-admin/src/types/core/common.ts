/**
 * COMMON TYPES
 * Shared utility types, form props, table types
 */

import { MUIDataTableColumnDef, MUIDataTableOptions, MUIDataTableState } from 'mui-datatables';
import React, { ReactNode } from 'react';

// ==================== SEVERITY ====================

export type Severity = {
  INFO: string;
  WARNING: string;
  ERROR: string;
  SUCCESS: string;
};

// ==================== SELECT OPTIONS ====================

export interface SelectOptions {
  label: string;
  value: string | number;
}

// ==================== FORM DIALOG ====================

export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  rowData?: number | string | null;
}

// ==================== TABLE STATE ====================

export interface TableState {
  page: number;
  rowsPerPage: number;
  sortOrder: { name?: string; direction?: 'asc' | 'desc' };
}

export interface FilterTable {
  [key: string]: string | number | boolean | undefined;
}

// ==================== DATA TABLE ====================

export interface CustomDataTableProps<T> {
  title?: ReactNode;
  /** Nội dung bổ sung cùng hàng tiêu đề, căn phải (vd. chip lọc nhanh). */
  headerExtra?: ReactNode;
  tableState: Partial<MUIDataTableState>;
  dataRes: {
    rows: T[];
    count: number;
    totalPages: number;
    limit: number;
    page: number;
    success?: boolean;
    message?: string;
  };
  columns: MUIDataTableColumnDef[];
  loading?: boolean;
  options?: Partial<MUIDataTableOptions>;
  onTableChange: (action: string, tableState: MUIDataTableState) => void;
  onEditData?: (rowData: T) => void;
  onDeleteData?: (rowData: T) => void | Promise<void>;
  onViewData?: (rowData: T) => void;
  onBatchDelete?: (ids: (string | number)[]) => void | Promise<void>;
  enableBatchDelete?: boolean;
  /** Callback nhận selectedIds để page render nút xóa batch ở vị trí tùy ý */
  onSelectionChange?: (ids: (string | number)[]) => void;
  customActions?: (rowData: T) => ReactNode;
  filterComponent?: () => ReactNode;
  resetKey?: string | number;
  /** Width of the Actions column in pixels. Defaults to 220. */
  actionsWidth?: number;
  /** Center-align STT column body cells */
  centerIndexColumn?: boolean;
  /** Center-align action buttons in the Actions column */
  centerActionsColumn?: boolean;
  /** Extra sx applied to the table wrapper (header/body alignment overrides) */
  tableSx?: SxProps<Theme>;
}

export interface DataTableContextState<T> {
  dataRes: {
    rows: T[];
    count: number;
    totalPages: number;
    limit: number;
    page: number;
    success?: boolean;
    message?: string;
  };
  filter: FilterTable;
  tableState: Partial<MUIDataTableState>;
  tableKey: number;
  setFilter: React.Dispatch<React.SetStateAction<FilterTable>>;
  loading: boolean;
  searchData: (nextFilter?: FilterTable) => void;
  fetchData: (
    currentPage?: number,
    currentLimit?: number,
    currentSortOrder?: { name: string; direction: 'asc' | 'desc' }
  ) => void;
  onTableChange: (action: string, tableState: MUIDataTableState) => void;
  createData: (createdData: T | Partial<T>) => Promise<void>;
  getRecordData: (id: string | number) => Promise<T>;
  updateData: (id: string | number, updatedData: Partial<T>) => Promise<void>;
  removeData: (deleteData?: string | number) => Promise<void>;
  removeBatchData: (ids: (string | number)[]) => Promise<void>;
  endpoint: string;
}

export interface DataTableProviderProps {
  children: React.ReactNode;
  endpoint: string;
}

// ==================== AUTH ====================

export interface RegisterType {
  title?: string;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

export interface LoginType {
  title?: string;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

export interface SignInType {
  title?: string;
}

// ==================== MENU ====================

export interface MenuItem {
  id: string;
  title: string;
  icon?: React.ElementType;
  href?: string;
  children?: MenuItem[];
  navlabel?: boolean;
  subheader?: string;
  disabled?: boolean;
  external?: boolean;
  chip?: string;
  chipColor?: string;
  permission?: string | string[]; // Single permission or array of permissions (OR logic)
}

export interface MenuSection {
  navlabel: boolean;
  subheader: string;
  items?: MenuItem[];
}

export type FeatureModule = 'exam' | 'exercise' | 'notification' | 'reports' | 'settings';

// ==================== SNACKBAR ====================

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export interface SnackbarContextState {
  showSnackbar: (
    message: string,
    severity?: 'success' | 'error' | 'warning' | 'info' | string
  ) => void;
  hideSnackbar: () => void;
}
