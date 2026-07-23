/**
 * CalibrationGate — wraps any route that requires a calibrated screen.
 * If the user hasn't calibrated yet, shows a full-page prompt instead of the
 * protected content.
 *
 * Hydrates from the server (same user + same device fingerprint) when
 * localStorage was cleared by the browser, so patients are not forced to
 * recalibrate every ~7 days on the same machine.
 *
 * @locked Gate logic tied to isCalibrated() — do not weaken/bypass without explicit request.
 * See .cursor/rules/screen-calibration-locked.mdc
 */
import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import MonitorIcon from '@mui/icons-material/Monitor';
import { useNavigate } from 'react-router-dom';
import {
  hydrateCalibrationFromServer,
  isCalibrated,
} from 'src/services/screenCalibration.service';
import ScreenCalibrationPage from 'src/features/portal/views/settings/ScreenCalibrationPage';

interface CalibrationGateProps {
  children: React.ReactNode;
}

const CalibrationGate: React.FC<CalibrationGateProps> = ({ children }) => {
  const [calibrated, setCalibrated] = useState(() => isCalibrated());
  const [checkingServer, setCheckingServer] = useState(() => !isCalibrated());
  const [showInline, setShowInline] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (calibrated) {
      setCheckingServer(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      const restored = await hydrateCalibrationFromServer();
      if (cancelled) return;
      if (restored) {
        setCalibrated(true);
      }
      setCheckingServer(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [calibrated]);

  if (calibrated) {
    return <>{children}</>;
  }

  if (checkingServer) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (showInline) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          pt: 6,
          px: 2,
        }}
      >
        <Paper elevation={2} sx={{ width: '100%', maxWidth: 640, p: 3, borderRadius: 3 }}>
          <ScreenCalibrationPage
            compact
            onCalibrated={() => setCalibrated(true)}
          />
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 520,
          width: '100%',
          p: 4,
          borderRadius: 3,
          textAlign: 'center',
        }}
      >
        <MonitorIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />

        <Typography variant="h5" fontWeight={700} gutterBottom>
          Cần hiệu chuẩn màn hình
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Để kích thước chữ trong bài kiểm tra và bài tập thị lực chính xác về mặt vật lý,
          bạn cần hiệu chuẩn màn hình <strong>một lần trên mỗi máy</strong> trước khi bắt đầu.
        </Typography>

        <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
          Hiệu chuẩn giúp hệ thống biết kích thước thực của 1mm trên màn hình bạn đang dùng.
          Nếu bỏ qua, kích thước optotype có thể sai lệch ảnh hưởng đến kết quả.
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
          <Button
            variant="contained"
            size="large"
            color="warning"
            startIcon={<MonitorIcon />}
            onClick={() => setShowInline(true)}
          >
            Hiệu chuẩn ngay tại đây
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/portal/settings/calibration')}
          >
            Vào trang Cài đặt để hiệu chuẩn
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default CalibrationGate;
