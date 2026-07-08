import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { HelpTooltip, LabelWithHelp } from 'src/components/shared/HelpTooltip';
import { buildExerciseConfigSummary } from 'src/utils/exerciseConfigSummary';
import Grid from '@mui/material/Grid';
import { useTranslation } from 'src/hooks/useTranslation';
import type { ExerciseConfigFormData } from 'src/validations';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { shouldShowFieldError } from 'src/utils';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import type { ColorScheme } from 'src/types/core/visual-settings';
import {
  colorSchemeFromPreset,
  fetchColorSchemePresets,
  saveColorSchemePreset,
  type ColorPresetMap,
} from 'src/services/colorPreset.service';
import { ColorSchemePreview } from './ColorSchemePreview';
import ColorChannelInput from './ColorChannelInput';

type ConfigFieldsValues = Pick<
  ExerciseConfigFormData,
  | 'eye'
  | 'distance'
  | 'duration'
  | 'frequency'
  | 'executionCount'
  | 'inactivityThreshold'
  | 'colorScheme'
  | 'visionType'
  | 'difficultyBaselineSource'
>;

interface BasicConfigFieldsProps {
  values: ConfigFieldsValues;
  errors: any;
  touched: any;
  isSubmitted?: boolean;
  onFieldChange: (field: string, value: any) => void;
  readOnly?: boolean;
  /** Admin can calibrate anaglyph hex codes for presets (red-blue, red-green). */
  isAdmin?: boolean;
  exercises?: Array<{ id: number; name: string; code: string }>; // Available exercises
  /** Tên dạng bài tập, dùng trong tooltip tóm tắt cấu hình. */
  exerciseName?: string | null;
}

