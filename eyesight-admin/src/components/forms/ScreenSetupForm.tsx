import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Box,
  TextField,
  Button,
  Divider,
  Alert,
  Chip,
  Grid,
  Tooltip,
  Typography,
} from '@mui/material';
import { Devices as DevicesIcon, Save as SaveIcon, MyLocation as MyLocationIcon } from '@mui/icons-material';
import { useTranslation } from 'src/hooks/useTranslation';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import { shouldShowFieldError } from 'src/utils';
import { ScreenInfo, calculatePPI } from 'src/utils/visionUtils';
import {
  getDefaultDeviceProfile,
  getLastScreenConfig,
  saveDeviceProfile,
  markDeviceProfileUsed,
  saveLastScreenConfig,
  type DeviceProfile,
} from 'src/services/deviceProfile.service';
import { exerciseSetupSchema, type ExerciseSetupFormData } from 'src/validations';
import { HelpTooltip } from 'src/components/shared/HelpTooltip';
import DeviceProfileManager from 'src/features/portal/views/exerciseResult/components/DeviceProfileManager';

interface ScreenSetupFormProps {
  /**
   * Callback when form is submitted with screen data
   */
  onScreenConfigured: (screenInfo: ScreenInfo) => void;

  /**
   * Optional label for the submit button
   */
  submitLabel?: string;

  /**
   * Whether to show the full screen info header
   */
  showHeader?: boolean;

  /**
   * Optional header title
   */
  headerTitle?: string;

  /**
   * Optional help text
   */
  helpText?: string;

  /**
   * Additional calculation preview content (e.g., for exam-specific info)
   */
  renderAdditionalInfo?: (screenInfo: ExerciseSetupFormData) => React.ReactNode;

  /**
   * Loading state for submit button
   */
  loading?: boolean;

  /**
   * Disable submit (e.g. screen too small for VT Quest)
   */
  submitDisabled?: boolean;

  /**
   * Called when form values change (for live previews / validation)
   */
  onValuesChange?: (screenInfo: ScreenInfo) => void;
}

const commonScreenSizes = [
  { label: '13.3" Laptop', diagonal: 13.3 },
  { label: '14" Laptop', diagonal: 14 },
  { label: '15.6" Laptop', diagonal: 15.6 },
  { label: '24" Monitor', diagonal: 24 },
  { label: '27" Monitor', diagonal: 27 },
];

