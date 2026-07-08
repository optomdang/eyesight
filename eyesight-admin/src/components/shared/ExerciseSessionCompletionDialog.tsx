/**
 * Session Completion Dialog Component
 * Displays session completion statistics and actions
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import { IconCheck, IconTrophy, IconClock, IconTarget, IconHistory } from '@tabler/icons-react';
// Session completion data interface
interface SessionCompletionData {
  session: {
    executionsCompleted: number;
    validExecutions: number;
    requiredExecutions: number;
    validityPercentage: number;
    totalScore: number;
    averageScore: number;
    bestScore: number;
  };
  validation: {
    isValid: boolean;
    reason?: string;
  };
  progress: {
    executionsCompleted: number;
    validExecutions: number;
    requiredExecutions: number;
    validityPercentage: number;
    isCompleted: boolean;
  };
}

interface SessionCompletionDialogProps {
  open: boolean;
  onClose: () => void;
  onViewHistory: () => void;
  data: SessionCompletionData | null;
}

const SessionCompletionDialog: React.FC<SessionCompletionDialogProps> = ({
  open,
  onClose,
  onViewHistory,
  data,
}) => {
  if (!data) return null;

  const { session, progress } = data;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)',
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
          <IconCheck size={32} color="#4caf50" />
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
            Phiên luyện tập hoàn thành!
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 4, py: 2 }}>
        {/* Main Progress Summary */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
            {progress.validityPercentage}%
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Tỷ lệ thực hiện hợp lệ
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress.validityPercentage}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: 'success.light',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'success.main',
              },
            }}
          />
        </Box>

        {/* Statistics Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                border: '1px solid #ff9800',
              }}
            >
              <IconTrophy size={24} color="#ff9800" style={{ marginBottom: 8 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                {session.bestScore}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Điểm cao nhất
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                border: '1px solid #2196f3',
              }}
            >
              <IconClock size={24} color="#2196f3" style={{ marginBottom: 8 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                {session.executionsCompleted}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Lần thực hiện
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
                border: '1px solid #4caf50',
              }}
            >
              <IconTarget size={24} color="#4caf50" style={{ marginBottom: 8 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {session.validExecutions}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Lần hợp lệ
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                border: '1px solid #9c27b0',
              }}
            >
              <IconCheck size={24} color="#9c27b0" style={{ marginBottom: 8 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                {Math.round(session.averageScore)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Điểm trung bình
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Completion Status */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} sx={{ mb: 2 }}>
            <Chip
              label="Phiên hoàn thành"
              color="success"
              sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}
            />
            <Chip
              label={`${progress.executionsCompleted}/${progress.requiredExecutions} lần`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
            Chúc mừng! Bạn đã hoàn thành tất cả {progress.requiredExecutions} lần thực hiện với tỷ
            lệ hợp lệ {progress.validityPercentage}%.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 3, gap: 2 }}>
        <Button variant="outlined" onClick={onClose} sx={{ minWidth: 120 }}>
          Đóng
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<IconHistory size={20} />}
          onClick={onViewHistory}
          sx={{ minWidth: 140 }}
        >
          Xem lịch sử
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionCompletionDialog;
