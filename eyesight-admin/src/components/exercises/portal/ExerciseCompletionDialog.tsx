import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface ExerciseCompletionDialogProps {
  open: boolean;
  onClose: () => void;
  /** Render inside fullscreen container so dialog is visible in browser fullscreen */
  container?: HTMLElement | null;
}

/**
 * Simple completion dialog shown after exercise is completed
 */
const ExerciseCompletionDialog: React.FC<ExerciseCompletionDialogProps> = ({
  open,
  onClose,
  container,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      container={container ?? undefined}
      PaperProps={{
        style: {
          zIndex: 10000,
        },
      }}
      style={{
        zIndex: 10000,
      }}
    >
      <DialogTitle>Hoàn thành bài tập</DialogTitle>
      <DialogContent>
        <Typography>Bạn đã hoàn thành bài tập. Kết quả đã được lưu lại.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Về danh sách bài tập
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExerciseCompletionDialog;
