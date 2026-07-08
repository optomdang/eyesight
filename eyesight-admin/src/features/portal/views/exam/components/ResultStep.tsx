import { Box, Typography, Button, Chip, Card, CardContent, Avatar } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Visibility,
  VisibilityOff,
  Contrast,
  ThreeDRotation,
  RemoveRedEye,
  BarChart,
  SportsEsports,
} from '@mui/icons-material';
import useAuth from 'src/contexts/authGuard/useAuth';
import { useTranslation } from 'src/hooks/useTranslation';
import { useExamContext } from 'src/contexts/ExamContext';
import { formatVisionLevel } from 'src/utils/visionUtils';

const ResultStep: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get user from auth context as fallback
  const { t } = useTranslation();
  const { rightEyeResult, leftEyeResult, bothResult, examType } = useExamContext();

  // Use user from auth context if patient is null
  const displayName = user?.name || t('common.you', 'Bạn');

  // Helper function to get test icon
  const getTestIcon = (examType: string) => {
    switch (examType) {
      case 'far':
        return <Visibility sx={{ fontSize: 40, color: 'primary.main' }} />;
      case 'near':
        return <VisibilityOff sx={{ fontSize: 40, color: 'secondary.main' }} />;
      case 'contrast':
        return <Contrast sx={{ fontSize: 40, color: 'warning.main' }} />;
      case 'stereopsis':
        return <ThreeDRotation sx={{ fontSize: 40, color: 'info.main' }} />;
      default:
        return <Visibility sx={{ fontSize: 40, color: 'primary.main' }} />;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'text.primary',
        p: 4,
      }}
    >
      {/* Success Animation */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Avatar
          sx={{
            width: 120,
            height: 120,
            bgcolor: 'primary.50',
            border: '3px solid',
            borderColor: 'primary.200',
            mx: 'auto',
            mb: 3,
            animation: 'pulse 2s infinite',
          }}
        >
          <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />
        </Avatar>

        <Typography
          variant="h3"
          gutterBottom
          sx={{
            fontWeight: 700,
            color: 'primary.main',
          }}
        >
          🎉 {t('exam.completed', 'Hoàn thành!')}
        </Typography>

        <Typography
          variant="h5"
          sx={{
            color: 'text.secondary',
            fontWeight: 400,
            mb: 4,
          }}
        >
          {t('exam.congrats', 'Chúc mừng')} <strong>{displayName}</strong>{' '}
          {t('exam.finished', 'đã hoàn thành bài kiểm tra!')}
        </Typography>
      </Box>

      {/* Test Result Card */}
      <Card
        sx={{
          maxWidth: 600,
          width: '100%',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          mb: 2,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Test Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <Box sx={{ mr: 2 }}>{getTestIcon(examType)}</Box>
            <Box>
              <Typography variant="h5" fontWeight="600">
                {t(
                  `exam.${examType}`,
                  examType ? examType.charAt(0).toUpperCase() + examType.slice(1) : 'Exam'
                )}
              </Typography>
            </Box>
          </Box>

          {/* Results Display */}
          <Box sx={{ mt: 2 }}>
            {examType === 'stereopsis' ? (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  {t('exam.stereopsisResult', 'Kết quả thị giác lập thể')}
                </Typography>
                <Chip
                  label={formatVisionLevel(examType, bothResult)}
                  color="info"
                  sx={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    py: 2,
                    px: 3,
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                    }}
                  >
                    <RemoveRedEye sx={{ fontSize: 20 }} /> {t('exam.rightEye', 'Mắt phải')}
                  </Typography>
                  <Chip
                    label={formatVisionLevel(examType, rightEyeResult)}
                    color="primary"
                    sx={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      py: 1.5,
                      px: 2,
                    }}
                  />
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                    }}
                  >
                    <RemoveRedEye sx={{ fontSize: 20 }} /> {t('exam.leftEye', 'Mắt trái')}
                  </Typography>
                  <Chip
                    label={formatVisionLevel(examType, leftEyeResult)}
                    color="secondary"
                    sx={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      py: 1.5,
                      px: 2,
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>

          {/* Encouragement Message */}
          <Box
            sx={{
              mt: 4,
              p: 3,
              bgcolor: 'success.50',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'success.200',
            }}
          >
            <Typography variant="body1" sx={{ textAlign: 'center', fontWeight: 500 }}>
              🌟 <strong>{displayName}</strong> {t('exam.doingGreat', 'đang làm rất tốt!')}{' '}
              {t('exam.keepPracticing', 'Cố gắng tập luyện đều đặn để cải thiện thị lực thêm nhé!')}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/portal/exam')}
          sx={{
            py: 1.5,
            px: 4,
            borderRadius: 2,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <BarChart sx={{ mr: 1 }} /> {t('exam.viewSchedule', 'Xem lịch kiểm tra')}
        </Button>

        <Button
          variant="outlined"
          size="large"
          onClick={() => navigate('/portal/exercises')}
          sx={{
            py: 1.5,
            px: 4,
            borderRadius: 2,
            fontWeight: 600,
            '&:hover': {
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <SportsEsports sx={{ mr: 1 }} /> {t('exam.visionExercises', 'Bài tập thị lực')}
        </Button>
      </Box>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.4);
            }
            70% {
              transform: scale(1.05);
              box-shadow: 0 0 0 15px rgba(25, 118, 210, 0);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default ResultStep;
