import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
} from '@mui/material';

interface ExitConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Render inside fullscreen container so dialog is visible in browser fullscreen */
  container?: HTMLElement | null;
}

const ExitConfirmationDialog: React.FC<ExitConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  container,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      container={container ?? undefined}
      aria-labelledby="exit-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="exit-dialog-title">
        <Typography variant="h6" component="span">
          Tạm dừng bài tập?
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>
          Bạn có thể tạm dừng và quay lại sau:
        </Typography>
        <Box sx={{ mt: 2, ml: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • Tiến độ và vị trí chơi được lưu lại
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • Lần sau tiếp tục đúng chỗ đang dừng
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Phiên tập chưa kết thúc
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>
          Muốn kết thúc hẳn phiên? Dùng nút <strong>Dừng tập</strong> trên thanh HUD.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="large" sx={{ minWidth: 100 }}>
          Tiếp tục
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          size="large"
          sx={{ minWidth: 100 }}
        >
          Tạm dừng và lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExitConfirmationDialog;
