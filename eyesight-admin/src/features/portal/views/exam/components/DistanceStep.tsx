import { useEffect, useState } from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { useExamContext } from 'src/contexts/ExamContext';
import {
  calculateFarFontSize,
  calculateNearFontSize,
  calculateMinDiagonalInchForExamRow,
  countExamCharsFitOnRow,
  EXAM_ROW_CHAR_COUNT,
  formatVisionLevel,
  getExamSetupVisionResultSource,
} from 'src/utils/visionUtils';
import { farVisionLevels, nearVisionLevels } from 'src/utils/constant';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Button,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect.tsx';
import useFreshPatientExamResults from 'src/hooks/useFreshPatientExamResults';
import { loadCalibration } from 'src/services/screenCalibration.service';

interface ScreenSizeRecommendation {
  /** Tối thiểu: 5 ký tự 20/200 (far) hoặc N8 (near) vừa chiều rộng màn hình */
  minScreenInch: number;
  /** Tối ưu: 5 ký tự 20/400 (far) hoặc N64 (near) vừa chiều rộng màn hình */
  optimalScreenInch: number;
  minCharHeightMm: number;
  optimalCharHeightMm: number;
}

const DistanceStep: React.FC = () => {
  const { distance, setDistance, charType, setCharType, screenInfo, handleInitTest, examType } =
    useExamContext();
  const { examResults: freshExamResults, loading: examResultsLoading } = useFreshPatientExamResults();
  const { t } = useTranslation();

  const calibration = loadCalibration();

  const visionSourceType = getExamSetupVisionResultSource(examType);
  const currentResult = freshExamResults?.[visionSourceType]?.currentResult as
    | { rightEye?: string | number; leftEye?: string | number; bothEye?: string | number }
    | null
    | undefined;

  const isNearTest = examType === 'near';
  const isStereopsisTest = examType === 'stereopsis';
  const distanceUnit = 'm';
  const distanceLabel = isNearTest
    ? t('exam.readingDistance', 'Khoảng cách đọc')
    : t('exam.testDistance', 'Khoảng cách kiểm tra');
  const examTitle = t(
    `exam.${examType}`,
    examType === 'far'
      ? 'Far Vision'
      : examType === 'near'
        ? 'Near Vision'
        : examType === 'contrast'
          ? 'Contrast'
          : 'Stereopsis'
  );

  const parsedDistance = parseFloat(distance);
  const isDistanceValid = Number.isFinite(parsedDistance) && parsedDistance > 0;

  const [screenRecommendation, setScreenRecommendation] = useState<ScreenSizeRecommendation | null>(null);

  useEffect(() => {
    if (examType === 'stereopsis') {
      setScreenRecommendation(null);
      return;
    }

    if (!isDistanceValid) {
      setScreenRecommendation(null);
      return;
    }

    const calcInch = (charHeightMm: number): number =>
      calculateMinDiagonalInchForExamRow(charHeightMm, {
        charType,
        charCount: EXAM_ROW_CHAR_COUNT,
      });

    let minCharHeightMm: number;
    let optimalCharHeightMm: number;

    if (examType === 'near') {
      const minNearLevel = nearVisionLevels[5]; // Level 6 = N8
      const optimalNearLevel = nearVisionLevels[0]; // Level 1 = N64
      minCharHeightMm = calculateNearFontSize(minNearLevel.size, parsedDistance);
      optimalCharHeightMm = calculateNearFontSize(optimalNearLevel.size, parsedDistance);
    } else {
      const minFarLevel = farVisionLevels[3]; // Level 4 = 20/200
      const optimalFarLevel = farVisionLevels[0]; // Level 1 = 20/400
      minCharHeightMm = calculateFarFontSize(minFarLevel.n, parsedDistance);
      optimalCharHeightMm = calculateFarFontSize(optimalFarLevel.n, parsedDistance);
    }

    setScreenRecommendation({
      minScreenInch: calcInch(minCharHeightMm),
      optimalScreenInch: calcInch(optimalCharHeightMm),
      minCharHeightMm,
      optimalCharHeightMm,
    });
  }, [distance, examType, isDistanceValid, parsedDistance, charType]);

  const renderRecommendation = () => {
    if (!screenRecommendation) return null;
    const { minScreenInch, optimalScreenInch, minCharHeightMm, optimalCharHeightMm } =
      screenRecommendation;

    const minLabel =
      examType === 'near'
        ? t('exam.screenRecommendMin.near', 'Tối thiểu (hiển thị 5 ký tự N8)')
        : t('exam.screenRecommendMin.far', 'Tối thiểu (hiển thị 5 ký tự 20/200)');
    const optimalLabel =
      examType === 'near'
        ? t('exam.screenRecommendOptimal.near', 'Tối ưu (hiển thị 5 ký tự N64)')
        : t('exam.screenRecommendOptimal.far', 'Tối ưu (hiển thị 5 ký tự 20/400)');

    const minCharsOnScreen = countExamCharsFitOnRow(minCharHeightMm, screenInfo, { charType });
    const optimalCharsOnScreen = countExamCharsFitOnRow(optimalCharHeightMm, screenInfo, {
      charType,
    });

    const minScore =
      examType === 'near'
        ? 'N8'
        : t('exam.screenRecommendMin.farScore', '20/200');
    const optimalScore =
      examType === 'near'
        ? 'N64'
        : t('exam.screenRecommendOptimal.farScore', '20/400');

    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>{t('exam.screenSizeRecommendation', 'Khuyến nghị kích thước màn hình')}</strong>
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
          <Typography variant="body2">
            • {minLabel}:{' '}
            <Typography component="span" variant="body2" fontWeight="bold">
              {minScreenInch} inch
            </Typography>
          </Typography>
          <Typography variant="body2">
            • {optimalLabel}:{' '}
            <Typography component="span" variant="body2" fontWeight="bold" color="primary">
              {optimalScreenInch} inch
            </Typography>
          </Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Typography variant="body2">
          {t('exam.screenFitPreview', 'Trên màn hình đã hiệu chuẩn ({{inch}}" {{width}}×{{height}}):', {
            inch: screenInfo.diagonalInch,
            width: screenInfo.screenWidth,
            height: screenInfo.screenHeight,
          })}
        </Typography>
        <Typography variant="body2">
          • {minScore}:{' '}
          <Typography
            component="span"
            variant="body2"
            fontWeight="bold"
            color={minCharsOnScreen >= EXAM_ROW_CHAR_COUNT ? 'success.main' : 'error.main'}
          >
            {t('exam.screenFitChars', '{{count}}/{{total}} ký tự trên một hàng', {
              count: minCharsOnScreen,
              total: EXAM_ROW_CHAR_COUNT,
            })}
          </Typography>
        </Typography>
        <Typography variant="body2">
          • {optimalScore}:{' '}
          <Typography
            component="span"
            variant="body2"
            fontWeight="bold"
            color={optimalCharsOnScreen >= EXAM_ROW_CHAR_COUNT ? 'success.main' : 'error.main'}
          >
            {t('exam.screenFitChars', '{{count}}/{{total}} ký tự trên một hàng', {
              count: optimalCharsOnScreen,
              total: EXAM_ROW_CHAR_COUNT,
            })}
          </Typography>
        </Typography>
        {(minCharsOnScreen < EXAM_ROW_CHAR_COUNT ||
          optimalCharsOnScreen < EXAM_ROW_CHAR_COUNT) && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {t(
              'exam.screenFitWarning',
              'Màn hình hiện tại có thể không đủ rộng để hiển thị đủ 5 ký tự trên một hàng. Bài test sẽ tự chia thành nhiều lượt (ví dụ 3+2 ký tự). Nên dùng màn hình lớn hơn hoặc mở trình duyệt toàn màn hình để đo chính xác hơn.'
            )}
          </Alert>
        )}
      </Alert>
    );
  };

  const formatSetupVisionScore = (levelVal: string | number | null | undefined) => {
    if (levelVal == null || levelVal === '') return null;
    const formatted = formatVisionLevel(visionSourceType, levelVal);
    return formatted === '-' ? null : formatted;
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t('exam.setupTestTitle', 'Thiết lập bài kiểm tra')} {examTitle}
      </Typography>

      <Typography variant="body1" paragraph>
        {t('exam.setupInstructions', 'Vui lòng nhập thông tin cần thiết để bắt đầu bài kiểm tra:')}
      </Typography>

      {/* Calibrated screen info banner */}
      {calibration && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Màn hình đã hiệu chuẩn:</strong> {calibration.diagonalInch}" —{' '}
            {calibration.nativeScreenWidth}×{calibration.nativeScreenHeight} px — PPI:{' '}
            {calibration.ppi.toFixed(1)} (
            {calibration.method === 'card' ? 'thẻ ngân hàng' : 'thước vật lý'})
          </Typography>
        </Alert>
      )}

      {/* Current patient vision status */}
      {examType !== 'stereopsis' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {t('exam.currentVisionStatus', 'Kết quả thị lực hiện tại của bệnh nhân')}
            {examType === 'contrast' && (
              <>
                {' '}
                ({t('exam.contrastUsesFarAcuity', 'thị lực xa')})
              </>
            )}
          </Typography>
          <Stack direction="row" gap={2} flexWrap="wrap">
            {(['right', 'left', 'both'] as const).map((eye) => {
              const val = currentResult?.[eye === 'right' ? 'rightEye' : eye === 'left' ? 'leftEye' : 'bothEye'];
              const score = examResultsLoading ? null : formatSetupVisionScore(val);
              const label =
                eye === 'right'
                  ? t('exam.rightEye', 'Mắt phải')
                  : eye === 'left'
                    ? t('exam.leftEye', 'Mắt trái')
                    : t('exam.bothEyes', 'Hai mắt');
              return (
                <Box key={eye} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2">{label}:</Typography>
                  <Chip
                    size="small"
                    label={
                      examResultsLoading
                        ? t('common.loading', 'Đang tải...')
                        : score ?? t('exam.noResult', 'Chưa có')
                    }
                    color={score ? 'primary' : 'default'}
                    variant={score ? 'filled' : 'outlined'}
                  />
                </Box>
              );
            })}
          </Stack>
        </Alert>
      )}

      {/* Distance and Character Type */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: 'flex-start',
        }}
      >
        <Box sx={{ width: '100%', flex: 1 }}>
          <TextField
            fullWidth
            label={distanceLabel}
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            slotProps={{
              input: {
                endAdornment: <Typography variant="body2">{distanceUnit}</Typography>,
              },
            }}
          />
        </Box>

        {examType !== 'stereopsis' && (
          <Box sx={{ width: '100%', flex: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{t('exam.charType', 'Loại ký tự kiểm tra')}</InputLabel>
              <CustomSelect
                value={charType}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCharType(e.target.value as 'E' | 'C' | 'A' | 'N' | 'S')
                }
                label={t('exam.charType', 'Loại ký tự kiểm tra')}
              >
                <MenuItem value="E">{t('exam.letterE', 'Chữ E (Snellen E)')}</MenuItem>
                <MenuItem value="C">{t('exam.letterC', 'Chữ C (Landolt C)')}</MenuItem>
                <MenuItem value="A">{t('exam.letters', 'Chữ cái')}</MenuItem>
                <MenuItem value="N">{t('exam.numbers', 'Số')}</MenuItem>
                <MenuItem value="S">{t('exam.shapes', 'Hình')}</MenuItem>
              </CustomSelect>
            </FormControl>
          </Box>
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {isNearTest
            ? t('exam.standardReadingDistance', 'Khoảng cách đọc thông thường là 0.4m')
            : isStereopsisTest
              ? t(
                  'exam.standardStereopsisDistance',
                  'Khoảng cách khuyến nghị là 0.5m (bạn có thể điều chỉnh nếu cần)'
                )
              : t(
                  'exam.standardTestDistance',
                  'Khoảng cách mặc định là 3m, khoảng cách tiêu chuẩn là 6m (có thể điều chỉnh)'
                )}
        </Typography>
      </Box>

      {/* Screen size recommendation */}
      {renderRecommendation()}

      {/* Continue button */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          disabled={!isDistanceValid}
          onClick={() => handleInitTest()}
          sx={{ minWidth: 250, py: 1.5 }}
        >
          {t('common.continue', 'Tiếp tục')}
        </Button>
      </Box>
    </Box>
  );
};

export default DistanceStep;
