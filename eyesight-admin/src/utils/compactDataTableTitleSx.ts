import type { SxProps, Theme } from '@mui/material';
import { adminListTableSx } from './adminDataTableLayout';

/** Thu gọn khoảng trống phía trên tiêu đề bảng; căn tiêu đề thẳng lề trái với accordion Tìm kiếm. */
export const compactDataTableTitleSx: SxProps<Theme> = {
  ...adminListTableSx,
  '& .MuiToolbar-root': {
    minHeight: '40px !important',
    paddingTop: '2px !important',
    paddingBottom: '2px !important',
    paddingLeft: '16px !important',
    paddingRight: '16px !important',
  },
  '& .MuiTypography-h6': {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.25,
  },
};
