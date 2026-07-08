import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface ExerciseEndConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Render inside fullscreen container so dialog is visible in browser fullscreen */
  container?: HTMLElement | null;
}

/**
 * Confirmation dialog when user clicks "Kết thúc" button
 */
const ExerciseEndConfirmDialog: React.FC<ExerciseEndConfirmDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  container,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
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
      <DialogTitle>Kết thúc bài tập</DialogTitle>
      <DialogContent>
        <Typography>
          Bạn có chắc chắn muốn kết thúc bài tập? Tiến trình sẽ được lưu lại.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Hủy</Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          Kết thúc
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExerciseEndConfirmDialog;
