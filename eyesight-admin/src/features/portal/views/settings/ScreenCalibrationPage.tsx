/**
 * Screen calibration UI — Bước 1: thông tin màn hình, Bước 2: đo PPI (thẻ/thước).
 *
 * @locked Do not change calibration flow or PPI measurement UX without explicit user request.
 * See .cursor/rules/screen-calibration-locked.mdc
 */
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Slider,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import StraightenIcon from '@mui/icons-material/Straighten';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  CARD_HEIGHT_MM,
  CARD_WIDTH_MM,
  buildAndSaveCalibration,
  computePpiFromCard,
  computePpiFromRuler,
  loadCalibration,
  type ScreenCalibration,
} from 'src/services/screenCalibration.service';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';

// ─── Common screen presets ────────────────────────────────────────────────────

const COMMON_SIZES = [
  { label: '13.3" Laptop', diagonal: 13.3, w: 1920, h: 1080 },
  { label: '14" Laptop', diagonal: 14, w: 1920, h: 1080 },
  { label: '15.6" Laptop', diagonal: 15.6, w: 1920, h: 1080 },
  { label: '24" Monitor', diagonal: 24, w: 1920, h: 1080 },
  { label: '27" Monitor', diagonal: 27, w: 2560, h: 1440 },
];

// ─── Screen dimensions step ───────────────────────────────────────────────────

interface ScreenDimsProps {
  initialDiagonal?: number;
  initialWidth?: number;
  initialHeight?: number;
  onConfirmed: (diagonal: number, nativeW: number, nativeH: number) => void;
}

