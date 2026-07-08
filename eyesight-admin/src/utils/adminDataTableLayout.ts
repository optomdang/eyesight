import type { SxProps, Theme } from '@mui/material';

export type CellAlign = 'left' | 'center';

const alignClass = (align: CellAlign) => `dt-align-${align}`;

/** Style chung bảng danh sách admin — ghi đè mui-datatables (header sort, font không đều). */
export const adminListTableSx: SxProps<Theme> = {
  '& .MuiTable-root': { tableLayout: 'auto', width: '100%' },

  '& thead .MuiTableCell-head': {
    fontWeight: 700,
    fontSize: '0.875rem',
    lineHeight: 1.43,
    padding: '12px 10px',
    verticalAlign: 'middle',
  },

  '& thead .MuiTableCell-head .MuiButton-root': {
    fontWeight: '700 !important',
    fontSize: '0.875rem !important',
    lineHeight: '1.43 !important',
    letterSpacing: 'normal',
    textTransform: 'none',
    color: 'inherit',
    padding: 0,
    minWidth: 0,
    minHeight: 0,
  },

  '& tbody .MuiTableCell-body': {
    fontSize: '0.875rem',
    padding: '10px',
    verticalAlign: 'middle',
  },

  '& .MuiTableCell-paddingCheckbox': {
    width: 48,
    textAlign: 'center',
  },

  '& .MuiTableCell-head.dt-align-center, & .MuiTableCell-body.dt-align-center': {
    textAlign: 'center !important',
  },

  '& .MuiTableCell-head.dt-align-left, & .MuiTableCell-body.dt-align-left': {
    textAlign: 'left !important',
  },

  '& .MuiTableCell-head.dt-head-center': {
    textAlign: 'center !important',
  },

  '& .MuiTableCell-body.dt-body-left': {
    textAlign: 'left !important',
  },

  '& .MuiTableCell-head.dt-head-center .MuiButton-root': {
    justifyContent: 'center',
    width: '100%',
    margin: '0 auto',
  },

  '& .MuiTableCell-head.dt-align-center .MuiButton-root': {
    justifyContent: 'center',
    width: '100%',
    margin: '0 auto',
  },

  '& .MuiTableCell-head.dt-align-left .MuiButton-root': {
    justifyContent: 'flex-start',
    width: '100%',
  },
};

export const colLayout = (align: CellAlign, minWidth: number, priority = false) => ({
  setCellHeaderProps: () => ({
    className: alignClass(align),
    style: {
      minWidth,
      whiteSpace: 'nowrap' as const,
      ...(priority ? { width: '1%' } : {}),
    },
  }),
  setCellProps: () => ({
    className: alignClass(align),
    style: {
      minWidth,
      whiteSpace: 'nowrap' as const,
      ...(priority ? { width: '1%' } : {}),
    },
  }),
});

/** Tiêu đề căn giữa, nội dung dòng căn trái — dùng cho tên, email, v.v. */
export const colLayoutHeadCenterBodyLeft = (minWidth: number, priority = false) => ({
  setCellHeaderProps: () => ({
    className: 'dt-head-center',
    style: {
      minWidth,
      whiteSpace: 'nowrap' as const,
      ...(priority ? { width: '1%' } : {}),
    },
  }),
  setCellProps: () => ({
    className: 'dt-body-left',
    style: {
      minWidth,
      whiteSpace: 'nowrap' as const,
      ...(priority ? { width: '1%' } : {}),
    },
  }),
});
