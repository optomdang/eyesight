import React, { useMemo, useState } from 'react';
import { Box, Card, CardContent, Typography, Divider, CircularProgress, Alert } from '@mui/material';
import MonitorIcon from '@mui/icons-material/Monitor';
import { useTranslation } from 'src/hooks/useTranslation';
import useAuth from 'src/contexts/authGuard/useAuth';
import useFreshPatientExamResults from 'src/hooks/useFreshPatientExamResults';
import {
  ScreenInfo,
  calculateVisualSettings,
  formatVisionLevel,
  resolveExerciseVisionLevel,
} from 'src/utils/visionUtils';
import useSnackbar from 'src/contexts/UseSnackbar';
import ScreenSetupForm from 'src/components/forms/ScreenSetupForm';
import { getPreferredScreenInfo } from 'src/services/screenCalibration.service';
import ExerciseVisionRequiredAlert from './ExerciseVisionRequiredAlert';
import { hasExerciseVisionLevel } from 'src/utils/exerciseVisionPrerequisites';
import { resolveExerciseStartVisionLevel } from 'src/utils/exerciseDifficultyBaseline';
import {
  checkVtQuestScreenRequirements,
  parseExerciseDistanceM,
  resolveVtExerciseVision,
} from 'src/components/exercises/vt/core/vtVisionSizing';
import { isVtQuestFamily } from 'src/components/exercises/vt/core/vtExerciseTypes';

interface ExerciseSetupProps {
  exerciseConfig?: any;
  assignmentVisionLevel?: number | null;
  levelOverride?: boolean;
  assignmentTrainingEye?: 'left' | 'right' | 'both' | null;
  /** Highest level reached in this assignment — used for 'latest_achieved' mode display. */
  lastAchievedVisionLevel?: number | null;
  /** Difficulty baseline mode from the exercise config. */
  difficultyBaselineSource?: 'current_exam' | 'latest_achieved' | null;
  onStartExercise: (params: ScreenInfo) => void;
  loading?: boolean;
}