const ScreenSetupForm: React.FC<ScreenSetupFormProps> = ({
  onScreenConfigured,
  submitLabel,
  showHeader = true,
  headerTitle,
  helpText,
  renderAdditionalInfo,
  loading = false,
  showPresets = true,
  submitDisabled = false,
  onValuesChange,
}) => {
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [profileManagerOpen, setProfileManagerOpen] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, touchedFields },
  } = useForm<ExerciseSetupFormData>({
    resolver: yupResolver(exerciseSetupSchema),
    defaultValues: {
      diagonalInch: 15.6,
      screenWidth: 1920,
      screenHeight: 1080,
    },
  });

  const values = watch();
  const touched = touchedFields;

  useEffect(() => {
    onValuesChange?.({
      diagonalInch: values.diagonalInch,
      screenWidth: values.screenWidth,
      screenHeight: values.screenHeight,
    });
  }, [values.diagonalInch, values.screenWidth, values.screenHeight, onValuesChange]);

  const applyScreenConfig = useCallback(
    (screenConfig: ScreenInfo) => {
      setValue('diagonalInch', screenConfig.diagonalInch);
      setValue('screenWidth', screenConfig.screenWidth);
      setValue('screenHeight', screenConfig.screenHeight);
    },
    [setValue],
  );

  // Load default device profile on mount
  useEffect(() => {
    const lastScreenConfig = getLastScreenConfig();
    if (lastScreenConfig) {
      applyScreenConfig(lastScreenConfig);
      return;
    }

    const defaultProfile = getDefaultDeviceProfile();
    if (defaultProfile) {
      applyScreenConfig(defaultProfile);
      setCurrentProfileId(defaultProfile.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist screen config whenever values change
  useEffect(() => {
    if (!values.diagonalInch || !values.screenWidth || !values.screenHeight) {
      return;
    }

    saveLastScreenConfig({
      diagonalInch: values.diagonalInch,
      screenWidth: values.screenWidth,
      screenHeight: values.screenHeight,
    });
  }, [values.diagonalInch, values.screenWidth, values.screenHeight]);

  const handlePresetSelect = (preset: (typeof commonScreenSizes)[0]) => {
    setSelectedPreset(preset.label);
    setValue('diagonalInch', preset.diagonal);
  };

  /**
   * Auto-detect physical screen resolution from the browser.
   *
   * On Windows + Chrome, window.screen.width/height returns the physical pixel
   * count regardless of OS display scaling. On macOS / other browsers it may
   * return CSS (logical) pixels. Multiplying by devicePixelRatio converts CSS
   * pixels to physical pixels in both cases, so the result is always the true
   * panel resolution that the PPI formula requires.
   *
   * Note: diagonal must still be entered manually — there is no reliable
   * software API to obtain the physical screen size in inches.
   */
  const handleAutoDetect = () => {
    const dpr = window.devicePixelRatio || 1;
    // Multiply by DPR: on browsers that already return physical pixels the
    // product is the same (DPR ≈ 1 at physical scale); on browsers that return
    // CSS pixels it converts to physical. This gives the correct physical
    // resolution in all common configurations.
    const physicalWidth = Math.round(window.screen.width * dpr);
    const physicalHeight = Math.round(window.screen.height * dpr);
    setValue('screenWidth', physicalWidth);
    setValue('screenHeight', physicalHeight);
    setSelectedPreset(''); // clear preset highlight since we have a detected value
    showSnackbar(
      t(
        'exerciseSetup.resolutionDetected',
        `Đã phát hiện độ phân giải: ${physicalWidth} × ${physicalHeight} px (DPR = ${dpr}). Vui lòng xác nhận kích thước màn hình (inch).`
      ),
      SNACKBAR_SEVERITY.SUCCESS
    );
  };

  const handleSelectProfile = (profile: DeviceProfile) => {
    applyScreenConfig(profile);
    setCurrentProfileId(profile.id);
    setSelectedPreset('');
  };

  const handleSaveAsProfile = () => {
    const profileName = prompt(
      t('exerciseSetup.deviceNamePrompt', 'Nhập tên cho thiết bị này:'),
      t('exerciseSetup.defaultDeviceName', 'Thiết bị {{date}}', {
        date: new Date().toLocaleDateString('vi-VN'),
      })
    );
    if (profileName && profileName.trim()) {
      try {
        const newProfile = saveDeviceProfile({
          name: profileName.trim(),
          diagonalInch: values.diagonalInch,
          screenWidth: values.screenWidth,
          screenHeight: values.screenHeight,
          isDefault: false,
        });
        setCurrentProfileId(newProfile.id);
        showSnackbar(
          t('exerciseSetup.deviceSaved', 'Đã lưu thông tin thiết bị!'),
          SNACKBAR_SEVERITY.SUCCESS
        );
      } catch (_error) {
        showSnackbar(
          t('exerciseSetup.deviceSaveError', 'Có lỗi khi lưu thiết bị'),
          SNACKBAR_SEVERITY.ERROR
        );
      }
    }
  };

  const handleFormSubmit = (data: ExerciseSetupFormData) => {
    saveLastScreenConfig({
      diagonalInch: data.diagonalInch,
      screenWidth: data.screenWidth,
      screenHeight: data.screenHeight,
    });

    if (currentProfileId) {
      markDeviceProfileUsed(currentProfileId);
    }

    onScreenConfigured(data);
  };

  return (
    <Box>
      {showHeader && (
        <Box sx={{ mb: 3 }}>
          {headerTitle && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="h6">{headerTitle}</Typography>
              {helpText && <HelpTooltip title={helpText} />}
            </Box>
          )}
        </Box>
      )}

      {/* Device Profile Actions */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Tooltip
          title={t(
            'exerciseSetup.autoDetectTooltip',
            'Tự động phát hiện độ phân giải vật lý của màn hình này. Bạn vẫn cần nhập kích thước đường chéo (inch) theo thông số máy.'
          )}
        >
          <Button
            variant="contained"
            color="info"
            startIcon={<MyLocationIcon />}
            onClick={handleAutoDetect}
            fullWidth
          >
            {t('exerciseSetup.autoDetect', 'Tự động phát hiện')}
          </Button>
        </Tooltip>
        <Button
          variant="outlined"
          startIcon={<DevicesIcon />}
          onClick={() => setProfileManagerOpen(true)}
          fullWidth
        >
          {t('exerciseSetup.manageSavedDevices', 'Quản lý thiết bị đã lưu')}
        </Button>
        <Tooltip
          title={t(
            'exerciseSetup.saveCurrentDeviceTooltip',
            'Lưu thông số hiện tại làm thiết bị mới'
          )}
        >
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleSaveAsProfile}
            fullWidth
          >
            {t('exerciseSetup.saveThisDevice', 'Lưu thiết bị này')}
          </Button>
        </Tooltip>
      </Box>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        {/* Quick Preset Selection */}
        {showPresets && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('exerciseSetup.quickCommonSizes', 'Chọn nhanh kích thước phổ biến:')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {commonScreenSizes.map((preset) => (
                  <Chip
                    key={preset.label}
                    label={preset.label}
                    variant={selectedPreset === preset.label ? 'filled' : 'outlined'}
                    color={selectedPreset === preset.label ? 'primary' : 'default'}
                    clickable
                    onClick={() => handlePresetSelect(preset)}
                    size="small"
                  />
                ))}
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* Form Fields */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="diagonalInch"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label={t('exam.screenSize', 'Kích thước màn hình (inch)')}
                  type="number"
                  error={shouldShowFieldError(errors.diagonalInch, touched.diagonalInch)}
                  helperText={
                    shouldShowFieldError(errors.diagonalInch, touched.diagonalInch)
                      ? errors.diagonalInch?.message
                      : ''
                  }
                  inputProps={{ step: 0.1, min: 10, max: 50 }}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="screenWidth"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label={t('exam.screenWidthPx', 'Độ phân giải ngang (px)')}
                  type="number"
                  error={shouldShowFieldError(errors.screenWidth, touched.screenWidth)}
                  helperText={
                    shouldShowFieldError(errors.screenWidth, touched.screenWidth)
                      ? errors.screenWidth?.message
                      : ''
                  }
                  inputProps={{ step: 1, min: 800, max: 7680 }}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="screenHeight"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label={t('exam.screenHeightPx', 'Độ phân giải dọc (px)')}
                  type="number"
                  error={shouldShowFieldError(errors.screenHeight, touched.screenHeight)}
                  helperText={
                    shouldShowFieldError(errors.screenHeight, touched.screenHeight)
                      ? errors.screenHeight?.message
                      : ''
                  }
                  inputProps={{ step: 1, min: 600, max: 4320 }}
                />
              )}
            />
          </Grid>
        </Grid>

        {/* Calculation Preview */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>{t('exerciseSetup.calculationInfo', 'Thông số tính toán:')}</strong>
            <br />
            {(() => {
              // Use calculatePPI from visionUtils — single source of truth
              const ppi = values.diagonalInch > 0
                ? calculatePPI({ screenWidth: values.screenWidth, screenHeight: values.screenHeight, diagonalInch: values.diagonalInch })
                : 0;
              return (
                <>
                  {t('exerciseSetup.ppiLabel', 'PPI')}: {Math.round(ppi * 10) / 10}
                  <br />
                </>
              );
            })()}
            {renderAdditionalInfo && renderAdditionalInfo(values)}
          </Typography>
        </Alert>

        {/* Submit Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || submitDisabled}
            sx={{ minWidth: 250, py: 1.5 }}
          >
            {loading
              ? t('common.loading', 'Đang xử lý...')
              : submitLabel || t('common.continue', 'Tiếp tục')}
          </Button>
        </Box>
      </form>

      {/* Device Profile Manager Dialog */}
      <DeviceProfileManager
        open={profileManagerOpen}
        onClose={() => setProfileManagerOpen(false)}
        onSelectProfile={handleSelectProfile}
      />
    </Box>
  );
};

export default ScreenSetupForm;
