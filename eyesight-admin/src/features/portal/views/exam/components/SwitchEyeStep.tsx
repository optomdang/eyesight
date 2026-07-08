import { Box, Typography, Button } from '@mui/material';
import { useTranslation } from 'src/hooks/useTranslation';
import { useExamContext } from 'src/contexts/ExamContext';
import { useAutoInstructionAudioQueue } from 'src/hooks/useInstructionAudioPlayback';

const SwitchEyeStep = () => {
  const { t, currentLanguage } = useTranslation();
  const { handleSwitchToLeftEye } = useExamContext();

  useAutoInstructionAudioQueue(['exam_switch_eye'], {
    lang: currentLanguage,
    dedupeKey: `exam-switch-eye:${currentLanguage}`,
  });

  return (
    <Box sx={{ textAlign: 'center', p: 4 }}>
      <Typography variant="h5" gutterBottom>
        {t('exam.switchEye.title', 'Chuẩn bị chuyển sang kiểm tra mắt trái')}
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {t(
          'exam.switchEye.desc',
          'Bạn đã hoàn tất bài kiểm tra mắt phải. Hãy đổi che mắt sang bên mắt phải để thực hiện kiểm tra với mắt trái.'
        )}
      </Typography>
      <Button variant="contained" onClick={handleSwitchToLeftEye}>
        {t('exam.switchEye.cta', 'Tiếp tục kiểm tra mắt trái')}
      </Button>
    </Box>
  );
};

export default SwitchEyeStep;
