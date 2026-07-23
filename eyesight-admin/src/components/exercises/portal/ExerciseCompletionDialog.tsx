import React from 'react';
import { Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface ExerciseCompletionDialogProps {
  open: boolean;
  onClose: () => void;
  /** Render inside fullscreen container so dialog is visible in browser fullscreen */
  container?: HTMLElement | null;
  /**
   * Whether this lượt counted toward session progress (x/N).
   * null/undefined = unknown (generic success copy).
   * false = saved but &lt;80% assigned time.
   */
  slotCounted?: boolean | null;
}

/**
 * Completion dialog shown after exercise is successfully saved.
 */
const ExerciseCompletionDialog: React.FC<ExerciseCompletionDialogProps> = ({
  open,
  onClose,
  container,
  slotCounted = null,
}) => {
  const counted = slotCounted !== false;

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
      <DialogTitle>{counted ? 'Hoàn thành bài tập' : 'Đã lưu bài tập'}</DialogTitle>
      <DialogContent>
        {counted ? (
          <Typography>Bạn đã hoàn thành bài tập. Kết quả đã được lưu lại.</Typography>
        ) : (
          <Alert severity="warning" sx={{ mt: 0.5 }}>
            Kết quả đã được lưu, nhưng thời gian tập chưa đủ 80% thời gian giao nên{' '}
            <strong>chưa tính vào tiến độ phiên</strong> (ví dụ vẫn 0/2 hoặc 1/2). Hãy tập đủ thời
            gian trong lượt tiếp theo.
          </Alert>
        )}
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
