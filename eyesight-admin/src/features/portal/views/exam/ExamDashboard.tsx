import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import PageContainer from 'src/components/container/PageContainer';
import { useTranslation } from 'src/hooks/useTranslation';
import { useNavigate } from 'react-router-dom';

// Components
import IndividualExamCard from './components/IndividualExamCard';

// Hooks & Services
import useAuth from 'src/contexts/authGuard/useAuth';
import {
  getMyExamResults,
  getMyCurrentSessions,
  startExamFromSession,
} from 'src/services/patient.service';

// Types & Utils
import type { ExamType } from 'src/services/types';
import type { PortalExamSession } from 'src/types/core';

const ExamDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const patient = user?.patient;

  // State for sessions
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessions, setCurrentSessions] = useState<Record<ExamType, ExamSession>>(
    {} as Record<ExamType, ExamSession>
  );

  // Fetch sessions from API
  const fetchSessions = useCallback(async () => {
    if (!patient?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch current-cycle sessions (one per exam type), INCLUDING completed
      // Returns object: { far: { ...session, frequency }, near: { ... }, ... }
      const currentData = await getMyCurrentSessions();
      setCurrentSessions((currentData || {}) as Record<ExamType, ExamSession>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [patient?.id]);

  // Handle exam start from session
  const handleStartExam = useCallback(
    async (session: ExamSession) => {
      setLoading(true);
      setError(null);

      try {
        // If already incomplete with startedAt, resume by navigating to existing result
        if (session.status === 'incomplete' && session.startedAt) {
          const res: any = await getMyExamResults({
            status: 'incomplete',
            examType: session.examType,
            examSessionId: String(session.id),
            limit: 1,
          });

          const existing = res?.rows?.[0];
          if (existing?.id) {
            navigate(`/portal/exam/${existing.id}`, {
              state: {
                examType: session.examType,
                examResultId: existing.id,
                sessionId: session.id,
              },
            });
            return;
          }
        }

        // Otherwise start a new result from session
        const examResult = await startExamFromSession(session.id);
        navigate(`/portal/exam/${examResult.id}`, {
          state: {
            examType: session.examType,
            examResultId: examResult.id,
            sessionId: session.id,
          },
        });
      } catch (err) {
        setError(t('exam.startExamError', 'Không thể bắt đầu kiểm tra. Vui lòng thử lại.'));
        setLoading(false);
      }
    },
    [navigate, t]
  );

  // Load data on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <PageContainer
      title={t('exam.schedule.title', 'Lịch kiểm tra thị lực')}
      description="Quản lý lịch kiểm tra thị lực của bạn"
    >
      <LoadingBoundary loading={loading} height="50vh">
        {!patient ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">
              {t(
                'exam.patientNotFound',
                'Không tìm thấy thông tin bệnh nhân. Vui lòng đăng nhập lại.'
              )}
            </Alert>
          </Box>
        ) : (
          <Box>
            {/* Page Header */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h4" gutterBottom>
                {t('exam.schedule.title', 'Lịch kiểm tra thị lực')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('exam.welcome', 'Xin chào')} <strong>{user?.name}</strong>,{' '}
                {t('exam.schedule.subtitleSuffix', 'dưới đây là lịch kiểm tra thị lực của bạn.')}
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Exam Cards - Show current active sessions (scheduledDate <= today, status != completed) */}
            <Box sx={{ mb: 4 }}>
              {Object.keys(currentSessions).length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.2,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="h6" color="text.secondary">
                    {t('exam.noSessions', 'Chưa có phiên kiểm tra nào.')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Các phiên kiểm tra sẽ được tạo tự động theo lịch.
                  </Typography>
                </Box>
              ) : (
                Object.entries(currentSessions).map(([examType, session]) => {
                  const isCompleted = session.status === 'completed';
                  // Status: incomplete | completed
                  const displayStatus = isCompleted ? 'completed' : 'incomplete';

                  return (
                    <IndividualExamCard
                      key={examType}
                      examType={examType as ExamType}
                      frequency={(session.frequency || 'daily') as 'daily' | 'weekly' | 'monthly'}
                      lastExamDate={isCompleted ? session.completedAt : undefined}
                      nextDueDate={session.scheduledDate}
                      status={displayStatus}
                      onStartExam={() => handleStartExam(session)}
                      isEnabled={true}
                    />
                  );
                })
              )}
            </Box>
          </Box>
        )}
      </LoadingBoundary>
    </PageContainer>
  );
};

export default ExamDashboard;