export const BasicConfigFields: React.FC<BasicConfigFieldsProps> = ({
  values,
  errors,
  touched,
  isSubmitted = false,
  onFieldChange,
  readOnly = false,
  isAdmin = false,
  exerciseName = null,
}) => {
  const { t } = useTranslation();
  const configSummary = useMemo(
    () =>
      buildExerciseConfigSummary({
        visionType: values.visionType,
        distance: values.distance,
        frequency: values.frequency,
        executionCount: values.executionCount,
        duration: values.duration,
        colorScheme: values.colorScheme,
        exerciseName,
        difficultyBaselineSource: values.difficultyBaselineSource,
      }),
    [
      values.visionType,
      values.distance,
      values.frequency,
      values.executionCount,
      values.duration,
      values.colorScheme,
      values.difficultyBaselineSource,
      exerciseName,
    ]
  );
  const { openSnackbar } = useSnackbar();
  const [presetMap, setPresetMap] = useState<ColorPresetMap | null>(null);
  const [savingPreset, setSavingPreset] = useState(false);

  useEffect(() => {
    void fetchColorSchemePresets().then(setPresetMap);
  }, []);

  const preset = values.colorScheme?.preset || 'original';
  const isOriginalPreset = preset === 'original';
  const isAnaglyphPreset = preset === 'redBlue' || preset === 'redGreen';
  const canEditHex = !isOriginalPreset && (isAdmin || preset === 'custom');
  const canSaveGlobalPreset =
    isAdmin && !readOnly && (preset === 'redBlue' || preset === 'redGreen' || preset === 'whiteBlack');

  const resolvedPreviewScheme = useMemo(
    () => values.colorScheme as ColorScheme | undefined,
    [values.colorScheme]
  );

  const showColorPreview = Boolean(
    !isOriginalPreset &&
      values.colorScheme &&
      (isAdmin || isAnaglyphPreset || preset === 'custom')
  );
  const channel1Label = isAnaglyphPreset
    ? t('config.anaglyphRed', 'Kênh đỏ')
    : t('config.textColor', 'Màu chữ');
  const channel2Label = isAnaglyphPreset
    ? preset === 'redGreen'
      ? t('config.anaglyphGreen', 'Kênh xanh lá')
      : t('config.anaglyphBlue', 'Kênh xanh dương')
    : t('config.backgroundColor', 'Màu nền');

  const updateChannel1 = (hex: string) => {
    onFieldChange('colorScheme', {
      ...values.colorScheme,
      preset,
      textColor: hex,
    });
  };

  const updateChannel2 = (hex: string) => {
    onFieldChange('colorScheme', {
      ...values.colorScheme,
      preset,
      backgroundColor: hex,
    });
  };

  const handleSaveGlobalPreset = useCallback(async () => {
    if (!canSaveGlobalPreset || !values.colorScheme) return;
    const p = values.colorScheme.preset as 'redBlue' | 'redGreen' | 'whiteBlack';
    setSavingPreset(true);
    try {
      const updated = await saveColorSchemePreset(p, {
        textColor: values.colorScheme.textColor || '#000000',
        backgroundColor: values.colorScheme.backgroundColor || '#FFFFFF',
      });
      setPresetMap(updated);
      openSnackbar(
        `Đã lưu màu cho preset "${p}" — mọi cấu hình chọn preset này sẽ dùng mã màu này.`,
        SNACKBAR_SEVERITY.SUCCESS
      );
    } catch {
      openSnackbar('Không lưu được màu preset. Thử lại sau.', SNACKBAR_SEVERITY.ERROR);
    } finally {
      setSavingPreset(false);
    }
  }, [canSaveGlobalPreset, values.colorScheme, openSnackbar]);

  const handleVisionTypeChange = (newVisionType: string) => {
    const prevVisionType = values.visionType;
    onFieldChange('visionType', newVisionType);
    if (newVisionType === 'stereopsis') {
      // Stereopsis luôn tập cả 2 mắt
      onFieldChange('eye', 'both');
    } else if (prevVisionType === 'stereopsis') {
      // Rời khỏi stereopsis (eye đang bị ép 'both') → về default per-eye
      onFieldChange('eye', 'left');
    }
    // Các trường hợp khác: giữ nguyên eye (cho phép chọn 'both' thủ công cho far/near/contrast)
  };

  return (
    <Box>
      {configSummary && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {t('config.summaryTitle', 'Tóm tắt chế độ tập luyện')}
          </Typography>
          <HelpTooltip title={configSummary} placement="right" />
        </Box>
      )}
      <Grid container spacing={2}>
        {/* Vision Type - moved to first position as it's important config info */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('config.visionType', 'Loại thị lực')}</InputLabel>
            <CustomSelect
              fullWidth
              label={t('config.visionType', 'Loại thị lực')}
              value={values.visionType || 'far'}
              onChange={(e: any) => handleVisionTypeChange(e.target.value)}
              disabled={readOnly}
              size="small"
            >
              <MenuItem value="far">Thị lực xa (Far Vision)</MenuItem>
              <MenuItem value="near">Thị lực gần (Near Vision)</MenuItem>
              <MenuItem value="contrast">Độ tương phản (Contrast)</MenuItem>
              <MenuItem value="stereopsis">Thị giác lập thể (Stereopsis)</MenuItem>
            </CustomSelect>
          </FormControl>
        </Grid>
        {/* Eye Selection */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('config.eye')}</InputLabel>
            <CustomSelect
              value={values.visionType === 'stereopsis' ? 'both' : values.eye || 'left'}
              onChange={(e: any) => onFieldChange('eye', e.target.value)}
              error={shouldShowFieldError(errors.eye, touched.eye, isSubmitted)}
              disabled={readOnly || values.visionType === 'stereopsis'}
              label={t('config.eye')}
            >
              {values.visionType === 'stereopsis'
                ? [
                    <MenuItem key="both" value="both">
                      {t('config.eyes.both')}
                    </MenuItem>,
                  ]
                : [
                    <MenuItem key="right" value="right">
                      {t('config.eyes.right')}
                    </MenuItem>,
                    <MenuItem key="left" value="left">
                      {t('config.eyes.left')}
                    </MenuItem>,
                    <MenuItem key="both" value="both">
                      {t('config.eyes.both')}
                    </MenuItem>,
                  ]}
            </CustomSelect>
            {shouldShowFieldError(errors.eye, touched.eye, isSubmitted) && (
              <FormHelperText error>{errors.eye?.message || errors.eye}</FormHelperText>
            )}
          </FormControl>
        </Grid>
        {/* Distance */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <CustomTextField
            fullWidth
            type="number"
            label={t('config.distance') + ' (m)'}
            value={values.distance ?? ''}
            onChange={(e: any) => {
              const val = e.target.value;
              onFieldChange('distance', val === '' ? null : Number(val));
            }}
            error={shouldShowFieldError(errors.distance, touched.distance, isSubmitted)}
            helperText={
              shouldShowFieldError(errors.distance, touched.distance, isSubmitted)
                ? errors.distance?.message || errors.distance
                : ''
            }
            disabled={readOnly}
            size="small"
            inputProps={{ min: 0.1, max: 10, step: 0.1 }}
          />
        </Grid>
        {/* Duration */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <CustomTextField
            fullWidth
            type="number"
            label={t('config.duration') + ' (phút)'}
            value={values.duration ?? ''}
            onChange={(e: any) => {
              const val = e.target.value;
              onFieldChange('duration', val === '' ? null : Number(val));
            }}
            error={shouldShowFieldError(errors.duration, touched.duration, isSubmitted)}
            helperText={
              shouldShowFieldError(errors.duration, touched.duration, isSubmitted)
                ? errors.duration?.message || errors.duration
                : ''
            }
            disabled={readOnly}
            size="small"
            inputProps={{ min: 0.5, max: 180, step: 0.5 }}
          />
        </Grid>{' '}
        {/* Frequency */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('config.frequency')}</InputLabel>
            <CustomSelect
              value={values.frequency || 'daily'}
              onChange={(e: any) => onFieldChange('frequency', e.target.value)}
              error={shouldShowFieldError(errors.frequency, touched.frequency, isSubmitted)}
              disabled={readOnly}
              label={t('config.frequency')}
            >
              <MenuItem value="daily">{t('config.frequencies.daily')}</MenuItem>
              <MenuItem value="weekly">{t('config.frequencies.weekly')}</MenuItem>
              <MenuItem value="monthly">{t('config.frequencies.monthly')}</MenuItem>
              <MenuItem value="quarterly">{t('config.frequencies.quarterly')}</MenuItem>
              <MenuItem value="yearly">{t('config.frequencies.yearly')}</MenuItem>
            </CustomSelect>
            {shouldShowFieldError(errors.frequency, touched.frequency, isSubmitted) && (
              <FormHelperText error>{errors.frequency?.message || errors.frequency}</FormHelperText>
            )}
          </FormControl>
        </Grid>
        {/* Sessions Count */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <CustomTextField
            fullWidth
            type="number"
            label={t('config.executionCount')} // Đổi từ sessionsCount thành executionCount
            value={values.executionCount ?? ''}
            onChange={(e: any) => {
              const val = e.target.value;
              onFieldChange('executionCount', val === '' ? null : Number(val));
            }}
            error={shouldShowFieldError(errors.executionCount, touched.executionCount, isSubmitted)}
            helperText={
              shouldShowFieldError(errors.executionCount, touched.executionCount, isSubmitted)
                ? errors.executionCount?.message || errors.executionCount
                : ''
            }
            disabled={readOnly}
            size="small"
            inputProps={{ min: 1, max: 10 }}
          />
        </Grid>
        {/* Inactivity Threshold */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <CustomTextField
            fullWidth
            type="number"
            label={
              <LabelWithHelp
                help="Ghi nhận bỏ tương tác khi không có thao tác (mặc định: 30). VT Quest: hết giờ không trả lời sẽ đổi câu hỏi dễ hơn."
              >
                {t('config.inactivityThreshold', 'Ngưỡng bỏ tương tác (giây)')}
              </LabelWithHelp>
            }
            value={values.inactivityThreshold ?? 30}
            onChange={(e: any) => {
              const val = e.target.value;
              onFieldChange('inactivityThreshold', val === '' ? null : Number(val));
            }}
            error={shouldShowFieldError(errors.inactivityThreshold, touched.inactivityThreshold, isSubmitted)}
            helperText={
              shouldShowFieldError(errors.inactivityThreshold, touched.inactivityThreshold, isSubmitted)
                ? errors.inactivityThreshold?.message || errors.inactivityThreshold
                : ''
            }
            disabled={readOnly}
            size="small"
            inputProps={{ min: 5, max: 300, step: 1 }}
          />
        </Grid>
        {/* Visual Settings (without header) */}
        <Grid size={12} sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            {/* Font Size */}
            {/* Color Scheme Preset - move to next row */}
          </Grid>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>
                  <LabelWithHelp
                    help={t(
                      'config.colorPresetOriginalHelp',
                      'Giữ nguyên bảng màu gốc của game — không áp dụng lớp phủ màu tùy chỉnh.'
                    )}
                  >
                    {t('config.colorPreset', 'Bảng màu')}
                  </LabelWithHelp>
                </InputLabel>
                <CustomSelect
                  fullWidth
                  label={t('config.colorPreset', 'Bảng màu')}
                  value={values.colorScheme?.preset || 'original'}
                  onChange={(e: any) => {
                    const nextPreset = e.target.value as ColorScheme['preset'];
                    if (nextPreset === 'custom') {
                      onFieldChange('colorScheme', {
                        preset: 'custom',
                        textColor: values.colorScheme?.textColor || '#000000',
                        backgroundColor: values.colorScheme?.backgroundColor || '#FFFFFF',
                      });
                    } else {
                      onFieldChange(
                        'colorScheme',
                        colorSchemeFromPreset(nextPreset, presetMap)
                      );
                    }
                  }}
                  disabled={readOnly}
                  size="small"
                >
                  <MenuItem value="original">{t('config.colorPresetOriginal', 'Nguyên bản')}</MenuItem>
                  <MenuItem value="whiteBlack">Trắng-Đen</MenuItem>
                  <MenuItem value="redBlue">Đỏ-Xanh dương</MenuItem>
                  <MenuItem value="redGreen">Đỏ-Xanh lá</MenuItem>
                  <MenuItem value="custom">Tùy chỉnh</MenuItem>
                </CustomSelect>
              </FormControl>
            </Grid>
          </Grid>

          {showColorPreview && (
            <Box sx={{ mt: 2 }}>
              {isAdmin && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Xem trước màu kính lọc
                  </Typography>
                  <HelpTooltip title="Chỉnh màu bên dưới — xem trước chữ A/B phía trên để kiểm tra kính lọc. Mỗi kênh chỉ hiện qua đúng loại kính." />
                </Box>
              )}
              <ColorSchemePreview colorScheme={resolvedPreviewScheme} />
            </Box>
          )}

          {canEditHex && (
            <Grid container spacing={2} sx={{ mt: 2 }} alignItems="flex-end">
              <Grid size={{ xs: 12, sm: canSaveGlobalPreset ? 5 : 6 }}>
                <ColorChannelInput
                  label={channel1Label}
                  value={values.colorScheme?.textColor || '#000000'}
                  onChange={updateChannel1}
                  disabled={readOnly}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: canSaveGlobalPreset ? 5 : 6 }}>
                <ColorChannelInput
                  label={channel2Label}
                  value={values.colorScheme?.backgroundColor || '#FFFFFF'}
                  onChange={updateChannel2}
                  disabled={readOnly}
                />
              </Grid>
              {canSaveGlobalPreset && (
                <Grid size={{ xs: 12, sm: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    fullWidth
                    disabled={savingPreset}
                    startIcon={savingPreset ? <CircularProgress size={14} /> : <SaveIcon />}
                    onClick={() => void handleSaveGlobalPreset()}
                    sx={{ mb: '2px', minHeight: 40 }}
                  >
                    Lưu màu
                  </Button>
                </Grid>
              )}
              {shouldShowFieldError(errors.colorScheme, touched.colorScheme, isSubmitted) && (
                <Grid size={12}>
                  <Typography variant="caption" color="error">
                    {errors.colorScheme?.message || String(errors.colorScheme)}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};
