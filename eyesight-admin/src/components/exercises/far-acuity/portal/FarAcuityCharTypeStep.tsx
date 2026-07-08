/**
 * Char-type selection — mirrors exam DistanceStep char picker.
 */
import React, { type RefObject } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Typography,
} from '@mui/material';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { useTranslation } from 'src/hooks/useTranslation';
import type { ExamCharType } from 'src/utils/resolvePatientExamCharType';

interface FarAcuityCharTypeStepProps {
  charType: ExamCharType;
  onCharTypeChange: (value: ExamCharType) => void;
  onConfirm: () => void;
  /** Pre-filled from latest far exam */
  suggestedCharType?: ExamCharType | null;
  /** Render Select menu inside fullscreen root (browser fullscreen blocks body portal). */
  menuContainerRef?: RefObject<HTMLElement | null>;
}

const FarAcuityCharTypeStep: React.FC<FarAcuityCharTypeStepProps> = ({
  charType,
  onCharTypeChange,
  onConfirm,
  suggestedCharType,
  menuContainerRef,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 4,
        maxWidth: 480,
        mx: 'auto',
      }}
    >
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
        {t('exam.charType', 'Loại ký tự kiểm tra')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
        Chọn loại ký tự giống bài test thị lực nhìn xa. Bạn sẽ đọc 5 ký tự và xác nhận đáp án
        mỗi lượt; hệ thống tự điều chỉnh độ tương phản và cỡ chữ.
      </Typography>

      {suggestedCharType && suggestedCharType !== charType && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
          Gợi ý từ bài khám gần nhất:{' '}
          <strong>{suggestedCharType}</strong>
        </Typography>
      )}

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>{t('exam.charType', 'Loại ký tự kiểm tra')}</InputLabel>
        <CustomSelect
          value={charType}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onCharTypeChange(e.target.value as ExamCharType)
          }
          label={t('exam.charType', 'Loại ký tự kiểm tra')}
          MenuProps={{
            container: () => menuContainerRef?.current ?? document.body,
          }}
        >
          <MenuItem value="E">{t('exam.letterE', 'Chữ E (Snellen E)')}</MenuItem>
          <MenuItem value="C">{t('exam.letterC', 'Chữ C (Landolt C)')}</MenuItem>
          <MenuItem value="A">{t('exam.letters', 'Chữ cái')}</MenuItem>
          <MenuItem value="N">{t('exam.numbers', 'Số')}</MenuItem>
          <MenuItem value="S">{t('exam.shapes', 'Hình')}</MenuItem>
        </CustomSelect>
      </FormControl>

      <Button variant="contained" size="large" onClick={onConfirm} sx={{ minWidth: 200 }}>
        {t('common.start', 'Bắt đầu')}
      </Button>
    </Box>
  );
};

export default FarAcuityCharTypeStep;
