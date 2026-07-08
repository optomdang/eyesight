/**
 * ExerciseTimer Component
 * Reusable timer component for exercises with countdown functionality
 */

import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

export interface ExerciseTimerProps {
  duration?: number; // Total duration in seconds
  remaining?: number | null; // Remaining time in milliseconds
  onTimeUp?: () => void;
  variant?: 'compact' | 'full';
  showLabel?: boolean;
  warningThreshold?: number; // Show warning when remaining time is below this (in seconds)
}

const ExerciseTimer: React.FC<ExerciseTimerProps> = ({
  duration,
  remaining,
  onTimeUp,
  variant = 'compact',
  showLabel = true,
  warningThreshold = 60,
}) => {
  const [localRemaining, setLocalRemaining] = useState<number | null>(remaining || null);

  // Update local state when prop changes
  useEffect(() => {
    setLocalRemaining(remaining || null);
  }, [remaining]);

  // Handle countdown and time up
  useEffect(() => {
    if (localRemaining === null || localRemaining <= 0) return;

    const interval = setInterval(() => {
      setLocalRemaining((prev) => {
        if (prev === null || prev <= 1000) {
          if (onTimeUp) onTimeUp();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [localRemaining, onTimeUp]);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (): string => {
    if (localRemaining === null) return 'text.primary';
    const remainingSeconds = localRemaining / 1000;
    if (remainingSeconds <= warningThreshold) return 'error.main';
    return 'success.main';
  };

  const getTimeDisplay = (): string => {
    if (localRemaining === null) {
      return duration ? formatTime(duration * 1000) : '--:--';
    }
    return formatTime(localRemaining);
  };

  if (variant === 'compact') {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant="h6"
          sx={{
            color: getTimeColor(),
            fontWeight: 'bold',
          }}
        >
          {getTimeDisplay()}
        </Typography>
        {showLabel && (
          <Typography variant="caption" color="text.secondary">
            {localRemaining !== null ? 'Còn lại' : 'Thời gian'}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="h4" sx={{ color: getTimeColor(), fontWeight: 'bold' }}>
        {getTimeDisplay()}
      </Typography>
      {showLabel && (
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          {localRemaining !== null ? 'Thời gian còn lại' : 'Tổng thời gian'}
        </Typography>
      )}
      {duration && localRemaining !== null && (
        <Box sx={{ mt: 1, width: '100%' }}>
          <Box
            sx={{
              height: 4,
              backgroundColor: 'grey.300',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                backgroundColor: getTimeColor(),
                width: `${(localRemaining / (duration * 1000)) * 100}%`,
                transition: 'width 1s linear',
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ExerciseTimer;
