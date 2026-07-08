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

interface EndExerciseDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const EndExerciseDialog: React.FC<EndExerciseDialogProps> = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="end-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="end-dialog-title">
        <Typography variant="h6" component="span">
          Xác nhận kết thúc bài tập
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>
          Bạn muốn kết thúc bài tập hiện tại?
        </Typography>
        <Box sx={{ mt: 2, ml: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • Tiến độ hiện tại sẽ được lưu tự động
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • Bạn sẽ được chuyển về danh sách phiên luyện tập
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Bài tập sẽ không bị mất
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>
          Bạn có chắc chắn muốn kết thúc không?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="large" sx={{ minWidth: 100 }}>
          Tiếp tục
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          size="large"
          sx={{ minWidth: 100 }}
        >
          Kết thúc và lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EndExerciseDialog;
