import React from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'src/hooks/useTranslation';
import {
  EXERCISE_VISION_LEVEL_REQUIRED_GUIDANCE,
  EXERCISE_VISION_LEVEL_REQUIRED_MESSAGE,
} from 'src/utils/exerciseVisionPrerequisites';

type ExerciseVisionRequiredAlertProps = {
  showBackButton?: boolean;
  backTo?: string;
};

const ExerciseVisionRequiredAlert: React.FC<ExerciseVisionRequiredAlertProps> = ({
  showBackButton = false,
  backTo = '/portal/exercises',
}) => {
  const { t } = useTranslation();

  return (
    <Alert severity="warning" sx={{ mb: 3 }}>
      <AlertTitle>
        {t('exerciseSetup.visionRequiredTitle', 'Chưa thể bắt đầu bài tập')}
      </AlertTitle>
      {t('exerciseSetup.visionRequiredMessage', EXERCISE_VISION_LEVEL_REQUIRED_MESSAGE)}
      <Box component="p" sx={{ mt: 1, mb: 0 }}>
        {t('exerciseSetup.visionRequiredGuidance', EXERCISE_VISION_LEVEL_REQUIRED_GUIDANCE)}
      </Box>
      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button component={RouterLink} to="/portal/exam" variant="contained" size="small">
          {t('exerciseSetup.goToVisionTests', 'Đi tới Kiểm tra thị lực')}
        </Button>
        {showBackButton && (
          <Button component={RouterLink} to={backTo} variant="outlined" size="small">
            {t('common.back', 'Quay lại')}
          </Button>
        )}
      </Box>
    </Alert>
  );
};

export default ExerciseVisionRequiredAlert;
