import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  TextField,
  Paper,
  Chip,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useTranslation } from 'src/hooks/useTranslation';
import { getExerciseEntry, normalizeExerciseType } from 'src/components/exercises/registry';
import { isVtQuestFamily } from 'src/components/exercises/vt/core/vtExerciseTypes';
import type { Exercise } from 'src/types/core';
import { ScreenInfo, getDefaultVisionLevels, calculateVisualSettings } from 'src/utils/visionUtils';
import { contrastVisionLevels } from 'src/utils/constant';
import VtQuestExercise from 'src/components/exercises/vt/portal/VtQuestExercise';
import { buildVtQuestSandboxAssignment } from 'src/components/exercises/vt/core/vtQuestSandbox';
import FarAcuityExercise from 'src/components/exercises/far-acuity/portal/FarAcuityExercise';
import { buildFarAcuitySandboxAssignment } from 'src/components/exercises/far-acuity/core/farAcuitySandbox';
import { getAcuityLevelInfo, type FarAcuityVisionType } from 'src/hooks/exercises/useFarAcuityEngine';
import {
  computeVtVisionSizing,
  resolveVtExerciseVision,
} from 'src/components/exercises/vt/core/vtVisionSizing';
import type { VtSettings } from 'src/types/core/vtQuest';
import type { ColorScheme } from 'src/types/core/visual-settings';
import {
  loadCalibration,
  getPreferredScreenInfo,
} from 'src/services/screenCalibration.service';

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  visionType: 'far' | 'near' | 'contrast';
  distance: number;
  onDistanceChange?: (newDistance: number) => void;
  colorScheme?: ColorScheme | null;
  eye?: 'left' | 'right' | 'both';
  vtSettings?: Partial<VtSettings> | null;
  duration?: number;
  inactivityThreshold?: number | null;
  /** Pre-select vision level (e.g. assignment override). */
  initialVisionLevel?: number;
}

function isVtQuestExercise(exercise: Exercise): boolean {
  return isVtQuestFamily(exercise.exerciseType);
}

