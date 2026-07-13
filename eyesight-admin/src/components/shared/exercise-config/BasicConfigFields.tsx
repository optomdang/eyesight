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
  Slider,
  Checkbox,
  FormControlLabel,
  Divider,
  Alert,
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
import type { ColorScheme, DichopticConfig } from 'src/types/core/visual-settings';
import {
  colorSchemeFromPreset,
  fetchColorSchemePresets,
  saveColorSchemePreset,
  type ColorPresetMap,
} from 'src/services/colorPreset.service';
import { ColorSchemePreview } from './ColorSchemePreview';
import ColorChannelInput from './ColorChannelInput';
import { getDichopticBalanceConfigWarnings } from 'src/utils/dichopticCapabilities';

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
  | 'dichoptic'
>;

interface BasicConfigFieldsProps {
  values: ConfigFieldsValues;
  errors: any;
  touched: any;
  isSubmitted?: boolean;
  onFieldChange: (field: string, value: any) => void;
  readOnly?: boolean;
  /** Doctor: lock template fields (vision, distance, frequency, inactivity, color preset). */
  lockTemplateFields?: boolean;
  /** Admin can calibrate anaglyph hex codes for presets (red-blue, red-green). */
  isAdmin?: boolean;
  exercises?: Array<{ id: number; name: string; code: string }>; // Available exercises
  /** Tên dạng bài tập, dùng trong tooltip tóm tắt cấu hình. */
  exerciseName?: string | null;
  /** Loại bài tập — dùng cảnh báo dichoptic balance. */
  exerciseType?: string | null;
}