const ExerciseSetup: React.FC<ExerciseSetupProps> = ({
  exerciseConfig,
  assignmentVisionLevel,
  levelOverride,
  assignmentTrainingEye,
  lastAchievedVisionLevel,
  difficultyBaselineSource,
  onStartExercise,
  loading = false,
}) => {
  const { user } = useAuth();
  const { examResults: freshExamResults, loading: examResultsLoading } = useFreshPatientExamResults();
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const [screenValues, setScreenValues] = useState<ScreenInfo>(() => getPreferredScreenInfo());

  const isVtQuest = isVtQuestFamily(exerciseConfig?.exercise?.exerciseType);

  const canDetermineVisionSize = useMemo(
    () =>
      hasExerciseVisionLevel({
        levelOverride,
        visionLevel: assignmentVisionLevel,
        visionType: exerciseConfig?.visionType,
        trainingEye: assignmentTrainingEye,
        configEye: exerciseConfig?.eye,
        examResults: freshExamResults,
      }),
    [
      assignmentVisionLevel,
      assignmentTrainingEye,
      exerciseConfig?.eye,
      exerciseConfig?.visionType,
      freshExamResults,
      levelOverride,
    ]
  );

  const vtVisionResolved = useMemo(
    () =>
      resolveVtExerciseVision({
        levelOverride,
        visionLevel: assignmentVisionLevel,
        visionType: exerciseConfig?.visionType,
        trainingEye: assignmentTrainingEye,
        configEye: exerciseConfig?.eye,
        examResults: freshExamResults,
        startVisionLevel: resolveExerciseStartVisionLevel({
          difficultyBaselineSource,
          levelOverride,
          visionLevel: assignmentVisionLevel,
          visionType: exerciseConfig?.visionType,
          trainingEye: assignmentTrainingEye,
          configEye: exerciseConfig?.eye,
          examResults: freshExamResults,
          lastAchievedVisionLevel,
        }),
      }),
    [
      assignmentVisionLevel,
      assignmentTrainingEye,
      difficultyBaselineSource,
      lastAchievedVisionLevel,
      exerciseConfig?.eye,
      exerciseConfig?.visionType,
      freshExamResults,
      levelOverride,
    ]
  );

  const vtScreenCheck = useMemo(() => {
    if (!isVtQuest || !vtVisionResolved) return null;
    const distanceM = parseExerciseDistanceM(exerciseConfig?.distance);
    if (distanceM == null) return null;
    const rawVt = (exerciseConfig as { vtSettings?: unknown }).vtSettings;
    return checkVtQuestScreenRequirements({
      screenInfo: screenValues,
      distanceM,
      visionType: vtVisionResolved.sizeVisionType,
      visionLevel: vtVisionResolved.sizeVisionLevel,
      vtSettings: rawVt as import('src/types/core/vtQuest').VtSettings | undefined,
      colorScheme: exerciseConfig?.colorScheme ?? null,
      exerciseVisionType: exerciseConfig?.visionType ?? vtVisionResolved.visionType,
    });
  }, [isVtQuest, vtVisionResolved, exerciseConfig, screenValues]);

  // Get current vision level based on eye config.
  // 'left'/'right' → mắt tương ứng; 'both' → mắt kém hơn (min). Khớp logic runtime
  // trong PortalExercise để preview "cỡ ký tự dự kiến" đúng với game thật.
  const getVisionLevelByEye = (
    result: { leftEye?: number | null; rightEye?: number | null } | undefined
  ): number | null =>
    resolveExerciseVisionLevel(
      result,
      assignmentTrainingEye ?? exerciseConfig?.eye
    );

  // Calculate actual font size based on vision params
  const calculateActualFontSize = (
    visionType: string,
    visionLevel: number,
    screenParams: ScreenInfo,
    distance: number
  ) => {
    try {
      const { fontSize } = calculateVisualSettings({
        visionType: visionType as 'far' | 'near' | 'contrast',
        visionLevel,
        distance,
        screenInfo: screenParams,
      });
      return fontSize;
    } catch (error) {
      console.error('Error calculating font size:', error);
      return 20;
    }
  };

  const getVisionTypeText = (visionType: string) => {
    switch (visionType) {
      case 'far':
        return t('exam.far', 'Far Vision');
      case 'near':
        return t('exam.near', 'Near Vision');
      case 'contrast':
        return t('exam.contrast', 'Contrast');
      case 'stereopsis':
        return t('exam.stereopsis', 'Stereopsis');
      default:
        return visionType || t('common.notAvailable', 'N/A');
    }
  };

  const getFrequencyLabel = (frequency?: string) => {
    if (!frequency) {
      return t('common.notAvailable', 'N/A');
    }
    return t(`exercise.frequencies.${frequency}`, frequency);
  };

  const getColorSchemeDisplay = (colorScheme: any) => {
    if (typeof colorScheme === 'object') {
      const textColor = colorScheme?.textColor || '#000000';
      const backgroundColor = colorScheme?.backgroundColor || '#ffffff';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body1" fontWeight="medium">
            {t('exerciseSetup.customColorScheme', 'Màu tùy chỉnh')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                backgroundColor: textColor,
                border: '1px solid #ccc',
                borderRadius: 0.5,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {t('exercise.textColor', 'Màu chữ')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                backgroundColor: backgroundColor,
                border: '1px solid #ccc',
                borderRadius: 0.5,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {t('exercise.backgroundColor', 'Màu nền')}
            </Typography>
          </Box>
        </Box>
      );
    }

    let textColor = '#000000';
    let backgroundColor = '#ffffff';
    let schemeName = t('exercise.colorSchemes.standard', 'Tiêu chuẩn');

    switch (colorScheme) {
      case 'standard':
        schemeName = t('exercise.colorSchemes.standard', 'Tiêu chuẩn');
        textColor = '#000000';
        backgroundColor = '#ffffff';
        break;
      case 'high-contrast':
        schemeName = t('exercise.colorSchemes.highContrast', 'Độ tương phản cao');
        textColor = '#000000';
        backgroundColor = '#ffff00';
        break;
      case 'dark':
        schemeName = t('exercise.colorSchemes.dark', 'Chế độ tối');
        textColor = '#ffffff';
        backgroundColor = '#000000';
        break;
      case 'light':
        schemeName = t('exercise.colorSchemes.light', 'Chế độ sáng');
        textColor = '#000000';
        backgroundColor = '#ffffff';
        break;
      default:
        schemeName = colorScheme || t('exercise.colorSchemes.standard', 'Tiêu chuẩn');
        break;
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body1" fontWeight="medium">
          {schemeName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: textColor,
              border: '1px solid #ccc',
              borderRadius: 0.5,
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {t('exercise.textColor', 'Màu chữ')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: backgroundColor,
              border: '1px solid #ccc',
              borderRadius: 0.5,
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {t('exercise.backgroundColor', 'Màu nền')}
          </Typography>
        </Box>
      </Box>
    );
  };

  // Render additional info for exercise (vision level preview)
  const renderAdditionalExerciseInfo = (screenParams: ScreenInfo) => {
    const isOverrideActive = levelOverride === true && assignmentVisionLevel != null;
    const effectiveLevel = (visionType: string) => {
      if (isOverrideActive) return assignmentVisionLevel as number;
      const result =
        visionType === 'far'
          ? freshExamResults?.far?.currentResult
          : visionType === 'near'
            ? freshExamResults?.near?.currentResult
            : freshExamResults?.contrast?.currentResult;
      return getVisionLevelByEye(result);
    };

    const farLevel =
      user?.patient && exerciseConfig?.visionType === 'far' && exerciseConfig?.distance
        ? effectiveLevel('far')
        : null;
    const nearLevel =
      user?.patient && exerciseConfig?.visionType === 'near' && exerciseConfig?.distance
        ? effectiveLevel('near')
        : null;
    const contrastLevel =
      user?.patient && exerciseConfig?.visionType === 'contrast' && exerciseConfig?.distance
        ? effectiveLevel('contrast')
        : null;

    const activeLevel = farLevel ?? nearLevel ?? contrastLevel;
    const activeType = farLevel ? 'far' : nearLevel ? 'near' : 'contrast';

    if (!activeLevel || !exerciseConfig?.distance) return null;

    const visionLabel = formatVisionLevel(activeType, activeLevel);
    return (
      <>
        {exerciseConfig?.distance && (
          <>
            {t('exerciseSetup.trainingDistance', 'Khoảng cách luyện tập')}:{' '}
            {typeof exerciseConfig.distance === 'number'
              ? exerciseConfig.distance.toFixed(2)
              : exerciseConfig.distance}{' '}
            {t('exerciseSetup.meterUnit', 'mét')}
            <br />
          </>
        )}
        {t('exerciseSetup.expectedCharacterSize', 'Kích thước ký tự dự kiến')}:{' '}
        {calculateActualFontSize(activeType, activeLevel, screenParams, exerciseConfig.distance)}
        px ({visionLabel}
        {isOverrideActive && <> — {t('exerciseSetup.doctorOverrideHint', 'bác sĩ chỉ định')}</>})
      </>
    );
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t('exerciseSetup.infoAndScreenSetup', 'Thông tin bài tập và thiết lập màn hình')}
        </Typography>

        {/* Exercise Information Display */}
        {exerciseConfig && (
          <Box sx={{ mb: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                flexWrap: 'wrap',
                gap: 3,
              }}
            >
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('exerciseSetup.configName', 'Tên chế độ luyện tập')}
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {exerciseConfig?.name || t('exerciseSetup.noName', 'Không có tên')}
                </Typography>
              </Box>
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('exerciseSetup.exerciseName', 'Tên bài tập')}
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {exerciseConfig?.exercise?.name || t('common.notAvailable', 'N/A')}
                </Typography>
              </Box>
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('exerciseSetup.testType', 'Loại kiểm tra')}
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {getVisionTypeText(exerciseConfig?.visionType)}
                </Typography>
              </Box>
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('exercise.colorScheme', 'Bảng màu')}
                </Typography>
                {getColorSchemeDisplay(exerciseConfig?.colorScheme)}
              </Box>
              {exerciseConfig?.distance && (
                <Box sx={{ minWidth: 200 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('exerciseSetup.trainingDistance', 'Khoảng cách luyện tập')}
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {t('exerciseSetup.distanceMeters', '{{distance}} mét', {
                      distance: exerciseConfig.distance,
                    })}
                  </Typography>
                </Box>
              )}
              {exerciseConfig?.executionCount && exerciseConfig?.frequency && (
                <Box sx={{ minWidth: 200 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('exerciseSetup.executionCount', 'Số lần tập')}
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {exerciseConfig.executionCount} {t('exerciseSetup.times', 'lần')}/
                    {t(
                      `exercise.frequencyUnits.${exerciseConfig.frequency}`,
                      exerciseConfig.frequency
                    )}
                  </Typography>
                </Box>
              )}
              {exerciseConfig?.frequency && (
                <Box sx={{ minWidth: 200 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('exercise.frequency', 'Tần suất')}
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {getFrequencyLabel(exerciseConfig.frequency)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {!examResultsLoading && !canDetermineVisionSize ? (
          <ExerciseVisionRequiredAlert />
        ) : examResultsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t(
                'exerciseSetup.screenSizeHelp',
                'Chọn kích thước màn hình để bài tập hiển thị với kích thước phù hợp với tình trạng thị lực của bạn.'
              )}
            </Typography>

            <Box
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              {isVtQuest && vtScreenCheck && !vtScreenCheck.fits && (
                <Alert severity="error" icon={<MonitorIcon />} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                    Màn hình không đủ để thực hiện bài tập
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Với thị lực và khoảng cách đã cấu hình, cần vùng hiển thị tối thiểu{' '}
                    {vtScreenCheck.requiredMinWidth}×{vtScreenCheck.requiredMinHeight} px (chế độ toàn
                    màn hình).
                  </Typography>
                  <Typography variant="body2">
                    Khuyến nghị: <strong>{vtScreenCheck.recommendedLabel}</strong>
                  </Typography>
                </Alert>
              )}

              <ScreenSetupForm
                onScreenConfigured={onStartExercise}
                onValuesChange={setScreenValues}
                submitDisabled={Boolean(isVtQuest && vtScreenCheck && !vtScreenCheck.fits)}
                submitLabel={
                  loading
                    ? t('exerciseSetup.initializing', 'Đang khởi tạo...')
                    : t('exerciseSetup.startTraining', 'Bắt đầu luyện tập')
                }
                showHeader={false}
                renderAdditionalInfo={renderAdditionalExerciseInfo}
                loading={loading}
                showPresets={true}
              />
            </Box>

            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 3 }}>
              {t(
                'exerciseSetup.fullscreenHint',
                'Khi bạn bắt đầu, bài tập sẽ mở trong chế độ toàn màn hình với giao diện tối giản để tập trung tối đa.'
              )}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ExerciseSetup;
