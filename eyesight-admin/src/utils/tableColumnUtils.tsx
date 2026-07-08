import { MUIDataTableColumnDef } from 'mui-datatables';
import { Typography, Chip } from '@mui/material';
import dayjs from 'dayjs';

/**
 * Create a sortable column with custom body render
 */
export function createSortableColumn(
  name: string,
  label: string,
  options?: Partial<MUIDataTableColumnDef['options']>
): MUIDataTableColumnDef {
  return {
    name,
    label,
    options: {
      filter: false,
      sort: true,
      ...options,
    },
  };
}

/**
 * Create a column for nested object field (e.g., user.name)
 */
export function createNestedColumn(
  name: string,
  label: string,
  fallback: string = 'N/A',
  options?: Partial<MUIDataTableColumnDef['options']>
): MUIDataTableColumnDef {
  return {
    name,
    label,
    options: {
      filter: false,
      sort: true,
      customBodyRender: (value) => <Typography variant="body2">{value || fallback}</Typography>,
      ...options,
    },
  };
}

/**
 * Create a column with custom render function
 */
export function createCustomColumn(
  name: string,
  label: string,
  renderFn: (value: any, tableMeta: any, updateValue: any) => React.ReactNode,
  options?: Partial<MUIDataTableColumnDef['options']>
): MUIDataTableColumnDef {
  return {
    name,
    label,
    options: {
      filter: false,
      sort: false,
      customBodyRender: renderFn,
      ...options,
    },
  };
}

/**
 * Create a column for boolean values with chips
 */
export function createBooleanColumn(
  name: string,
  label: string,
  trueLabel: string = 'Active',
  falseLabel: string = 'Inactive',
  options?: Partial<MUIDataTableColumnDef['options']>
): MUIDataTableColumnDef {
  return {
    name,
    label,
    options: {
      filter: true,
      sort: true,
      customBodyRender: (value: boolean) => (
        <Chip
          label={value ? trueLabel : falseLabel}
          color={value ? 'success' : 'default'}
          size="small"
        />
      ),
      ...options,
    },
  };
}

/**
 * Create a column for date values
 * @param name - Column name
 * @param label - Column label
 * @param format - Date format string (DD/MM/YYYY or DD/MM/YYYY HH:mm) or locale (vi-VN, en-US)
 * @param options - Additional column options
 */
export function createDateColumn(
  name: string,
  label: string,
  format: string = 'DD/MM/YYYY',
  options?: Partial<MUIDataTableColumnDef['options']>
): MUIDataTableColumnDef {
  return {
    name,
    label,
    options: {
      filter: false,
      sort: true,
      customBodyRender: (value: string | Date) => {
        if (!value) return '-';

        // Check if format is a dayjs format string (contains /, :, or Y/M/D/H/m/s)
        const isDayjsFormat = /[YMDHms/:]/.test(format);

        if (isDayjsFormat) {
          // Use dayjs for custom format
          return <Typography variant="body2">{dayjs(value).format(format)}</Typography>;
        } else {
          // Use toLocaleDateString for locale-based format
          const date = typeof value === 'string' ? new Date(value) : value;
          return <Typography variant="body2">{date.toLocaleDateString(format)}</Typography>;
        }
      },
      ...options,
    },
  };
}

/**
 * Create an actions column (typically last column)
 */
export function createActionsColumn(
  label: string = 'Thao tác',
  renderFn: (value: any, tableMeta: any) => React.ReactNode
): MUIDataTableColumnDef {
  return {
    name: 'actions',
    label,
    options: {
      filter: false,
      sort: false,
      customBodyRender: renderFn,
    },
  };
}

/**
 * Create an index column (STT)
 */
export function createIndexColumn(
  label: string = 'STT',
  page: number = 0,
  limit: number = 10
): MUIDataTableColumnDef {
  return {
    name: 'index',
    label,
    options: {
      filter: false,
      sort: false,
      customBodyRender: (_value, tableMeta) => {
        return <Typography variant="body2">{page * limit + tableMeta.rowIndex + 1}</Typography>;
      },
    },
  };
}