const ScreenDimsStep: React.FC<ScreenDimsProps> = ({
  initialDiagonal = 15.6,
  initialWidth,
  initialHeight,
  onConfirmed,
}) => {
  const [diagonal, setDiagonal] = useState(String(initialDiagonal));
  const [width, setWidth] = useState(() => {
    if (initialWidth) return String(initialWidth);
    const dpr = window.devicePixelRatio || 1;
    return String(Math.round(window.screen.width * dpr));
  });
  const [height, setHeight] = useState(() => {
    if (initialHeight) return String(initialHeight);
    const dpr = window.devicePixelRatio || 1;
    return String(Math.round(window.screen.height * dpr));
  });

  const diagNum = parseFloat(diagonal);
  const widthNum = parseInt(width, 10);
  const heightNum = parseInt(height, 10);
  const valid =
    diagNum >= 5 && diagNum <= 80 &&
    widthNum >= 640 && widthNum <= 8192 &&
    heightNum >= 480 && heightNum <= 4320;

  const handleAutoDetect = () => {
    const dpr = window.devicePixelRatio || 1;
    setWidth(String(Math.round(window.screen.width * dpr)));
    setHeight(String(Math.round(window.screen.height * dpr)));
  };

  const handlePreset = (p: (typeof COMMON_SIZES)[0]) => {
    setDiagonal(String(p.diagonal));
    setWidth(String(p.w));
    setHeight(String(p.h));
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Nhập kích thước và độ phân giải vật lý của màn hình. Thông tin này được dùng để tính toán
        kích thước trình bày bài kiểm tra (số ký tự mỗi hàng, v.v.).
      </Alert>

      {/* Quick presets */}
      <Typography variant="subtitle2" gutterBottom>
        Chọn nhanh:
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {COMMON_SIZES.map((p) => (
          <Chip
            key={p.label}
            label={p.label}
            variant="outlined"
            size="small"
            clickable
            onClick={() => handlePreset(p)}
          />
        ))}
      </Box>

      {/* Auto-detect resolution */}
      <Button
        variant="outlined"
        startIcon={<MyLocationIcon />}
        onClick={handleAutoDetect}
        size="small"
        sx={{ mb: 2 }}
      >
        Tự động phát hiện độ phân giải
      </Button>

      {/* Input fields */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label={
              <LabelWithHelp help="Ví dụ: 15.6 hoặc 27">Kích thước màn hình (inch)</LabelWithHelp>
            }
            type="number"
            value={diagonal}
            onChange={(e) => setDiagonal(e.target.value)}
            inputProps={{ step: 0.1, min: 5, max: 80 }}
            error={diagonal !== '' && (isNaN(diagNum) || diagNum < 5 || diagNum > 80)}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label="Độ phân giải ngang (px)"
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            inputProps={{ step: 1, min: 640, max: 8192 }}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label="Độ phân giải dọc (px)"
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            inputProps={{ step: 1, min: 480, max: 4320 }}
            size="small"
          />
        </Grid>
      </Grid>

      <Button
        variant="contained"
        disabled={!valid}
        onClick={() => onConfirmed(diagNum, widthNum, heightNum)}
        fullWidth
      >
        Xác nhận thông tin màn hình
      </Button>
    </Box>
  );
};

// ─── Credit-card calibration method ──────────────────────────────────────────

const CARD_ASPECT = CARD_WIDTH_MM / CARD_HEIGHT_MM; // ~1.586

interface CardCalibProps {
  diagonal: number;
  nativeW: number;
  nativeH: number;
  onDone: (cal: ScreenCalibration) => void;
}

const CardCalibMethod: React.FC<CardCalibProps> = ({ diagonal, nativeW, nativeH, onDone }) => {
  const [cardWidthPx, setCardWidthPx] = useState(250);
  const cardHeightPx = cardWidthPx / CARD_ASPECT;

  const handleConfirm = () => {
    const ppi = computePpiFromCard(cardWidthPx);
    const cal = buildAndSaveCalibration(ppi, 'card', nativeW, nativeH, diagonal);
    onDone(cal);
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Đặt thẻ ngân hàng (ATM/VISA/Master) lên màn hình. Kéo thanh trượt bên dưới cho đến khi
        hình chữ nhật trên màn hình <strong>khớp chính xác</strong> với thẻ thật của bạn.
      </Alert>

      {/* Card preview */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: '#f5f7fb',
          borderRadius: 2,
          py: 4,
          mb: 2,
          minHeight: 200,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: cardWidthPx,
            height: cardHeightPx,
            borderRadius: `${cardWidthPx * 0.04}px`,
            background: 'linear-gradient(135deg, #1a3a5c 0%, #2d6fa8 50%, #1a3a5c 100%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            px: `${cardWidthPx * 0.05}px`,
            py: `${cardHeightPx * 0.08}px`,
            color: 'white',
            userSelect: 'none',
            transition: 'width 0.08s, height 0.08s',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: cardWidthPx * 0.14,
              height: cardWidthPx * 0.1,
              borderRadius: '3px',
              bgcolor: '#f0c040',
              opacity: 0.9,
            }}
          />
          <Typography
            sx={{
              fontSize: cardWidthPx * 0.065,
              letterSpacing: '0.1em',
              fontFamily: 'monospace',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            •••• •••• •••• ••••
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Typography sx={{ fontSize: cardWidthPx * 0.055, opacity: 0.85, fontFamily: 'monospace' }}>
              CARD HOLDER
            </Typography>
            <Typography sx={{ fontSize: cardWidthPx * 0.055, opacity: 0.85, fontFamily: 'monospace' }}>
              12/28
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Slider */}
      <Box sx={{ px: 2, mb: 1 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Kích thước thẻ: {cardWidthPx}px rộng × {cardHeightPx.toFixed(0)}px cao &nbsp;
          <Typography component="span" variant="caption" color="text.disabled">
            (chuẩn {CARD_WIDTH_MM}×{CARD_HEIGHT_MM}mm)
          </Typography>
        </Typography>
        <Slider
          value={cardWidthPx}
          min={120}
          max={600}
          step={1}
          onChange={(_, v) => setCardWidthPx(v as number)}
        />
      </Box>

      <Button
        variant="contained"
        color="success"
        fullWidth
        startIcon={<CheckCircleOutlineIcon />}
        onClick={handleConfirm}
        sx={{ mt: 1 }}
      >
        Kích thước đã khớp — Lưu hiệu chuẩn
      </Button>
    </Box>
  );
};

// ─── Ruler calibration method ─────────────────────────────────────────────────

const RULER_BAR_PX = 400;

interface RulerCalibProps {
  diagonal: number;
  nativeW: number;
  nativeH: number;
  onDone: (cal: ScreenCalibration) => void;
}

const RulerCalibMethod: React.FC<RulerCalibProps> = ({ diagonal, nativeW, nativeH, onDone }) => {
  const [measuredMm, setMeasuredMm] = useState<string>('');
  const inputError =
    measuredMm !== '' && (isNaN(Number(measuredMm)) || Number(measuredMm) < 20 || Number(measuredMm) > 500);

  const handleConfirm = () => {
    const mm = Number(measuredMm);
    if (!mm || mm < 20 || mm > 500) return;
    const ppi = computePpiFromRuler(mm, RULER_BAR_PX);
    const cal = buildAndSaveCalibration(ppi, 'ruler', nativeW, nativeH, diagonal);
    onDone(cal);
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Dùng thước vật lý đặt thẳng trên màn hình, đo độ dài thực tế của thanh cam bên dưới, rồi
        nhập vào ô.
      </Alert>

      {/* Ruler bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: '#f5f7fb',
          borderRadius: 2,
          py: 4,
          mb: 3,
        }}
      >
        <Box sx={{ position: 'relative', width: RULER_BAR_PX }}>
          <Box
            sx={{
              height: 24,
              width: RULER_BAR_PX,
              background: 'linear-gradient(90deg, #e65c00, #f9d423)',
              borderRadius: 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, px: 0 }}>
            {Array.from({ length: 11 }, (_, i) => (
              <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ width: 1, height: i % 5 === 0 ? 10 : 6, bgcolor: 'text.disabled' }} />
                {i % 5 === 0 && (
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.25 }}>
                    {i * 10}%
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">◄ điểm đầu</Typography>
            <Typography variant="caption" color="text.secondary">điểm cuối ►</Typography>
          </Box>
        </Box>
      </Box>

      <TextField
        label={
          <LabelWithHelp help="Ví dụ: nếu thước đọc ~10.2cm thì nhập 102">
            Độ dài đo được trên thước (mm)
          </LabelWithHelp>
        }
        type="number"
        value={measuredMm}
        onChange={(e) => setMeasuredMm(e.target.value)}
        error={inputError}
        helperText={inputError ? 'Giá trị hợp lệ: 20–500mm' : ''}
        fullWidth
        inputProps={{ min: 20, max: 500, step: 0.5 }}
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        color="success"
        fullWidth
        startIcon={<CheckCircleOutlineIcon />}
        disabled={!measuredMm || inputError}
        onClick={handleConfirm}
      >
        Lưu hiệu chuẩn
      </Button>
    </Box>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

interface ScreenCalibrationPageProps {
  /** Called after successful calibration. */
  onCalibrated?: () => void;
  /** If true, shows a compact embedded view (no title card). */
  compact?: boolean;
}

const ScreenCalibrationPage: React.FC<ScreenCalibrationPageProps> = ({
  onCalibrated,
  compact = false,
}) => {
  const [tab, setTab] = useState(0);
  const [calibration, setCalibration] = useState<ScreenCalibration | null>(() =>
    loadCalibration()
  );

  // Track screen dims pending PPI calibration
  const [screenDims, setScreenDims] = useState<{
    diagonal: number;
    nativeW: number;
    nativeH: number;
  } | null>(() => {
    const cal = loadCalibration();
    if (cal?.nativeScreenWidth && cal?.diagonalInch) {
      return {
        diagonal: cal.diagonalInch,
        nativeW: cal.nativeScreenWidth,
        nativeH: cal.nativeScreenHeight,
      };
    }
    return null;
  });

  const handleDimsConfirmed = (diagonal: number, nativeW: number, nativeH: number) => {
    setScreenDims({ diagonal, nativeW, nativeH });
  };

  const handleDone = useCallback(
    (cal: ScreenCalibration) => {
      setCalibration(cal);
      onCalibrated?.();
    },
    [onCalibrated]
  );

  const handleRecalibrate = () => {
    setCalibration(null);
    // Keep screenDims so user doesn't re-enter them if only recalibrating PPI
  };

  const content = (
    <Box sx={{ maxWidth: 640, mx: 'auto', p: compact ? 0 : 3 }}>
      {!compact && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Hiệu chuẩn màn hình
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Để kích thước chữ trong bài kiểm tra và bài tập thị lực chính xác về mặt vật lý (đúng
            mm), bạn cần hoàn thành 2 bước: xác nhận thông tin màn hình và đo PPI thực tế.
          </Typography>
        </Box>
      )}

      {/* ── Calibration complete status ── */}
      {calibration ? (
        <>
          <Alert
            severity="success"
            icon={<CheckCircleOutlineIcon />}
            sx={{
              mb: 2,
              alignItems: 'center',
              '& .MuiAlert-action': {
                pt: 0,
                pl: 1,
                mr: 0,
                alignSelf: 'center',
                flexShrink: 0,
              },
            }}
            action={
              <Button
                variant="outlined"
                color="success"
                size="small"
                onClick={handleRecalibrate}
                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Hiệu chuẩn lại
              </Button>
            }
          >
            <strong>Đã hiệu chuẩn</strong> — PPI: {calibration.ppi.toFixed(1)} | Màn hình:{' '}
            {calibration.diagonalInch}" | Phân giải: {calibration.nativeScreenWidth}×
            {calibration.nativeScreenHeight} | Phương pháp:{' '}
            {calibration.method === 'card' ? 'Thẻ ngân hàng' : 'Thước vật lý'} | Ngày:{' '}
            {new Date(calibration.calibratedAt).toLocaleDateString('vi-VN')}
          </Alert>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Hiệu chuẩn đã được lưu trên trình duyệt này. Nếu bạn đổi màn hình hoặc thay đổi độ
            phóng to hệ điều hành, hãy hiệu chuẩn lại để đảm bảo độ chính xác.
          </Typography>
        </>
      ) : (
        <>
          {/* ── Step 1: Screen dimensions ── */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Bước 1 — Thông tin màn hình
            </Typography>
            {screenDims ? (
              <Alert
                severity="success"
                icon={<CheckCircleOutlineIcon />}
                action={
                  <Button color="inherit" size="small" onClick={() => setScreenDims(null)}>
                    Sửa
                  </Button>
                }
                sx={{ mb: 1 }}
              >
                {screenDims.diagonal}" — {screenDims.nativeW}×{screenDims.nativeH} px
              </Alert>
            ) : (
              <ScreenDimsStep
                onConfirmed={handleDimsConfirmed}
              />
            )}
          </Box>

          {/* ── Step 2: PPI calibration (only after dims confirmed) ── */}
          {screenDims !== null && (() => {
            const dims = screenDims;
            return (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Bước 2 — Hiệu chuẩn PPI (kích thước thực tế)
                </Typography>
                <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
                  Chưa đo PPI thực tế — kích thước optotype sẽ dùng ước tính, có thể lệch so với thực tế.
                </Alert>
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                  <Tab icon={<CreditCardIcon />} iconPosition="start" label="Thẻ ngân hàng" />
                  <Tab icon={<StraightenIcon />} iconPosition="start" label="Thước vật lý" />
                </Tabs>
                {tab === 0 && (
                  <CardCalibMethod
                    diagonal={dims.diagonal}
                    nativeW={dims.nativeW}
                    nativeH={dims.nativeH}
                    onDone={handleDone}
                  />
                )}
                {tab === 1 && (
                  <RulerCalibMethod
                    diagonal={dims.diagonal}
                    nativeW={dims.nativeW}
                    nativeH={dims.nativeH}
                    onDone={handleDone}
                  />
                )}
              </Box>
            );
          })()}
        </>
      )}
    </Box>
  );

  if (compact) return content;

  return (
    <Paper elevation={0} sx={{ minHeight: '100%', bgcolor: 'background.default', p: 0 }}>
      {content}
    </Paper>
  );
};

export default ScreenCalibrationPage;
