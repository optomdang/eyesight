import React from 'react';
import { Box, InputAdornment, Tooltip } from '@mui/material';
import { openZaloChat } from 'src/utils/zaloUtils';

const ZALO_BLUE = '#0068FF';

interface ZaloChatAdornmentProps {
  phone?: string | null;
  tooltip?: string;
}

export const ZaloChatAdornment: React.FC<ZaloChatAdornmentProps> = ({
  phone,
  tooltip = 'Mở Zalo (ưu tiên app đã đăng nhập)',
}) => {
  const canOpen = Boolean(phone?.trim());

  return (
    <InputAdornment position="end">
      <Tooltip title={canOpen ? tooltip : 'Chưa có số điện thoại'}>
        <span>
          <Box
            component="button"
            type="button"
            disabled={!canOpen}
            aria-label={tooltip}
            onClick={() => {
              if (phone) openZaloChat(phone);
            }}
            sx={{
              border: 'none',
              outline: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 56,
              height: 22,
              px: 1.25,
              borderRadius: '4px',
              bgcolor: ZALO_BLUE,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.75rem',
              lineHeight: 1,
              letterSpacing: '0.01em',
              fontFamily: 'Arial, Helvetica, sans-serif',
              cursor: canOpen ? 'pointer' : 'default',
              opacity: canOpen ? 1 : 0.45,
              transition: 'background-color 0.2s',
              '&:hover': canOpen ? { bgcolor: '#0058d9' } : undefined,
              '&:disabled': {
                bgcolor: ZALO_BLUE,
                color: '#fff',
              },
            }}
          >
            Nhắn Zalo
          </Box>
        </span>
      </Tooltip>
    </InputAdornment>
  );
};