const PreviewDialog: React.FC<PreviewDialogProps> = ({
  open,
  onClose,
  exercise,
  visionType,
  distance,
  onDistanceChange,
  colorScheme,
  eye = 'both',
  vtSettings,
  duration = 30,
  inactivityThreshold,
  initialVisionLevel,
}) => {
  const { t } = useTranslation();
  const [selectedLevel, setSelectedLevel] = useState<number>(initialVisionLevel ?? 10);

  const formatContrastScore = (score: string) => Number(score).toString();

  const formatContrastPercent = (percent: number) => `${percent.toFixed(2).replace(/\.?0+$/, '')}%`;

  const getContrastLevelLabel = (level: number) => {
    const contrastData = contrastVisionLevels.find((item) => item.level === level);

    if (!contrastData) {
      return `Cấp ${level}`;
    }

    return `Cấp ${level} - ${formatContrastScore(contrastData.score)} (${formatContrastPercent(contrastData.contrastPercent)})`;
  };

  const [screenSize, setScreenSize] = useState<number>(() => getPreferredScreenInfo().diagonalInch);
  const [screenResolution, setScreenResolution] = useState<{ width: number; height: number }>(() => {
    const info = getPreferredScreenInfo();
    return { width: info.screenWidth, height: info.screenHeight };
  });
  const [previewDistance, setPreviewDistance] = useState<number>(distance);

  // Re-sync to calibration whenever the dialog is opened
  useEffect(() => {
    if (open) {
      const info = getPreferredScreenInfo();
      setScreenSize(info.diagonalInch);
      setScreenResolution({ width: info.screenWidth, height: info.screenHeight });
    }
  }, [open]);

  useEffect(() => {
    setPreviewDistance(distance);
  }, [distance]);

  useEffect(() => {
    if (open) {
      setSelectedLevel(initialVisionLevel ?? 10);
    }
  }, [open, initialVisionLevel]);

  const handleClose = () => {
    if (onDistanceChange && previewDistance !== distance) {
      onDistanceChange(previewDistance);
    }
    onClose();
  };

  const vtQuestMode = exercise != null && isVtQuestExercise(exercise);
  const isFarAcuity =
    exercise != null &&
    normalizeExerciseType(exercise.exerciseType ?? exercise.code ?? '') === 'far-acuity';
  const playableSandboxMode = vtQuestMode || isFarAcuity;

  const getAvailableLevels = () => {
    const visionLevels = getDefaultVisionLevels();

    switch (visionType) {
      case 'far':
        return visionLevels.far.map((level, index) => ({
          value: index + 1,
          label: `Cấp ${index + 1} - ${level}`,
          level: index + 1,
        }));
      case 'near':
        return visionLevels.near.map((level, index) => ({
          value: index + 1,
          label: `Cấp ${index + 1} - ${level}`,
          level: index + 1,
        }));
      case 'contrast':
        return visionLevels.contrast.map((_level, index) => ({
          value: index + 1,
          label: getContrastLevelLabel(index + 1),
          level: index + 1,
        }));
      default:
        return [];
    }
  };

  const screenInfo: ScreenInfo = useMemo(
    () => ({
      screenWidth: screenResolution.width,
      screenHeight: screenResolution.height,
      diagonalInch: screenSize,
    }),
    [screenResolution, screenSize]
  );

  const visualSettings = useMemo(() => {
    if (!selectedLevel || selectedLevel < 1 || !previewDistance || previewDistance <= 0) {
      return {
        fontSize: 55,
        contrast: 100,
        scaleFactor: 1,
      };
    }

    const { fontSize, scaleFactor, contrast } = calculateVisualSettings({
      visionType,
      visionLevel: selectedLevel,
      distance: previewDistance,
      screenInfo,
    });

    return {
      fontSize,
      scaleFactor,
      contrast,
      visionType,
      ...(colorScheme &&
        colorScheme.preset !== 'whiteBlack' &&
        colorScheme.preset !== 'original' && {
          colorScheme: {
            preset: colorScheme.preset as 'redBlue' | 'redGreen' | 'custom',
            textColor: colorScheme.textColor,
            backgroundColor: colorScheme.backgroundColor,
          },
        }),
    };
  }, [selectedLevel, visionType, previewDistance, screenInfo, colorScheme]);

  const sandboxAssignment = useMemo(() => {
    if (!vtQuestMode || !exercise) return null;
    return buildVtQuestSandboxAssignment({
      visionType,
      visionLevel: selectedLevel,
      distance: previewDistance,
      eye,
      colorScheme: colorScheme ?? undefined,
      vtSettings,
      duration,
      inactivityThreshold,
      exerciseName: exercise.name,
      exerciseType: exercise.exerciseType,
    });
  }, [
    vtQuestMode,
    exercise,
    visionType,
    selectedLevel,
    previewDistance,
    eye,
    colorScheme,
    vtSettings,
    duration,
    inactivityThreshold,
  ]);

  const farAcuitySandboxAssignment = useMemo(() => {
    if (!isFarAcuity || !exercise) return null;
    return buildFarAcuitySandboxAssignment({
      visionLevel: selectedLevel,
      visionType,
      distance: previewDistance,
      eye,
      duration,
      exerciseName: exercise.name,
    });
  }, [isFarAcuity, exercise, selectedLevel, visionType, previewDistance, eye, duration]);

  const vtSizingPreview = useMemo(() => {
    if (!vtQuestMode || !sandboxAssignment) return null;
    const resolved = resolveVtExerciseVision({
      levelOverride: true,
      visionLevel: selectedLevel,
      visionType,
      eye,
    });
    if (!resolved) return null;
    try {
      return computeVtVisionSizing({
        screenInfo,
        distanceM: previewDistance,
        visionType: resolved.sizeVisionType,
        visionLevel: resolved.sizeVisionLevel,
        stimulusContrastPercent: resolved.stimulusContrastPercent,
      });
    } catch {
      return null;
    }
  }, [vtQuestMode, sandboxAssignment, selectedLevel, visionType, eye, screenInfo, previewDistance]);

  const sandboxKey = useMemo(
    () =>
      [
        isFarAcuity ? 'far-acuity' : vtQuestMode ? 'vt' : 'static',
        selectedLevel,
        previewDistance,
        visionType,
        eye,
        screenSize,
        screenResolution.width,
        screenResolution.height,
        JSON.stringify(vtSettings ?? {}),
        inactivityThreshold ?? 30,
        duration ?? 30,
        colorScheme?.preset,
        colorScheme?.textColor,
        colorScheme?.backgroundColor,
      ].join('|'),
    [
      isFarAcuity,
      vtQuestMode,
      selectedLevel,
      previewDistance,
      visionType,
      eye,
      screenSize,
      screenResolution,
      vtSettings,
      inactivityThreshold,
      duration,
      colorScheme,
    ]
  );

  if (!exercise) {
    return null;
  }

  const registryEntry = getExerciseEntry(exercise.exerciseType, exercise.code);
  const availableLevels = getAvailableLevels();
  const selectedContrastLevel =
    visionType === 'contrast'
      ? contrastVisionLevels.find((level) => level.level === selectedLevel)
      : null;
  const farAcuityPreviewVisionType: FarAcuityVisionType =
    visionType === 'near' ? 'near' : 'far';
  const acuityPreview = isFarAcuity
    ? getAcuityLevelInfo(farAcuityPreviewVisionType, selectedLevel)
    : null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullScreen
      PaperProps={{
        sx: {
          backgroundColor: vtQuestMode ? '#0a0520' : 'background.default',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: 1,
          borderColor: vtQuestMode ? 'rgba(255,255,255,0.1)' : 'divider',
          py: 2,
          px: 3,
          minHeight: 80,
          bgcolor: vtQuestMode ? 'rgba(0,0,0,0.5)' : undefined,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ color: vtQuestMode ? 'white' : undefined }}>
            {vtQuestMode
              ? '🚀 Chơi thử Phi hành gia thị giác'
              : isFarAcuity
                ? `${
                    visionType === 'near'
                      ? t('exercise.previewNear')
                      : visionType === 'contrast'
                        ? t('exercise.previewContrast')
                        : t('exercise.previewFar')
                  } — ${exercise.name}`
                : visionType === 'far'
                  ? t('exercise.previewFar')
                  : visionType === 'near'
                    ? t('exercise.previewNear')
                    : t('exercise.previewContrast')}
          </Typography>

          {playableSandboxMode && (
            <Chip
              size="small"
              label="Không lưu kết quả"
              sx={{ bgcolor: 'rgba(255,165,0,0.2)', color: '#FFD93D', fontWeight: 700 }}
            />
          )}

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel sx={{ color: vtQuestMode ? 'rgba(255,255,255,0.7)' : undefined }}>
              {vtQuestMode
                ? 'Mức thị lực mô phỏng'
                : visionType === 'contrast'
                  ? t('exercise.contrastLevel', 'Độ tương phản')
                  : t('exercise.visionLevel', 'Cấp độ')}
            </InputLabel>
            <Select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(Number(e.target.value))}
              label={
                vtQuestMode
                  ? 'Mức thị lực mô phỏng'
                  : visionType === 'contrast'
                    ? t('exercise.contrastLevel', 'Độ tương phản')
                    : t('exercise.visionLevel', 'Cấp độ')
              }
              sx={
                vtQuestMode
                  ? {
                      color: 'white',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
                    }
                  : undefined
              }
            >
              {availableLevels.map((level) => (
                <MenuItem key={level.value} value={level.value}>
                  {level.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ color: vtQuestMode ? 'rgba(255,255,255,0.7)' : undefined }}>
              Màn hình (inch)
            </InputLabel>
            <Select
              value={screenSize}
              onChange={(e) => setScreenSize(Number(e.target.value))}
              label="Màn hình (inch)"
              sx={
                vtQuestMode
                  ? {
                      color: 'white',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
                    }
                  : undefined
              }
            >
              {(() => {
                const cal = loadCalibration();
                const stdSizes = [13.3, 15.6, 21.5, 24, 27, 32];
                const sizes = cal?.diagonalInch && !stdSizes.includes(cal.diagonalInch)
                  ? [cal.diagonalInch, ...stdSizes]
                  : stdSizes;
                return sizes.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}&quot;
                    {cal?.diagonalInch === s && ' ✓'}
                  </MenuItem>
                ));
              })()}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ color: vtQuestMode ? 'rgba(255,255,255,0.7)' : undefined }}>
              Độ phân giải
            </InputLabel>
            <Select
              value={`${screenResolution.width}x${screenResolution.height}`}
              onChange={(e) => {
                const [width, height] = e.target.value.split('x').map(Number);
                setScreenResolution({ width, height });
              }}
              label="Độ phân giải"
              sx={
                vtQuestMode
                  ? {
                      color: 'white',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
                    }
                  : undefined
              }
            >
              {(() => {
                const cal = loadCalibration();
                const stdRes = ['1366x768', '1920x1080', '2560x1440', '3840x2160'];
                const calResKey = cal ? `${cal.nativeScreenWidth}x${cal.nativeScreenHeight}` : null;
                const resOptions = calResKey && !stdRes.includes(calResKey)
                  ? [calResKey, ...stdRes]
                  : stdRes;
                return resOptions.map((r) => {
                  const [w, h] = r.split('x');
                  return (
                    <MenuItem key={r} value={r}>
                      {w}×{h}
                      {calResKey === r && ' ✓'}
                    </MenuItem>
                  );
                });
              })()}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Khoảng cách (m)"
            type="number"
            value={previewDistance}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setPreviewDistance(isNaN(value) ? 1.0 : value);
            }}
            sx={{
              width: 120,
              ...(vtQuestMode && {
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                },
              }),
            }}
            inputProps={{
              min: 0.1,
              max: 10,
              step: 0.1,
              lang: 'en',
            }}
          />

          <Typography
            variant="body2"
            sx={{ color: vtQuestMode ? 'rgba(255,255,255,0.55)' : 'text.secondary', ml: 2 }}
          >
            {vtQuestMode && vtSizingPreview
              ? `Cỡ chữ ~${vtSizingPreview.letterHeightPx}px · TP ${vtSizingPreview.stimulusContrastPercent}%`
              : isFarAcuity && acuityPreview
                ? `${acuityPreview.score} · Độ tương phản thích ứng từ 100%`
                : `Font: ${visualSettings.fontSize}px${
                  visionType === 'contrast' && selectedContrastLevel
                    ? `, Tương phản: ${formatContrastScore(selectedContrastLevel.score)} (${formatContrastPercent(visualSettings.contrast)})`
                    : ''
                }`}
          </Typography>
        </Box>

        <IconButton
          edge="end"
          color="inherit"
          onClick={handleClose}
          aria-label="close"
          sx={{ alignSelf: 'flex-start', color: vtQuestMode ? 'white' : undefined }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {vtQuestMode && sandboxAssignment ? (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <VtQuestExercise
              key={sandboxKey}
              assignmentId={0}
              sessionId={0}
              screenParams={screenInfo}
              assignment={sandboxAssignment}
              sandboxMode
              unlockAllWorlds
              onSandboxExit={handleClose}
            />
          </Box>
        ) : isFarAcuity && farAcuitySandboxAssignment ? (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <FarAcuityExercise
              key={sandboxKey}
              assignmentId={0}
              sessionId={0}
              screenParams={screenInfo}
              assignment={farAcuitySandboxAssignment}
              sandboxMode
              onSandboxExit={handleClose}
            />
          </Box>
        ) : (
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 2,
              overflow: 'auto',
            }}
          >
            <Paper
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              {registryEntry ? (
                <registryEntry.PreviewComponent visualSettings={visualSettings} />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 320, p: 2 }}>
                  Chưa hỗ trợ xem trước cho loại bài tập &quot;
                  {exercise.exerciseType || exercise.code}&quot;.
                </Typography>
              )}
            </Paper>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PreviewDialog;
