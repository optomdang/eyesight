import React from 'react';
import { Card, CardContent, Box, Typography, Button, Chip, Avatar } from '@mui/material';
import {
  PlayArrow,
  CheckCircle,
  Schedule,
  AccessTime,
  Visibility,
  Contrast,
  ThreeDRotation,
} from '@mui/icons-material';
import { useTranslation } from 'src/hooks/useTranslation';
import dayjs from 'dayjs';
import {
  FrequencyType,
  ExamType,
  ExamStatus,
  getStatusInfo,
  getExamTypeConfig,
} from 'src/utils/examUtils';

// Types
interface IndividualExamCardProps {
  examType: ExamType;
  frequency: FrequencyType;
  lastExamDate?: string;
  nextDueDate?: string;
  status: ExamStatus;
  onStartExam: (examType: string) => void;
  isEnabled: boolean;
}

// Local helper function to get exam icon (keeping this local as it returns JSX)
const getExamIcon = (examType: ExamType) => {
  const config = getExamTypeConfig(examType);
  switch (examType) {
    case 'far':
      return <Visibility sx={{ color: config.color }} />;
    case 'near':
      return <Visibility sx={{ color: config.color }} />;
    case 'contrast':
      return <Contrast sx={{ color: config.color }} />;
    case 'stereopsis':
      return <ThreeDRotation sx={{ color: config.color }} />;
    default:
      return <Visibility />;
  }
};

const getNextCycleStart = (cycleStartDate: string, frequency: FrequencyType): string => {
  const start = dayjs(cycleStartDate);
  switch (frequency) {
    case 'daily':
      return start.add(1, 'day').toISOString();
    case 'weekly':
      return start.add(1, 'week').toISOString();
    case 'monthly':
      return start.add(1, 'month').toISOString();
    case 'quarterly':
      return start.add(3, 'month').toISOString();
    case 'yearly':
      return start.add(1, 'year').toISOString();
    default:
      return start.add(1, 'week').toISOString();
  }
};

const IndividualExamCard: React.FC<IndividualExamCardProps> = ({
  examType,
  frequency,
  lastExamDate,
  nextDueDate,
  status,
  onStartExam,
  isEnabled,
}) => {
  const { t } = useTranslation();
  const statusInfo = getStatusInfo(status);
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
  const frequencyLabel = t('exercise.frequency', 'Frequency');
  const frequencyValue = t(`exercise.frequencies.${frequency}`, frequency);
  const statusLabel =
    status === 'completed'
      ? t('exam.statusCompleted', 'Completed')
      : t('exam.statusIncomplete', 'Not completed');
  // Status: incomplete (warning) | completed (success)
  const statusIcon = status === 'completed' ? <CheckCircle /> : <PlayArrow />;

  if (!isEnabled) {
    return null; // Don't render disabled exams
  }

  return (
    <Card
      sx={{
        mb: 1.5,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderRadius: 1.5,
        border: status === 'incomplete' ? '1px solid' : '1px solid',
        borderColor: status === 'incomplete' ? 'warning.main' : 'divider',
        bgcolor: 'background.paper',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Left side - Exam info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: getExamTypeConfig(examType).bgColor || '#f5f5f5',
                width: 48,
                height: 48,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              {getExamIcon(examType)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25, lineHeight: 1.2 }}>
                {examTitle}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.25 }}
              >
                {frequencyLabel}: {frequencyValue}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {lastExamDate ? (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}
                    >
                      <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                      {t('exam.completedLabel', 'Completed')}:{' '}
                      {dayjs(lastExamDate).format('DD/MM/YYYY HH:mm')}
                    </Typography>
                    {nextDueDate && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}
                      >
                        <Schedule sx={{ fontSize: 14 }} />
                        {t('exam.nextTime', 'Next time')}:{' '}
                        {dayjs(getNextCycleStart(nextDueDate, frequency)).format('DD/MM/YYYY')}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}
                  >
                    <Schedule sx={{ fontSize: 14 }} />
                    {t('exam.executionTime', 'Execution time')}:{' '}
                    {dayjs(nextDueDate || new Date()).format('DD/MM/YYYY')} -{' '}
                    {dayjs(
                      getNextCycleStart(nextDueDate || new Date().toISOString(), frequency)
                    ).format('DD/MM/YYYY')}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Right side - Status and Action */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1.5,
              minWidth: 280,
            }}
          >
            <Chip
              icon={statusIcon}
              label={statusLabel}
              color={statusInfo.color}
              size="medium"
              sx={{
                fontWeight: 500,
                height: 32,
                minWidth: 120,
              }}
            />

            {status === 'incomplete' && (
              <Button
                variant="contained"
                size="medium"
                startIcon={<PlayArrow />}
                onClick={() => onStartExam(examType)}
                sx={{
                  borderRadius: 1,
                  fontSize: '0.875rem',
                  height: 32,
                  px: 2,
                  minWidth: 140,
                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
                  },
                }}
              >
                {t('exam.start', 'Start')}
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default IndividualExamCard;
