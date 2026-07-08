import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Container } from '@mui/material';
import PortalExercise from 'src/components/exercises/portal/PortalExercise';
import { Assignment } from 'src/types';
import { ScreenInfo } from 'src/utils/visionUtils';
import { getPreferredScreenInfo } from 'src/services/screenCalibration.service';
import { getData } from 'src/utils/request';
import useFreshPatientExamResults from 'src/hooks/useFreshPatientExamResults';
import ExerciseVisionRequiredAlert from 'src/features/portal/views/exerciseResult/components/ExerciseVisionRequiredAlert';
import { hasExerciseVisionLevel } from 'src/utils/exerciseVisionPrerequisites';

// Minimal-layout page to execute an exercise fullscreen (no app chrome)
const ExerciseExecutePage: React.FC = () => {
  const { assignmentId, sessionId } = useParams<{ assignmentId?: string; sessionId?: string }>();
  const location = useLocation();
  const { examResults: freshExamResults, loading: examResultsLoading } = useFreshPatientExamResults();
  const [resolvedAssignment, setResolvedAssignment] = useState<Assignment | null>(
    (location.state?.assignment as Assignment) || null
  );
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(
    !location.state?.assignment && Boolean(assignmentId)
  );

  useEffect(() => {
    let isMounted = true;

    if (!assignmentId) {
      setResolvedAssignment(null);
      setIsLoadingAssignment(false);
      return () => {
        isMounted = false;
      };
    }

    const loadAssignment = async () => {
      setIsLoadingAssignment(true);
      try {
        const assignment = await getData<Assignment>(`/me/assignments/${assignmentId}`);
        if (isMounted) {
          setResolvedAssignment(assignment);
        }
      } catch {
        if (isMounted) {
          setResolvedAssignment(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAssignment(false);
        }
      }
    };

    void loadAssignment();

    return () => {
      isMounted = false;
    };
  }, [assignmentId]);

  const screenParams = useMemo<ScreenInfo>(() => {
    return (
      (location.state?.screenParams as ScreenInfo) || getPreferredScreenInfo()
    );
  }, [location.state]);

  const canDetermineVisionSize = useMemo(() => {
    if (!resolvedAssignment?.exerciseConfig) return false;
    return hasExerciseVisionLevel({
      levelOverride: resolvedAssignment.levelOverride,
      visionLevel: resolvedAssignment.visionLevel,
      visionType: resolvedAssignment.exerciseConfig.visionType,
      trainingEye: resolvedAssignment.trainingEye,
      configEye: resolvedAssignment.exerciseConfig.eye,
      examResults: freshExamResults,
    });
  }, [resolvedAssignment, freshExamResults]);

  if (!assignmentId || !sessionId) {
    return <Navigate to="/portal/exercises" replace />;
  }

  if (isLoadingAssignment || examResultsLoading) {
    return (
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!resolvedAssignment) {
    return <Navigate to="/portal/exercises" replace />;
  }

  if (!canDetermineVisionSize) {
    return (
      <Box sx={{ width: '100vw', minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="md">
          <ExerciseVisionRequiredAlert showBackButton />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PortalExercise
        assignmentId={Number(assignmentId)}
        sessionId={Number(sessionId)}
        screenParams={screenParams}
        assignment={resolvedAssignment}
      />
    </Box>
  );
};

export default ExerciseExecutePage;
