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

interface StopTrainingDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirming?: boolean;
  container?: HTMLElement | null;
}

const StopTrainingDialog: React.FC<StopTrainingDialogProps> = ({
  open,
  onClose,
  onConfirm,
  confirming = false,
  container,
}) => {
  return (
    <Dialog
      open={open}
      onClose={confirming ? undefined : onClose}
      container={container ?? undefined}
      aria-labelledby="stop-training-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="stop-training-dialog-title">
        <Typography variant="h6" component="span">
          Dừng tập?
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>
          Phiên tập sẽ kết thúc ngay cả khi chưa hết thời gian:
        </Typography>
        <Box sx={{ mt: 2, ml: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • Kết quả hiện tại sẽ được lưu
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • Phiên này được tính là đã hoàn thành
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Bạn cần bắt đầu phiên mới để tập tiếp
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>
          Bạn có chắc chắn muốn dừng tập không?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="large" disabled={confirming} sx={{ minWidth: 100 }}>
          Tiếp tục
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="warning"
          size="large"
          disabled={confirming}
          sx={{ minWidth: 120 }}
        >
          {confirming ? 'Đang lưu…' : 'Dừng và lưu kết quả'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StopTrainingDialog;
