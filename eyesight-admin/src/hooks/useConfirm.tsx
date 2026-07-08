import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  alpha,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

const getIconConfig = (color: ConfirmOptions['confirmColor']) => {
  switch (color) {
    case 'error':
      return { Icon: DeleteOutlineRoundedIcon, colorKey: 'error' as const };
    case 'warning':
      return { Icon: WarningAmberRoundedIcon, colorKey: 'warning' as const };
    default:
      return { Icon: HelpOutlineRoundedIcon, colorKey: 'primary' as const };
  }
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve?: (value: boolean) => void;
  }>({ open: false, options: { message: '' } });

  const confirm = (options: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
      setConfirmState({
        open: true,
        options: {
          title: 'Xác nhận',
          confirmText: 'Xác nhận',
          cancelText: 'Hủy',
          confirmColor: 'primary',
          ...options,
        },
        resolve,
      });
    });

  const handleClose = () => {
    confirmState.resolve?.(false);
    setConfirmState((prev) => ({ ...prev, open: false }));
  };

  const handleConfirm = () => {
    confirmState.resolve?.(true);
    setConfirmState((prev) => ({ ...prev, open: false }));
  };

  const { Icon, colorKey } = getIconConfig(confirmState.options.confirmColor);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog
        open={confirmState.open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogContent sx={{ pt: 2.5, pb: 1, px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box
              sx={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: (theme) => alpha(theme.palette[colorKey].main, 0.12),
                mt: 0.25,
              }}
            >
              <Icon sx={{ fontSize: 18, color: `${colorKey}.main` }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {confirmState.options.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {confirmState.options.message}
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
          <Button onClick={handleClose} variant="outlined" color="inherit" size="small">
            {confirmState.options.cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color={confirmState.options.confirmColor}
            size="small"
          >
            {confirmState.options.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmContextType => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
  return context;
};
