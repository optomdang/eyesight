import React, { useState } from 'react';
import { Box, Container, Alert } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import PageContainer from 'src/components/container/PageContainer';
import useAuth from 'src/contexts/authGuard/useAuth';
import { useTranslation } from 'src/hooks/useTranslation';
import { useMyAssignmentDetail } from 'src/features/portal/hooks/usePatientPortal';
import ExerciseSetup from './components/ExerciseSetup';
import { ScreenInfo } from 'src/utils/visionUtils';

const ExerciseResultPage: React.FC = () => {
  const { assignmentId, sessionId } = useParams<{ assignmentId?: string; sessionId?: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const numericAssignmentId = assignmentId ? Number(assignmentId) : undefined;
  const { assignment, loading, error } = useMyAssignmentDetail(numericAssignmentId);

  const handleStartExercise = async (params: ScreenInfo) => {
    try {
      setSubmitting(true);

      // Navigate to execute page with screen parameters
      navigate(`/portal/exercise/assignments/${assignmentId}/sessions/${sessionId}/execute`, {
        state: {
          screenParams: params,
          assignment: assignment,
        },
      });
    } catch (error) {
      console.error('Error submitting screen parameters:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <PageContainer
        title={t('portal.exercise2048')}
        description={t('portal.exercise2048Description')}
      >
        <Container maxWidth="lg">
          <Alert severity="warning">{t('portal.loginRequired')}</Alert>
        </Container>
      </PageContainer>
    );
  }

  if (!sessionId) {
    return (
      <PageContainer
        title={t('portal.exercise2048')}
        description={t('portal.exercise2048Description')}
      >
        <Container maxWidth="lg">
          <Alert severity="error">Session ID không hợp lệ</Alert>
        </Container>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={
        sessionId ? `${t('portal.exerciseGame')} - Session ${sessionId}` : t('portal.exercise2048')
      }
      description={undefined}
    >
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <LoadingBoundary loading={loading} height="400px">
            {error ? (
              <Alert severity="error">{error}</Alert>
            ) : !assignment ? (
              <Alert severity="warning">Không tìm thấy thông tin bài tập.</Alert>
            ) : (
              <ExerciseSetup
                exerciseConfig={assignment.exerciseConfig}
                assignmentVisionLevel={assignment.visionLevel}
                levelOverride={assignment.levelOverride}
                assignmentTrainingEye={assignment.trainingEye}
                lastAchievedVisionLevel={assignment.lastAchievedVisionLevel}
                difficultyBaselineSource={assignment.exerciseConfig?.difficultyBaselineSource}
                onStartExercise={handleStartExercise}
                loading={submitting}
              />
            )}
          </LoadingBoundary>
        </Box>
      </Container>
    </PageContainer>
  );
};

export default ExerciseResultPage;