export const BasicConfigFields: React.FC<BasicConfigFieldsProps> = ({
  values,
  errors,
  touched,
  isSubmitted = false,
  onFieldChange,
  readOnly = false,
  lockTemplateFields = false,
  isAdmin = false,
  exerciseName = null,
  exerciseType = null,
}) => {
  const { t } = useTranslation();
  const templateLocked = readOnly || lockTemplateFields;
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
      (isAdmin || isAnaglyphPreset || preset === 'custom' || preset === 'whiteBlack')
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
              disabled={templateLocked}
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
            disabled={templateLocked}
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
            disabled={templateLocked || readOnly}
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
              disabled={templateLocked}
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
            disabled={templateLocked}
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
                  disabled={templateLocked}
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

          {/* Dichoptic Balance — only relevant when an anaglyph preset is active */}
          {isAnaglyphPreset && (
            <DichopticConfigSection
              dichoptic={values.dichoptic ?? null}
              onChange={(val) => onFieldChange('dichoptic', val)}
              readOnly={readOnly}
              exerciseType={exerciseType}
              eye={values.eye}
              colorScheme={values.colorScheme as ColorScheme | null}
            />
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

// ─── Dichoptic Config Section ────────────────────────────────────────────────

interface DichopticConfigSectionProps {
  dichoptic: DichopticConfig | null;
  onChange: (val: DichopticConfig | null) => void;
  readOnly?: boolean;
  exerciseType?: string | null;
  eye?: string | null;
  colorScheme?: ColorScheme | null;
}

const DichopticConfigSection: React.FC<DichopticConfigSectionProps> = ({
  dichoptic,
  onChange,
  readOnly = false,
  exerciseType = null,
  eye = null,
  colorScheme = null,
}) => {
  const mode = dichoptic?.mode ?? 'off';
  const redEye = dichoptic?.mapping?.redEye ?? 'left';
  const fellowContrast = dichoptic?.balance?.fellowContrastPercent ?? 50;
  const amblyopicContrast = dichoptic?.balance?.amblyopicContrastPercent ?? 100;
  const fellowContent = dichoptic?.balance?.fellowContent ?? 'none';
  const autoEnabled = dichoptic?.balance?.autoBalance?.enabled ?? false;
  const stepPercent = dichoptic?.balance?.autoBalance?.stepPercent ?? 5;
  const maxFellow = dichoptic?.balance?.autoBalance?.maxFellowPercent ?? 100;
  const threshold = dichoptic?.balance?.autoBalance?.accuracyThreshold ?? 0.75;

  const balanceWarnings = useMemo(
    () =>
      getDichopticBalanceConfigWarnings({
        mode,
        eye,
        exerciseType,
        colorScheme,
      }),
    [mode, eye, exerciseType, colorScheme]
  );

  const updateMode = (newMode: DichopticConfig['mode']) => {
    if (newMode === 'off') {
      onChange({ mode: 'off' });
      return;
    }
    const base: DichopticConfig = {
      mode: newMode,
      mapping: dichoptic?.mapping ?? { redEye: 'left' },
    };
    if (newMode === 'balance') {
      base.balance = dichoptic?.balance ?? {
        amblyopicContrastPercent: 100,
        fellowContrastPercent: 50,
        fellowContent: 'none',
      };
    }
    onChange(base);
  };

  const patchMapping = (patch: Partial<NonNullable<DichopticConfig['mapping']>>) => {
    onChange({
      ...dichoptic!,
      mapping: { redEye: redEye, ...dichoptic?.mapping, ...patch },
    });
  };

  const patchBalance = (patch: Partial<NonNullable<DichopticConfig['balance']>>) => {
    onChange({
      ...dichoptic!,
      balance: {
        amblyopicContrastPercent: amblyopicContrast,
        fellowContrastPercent: fellowContrast,
        fellowContent,
        ...dichoptic?.balance,
        ...patch,
      },
    });
  };

  const patchAutoBalance = (patch: Partial<NonNullable<NonNullable<DichopticConfig['balance']>['autoBalance']>>) => {
    patchBalance({
      autoBalance: {
        enabled: autoEnabled,
        stepPercent,
        maxFellowPercent: maxFellow,
        accuracyThreshold: threshold,
        ...dichoptic?.balance?.autoBalance,
        ...patch,
      },
    });
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
        <Typography variant="subtitle2">Cân bằng dichoptic</Typography>
        <HelpTooltip
          title="Kiểm soát mức tương phản từng mắt qua kính anaglyph. 'Cân bằng' giảm tương phản mắt trội để kích thích mắt nhược thị nhìn thấy kích thích tốt hơn."
          variant="info"
        />
      </Box>

      {balanceWarnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {balanceWarnings.map((msg) => (
            <Typography key={msg} variant="body2" component="div" sx={{ mb: balanceWarnings.length > 1 ? 0.5 : 0 }}>
              {msg}
            </Typography>
          ))}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Chế độ dichoptic</InputLabel>
            <CustomSelect
              label="Chế độ dichoptic"
              value={mode}
              onChange={(e: any) => updateMode(e.target.value as DichopticConfig['mode'])}
              disabled={readOnly}
              size="small"
            >
              <MenuItem value="off">Tắt</MenuItem>
              <MenuItem value="anti_cue">
                Anti-cue (màu ngẫu nhiên, chống nhận ra kênh)
              </MenuItem>
              <MenuItem value="balance">Cân bằng dichoptic (giảm mắt trội)</MenuItem>
            </CustomSelect>
          </FormControl>
        </Grid>

        {mode !== 'off' && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>
                <LabelWithHelp help="Kính lọc ĐỎ đang đeo ở mắt nào của bệnh nhân.">
                  Kính đỏ — mắt
                </LabelWithHelp>
              </InputLabel>
              <CustomSelect
                label="Kính đỏ — mắt"
                value={redEye}
                onChange={(e: any) => patchMapping({ redEye: e.target.value as 'left' | 'right' })}
                disabled={readOnly}
                size="small"
              >
                <MenuItem value="left">Mắt trái</MenuItem>
                <MenuItem value="right">Mắt phải</MenuItem>
              </CustomSelect>
            </FormControl>
          </Grid>
        )}

        {mode === 'balance' && (
          <>
            <Grid size={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Tương phản mắt nhược thị (kênh tín hiệu): {amblyopicContrast}%
              </Typography>
              <Slider
                value={amblyopicContrast}
                onChange={(_, v) =>
                  patchBalance({ amblyopicContrastPercent: v as number })
                }
                min={0}
                max={100}
                step={5}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
                valueLabelDisplay="auto"
                disabled={readOnly}
                size="small"
              />
            </Grid>

            <Grid size={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Tương phản mắt trội (kênh fellow): {fellowContrast}%
              </Typography>
              <Slider
                value={fellowContrast}
                onChange={(_, v) =>
                  patchBalance({ fellowContrastPercent: v as number })
                }
                min={0}
                max={100}
                step={5}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
                valueLabelDisplay="auto"
                disabled={readOnly}
                size="small"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>
                  <LabelWithHelp help="Nội dung hiển thị cho mắt trội: 'none' = không, 'noise' = hạt nhiễu, 'dim_context' = bối cảnh mờ.">
                    Nội dung mắt trội
                  </LabelWithHelp>
                </InputLabel>
                <CustomSelect
                  label="Nội dung mắt trội"
                  value={fellowContent}
                  onChange={(e: any) =>
                    patchBalance({ fellowContent: e.target.value as 'none' | 'noise' | 'dim_context' })
                  }
                  disabled={readOnly}
                  size="small"
                >
                  <MenuItem value="none">Không (màu nền thuần)</MenuItem>
                  <MenuItem value="noise">Nhiễu ngẫu nhiên</MenuItem>
                  <MenuItem value="dim_context">Bối cảnh mờ</MenuItem>
                </CustomSelect>
              </FormControl>
            </Grid>

            <Grid size={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoEnabled}
                    onChange={(e) => patchAutoBalance({ enabled: e.target.checked })}
                    disabled={readOnly}
                    size="small"
                  />
                }
                label={
                  <LabelWithHelp help="Tự động tăng tương phản mắt trội sau mỗi stage khi độ chính xác đủ cao — giúp tăng dần thử thách theo tiến triển của bệnh nhân.">
                    Tự động tăng balance theo tiến triển
                  </LabelWithHelp>
                }
              />
            </Grid>

            {autoEnabled && (
              <>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <CustomTextField
                    fullWidth
                    type="number"
                    label="Bước tăng (%/stage)"
                    value={stepPercent}
                    onChange={(e: any) =>
                      patchAutoBalance({ stepPercent: Number(e.target.value) })
                    }
                    disabled={readOnly}
                    size="small"
                    inputProps={{ min: 1, max: 50, step: 1 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <CustomTextField
                    fullWidth
                    type="number"
                    label="Trần tối đa fellow (%)"
                    value={maxFellow}
                    onChange={(e: any) =>
                      patchAutoBalance({ maxFellowPercent: Number(e.target.value) })
                    }
                    disabled={readOnly}
                    size="small"
                    inputProps={{ min: 0, max: 100, step: 5 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <CustomTextField
                    fullWidth
                    type="number"
                    label="Ngưỡng accuracy (%)"
                    value={Math.round(threshold * 100)}
                    onChange={(e: any) =>
                      patchAutoBalance({
                        accuracyThreshold: Number(e.target.value) / 100,
                      })
                    }
                    disabled={readOnly}
                    size="small"
                    inputProps={{ min: 0, max: 100, step: 5 }}
                  />
                </Grid>
              </>
            )}
          </>
        )}
      </Grid>
    </Box>
  );
};
