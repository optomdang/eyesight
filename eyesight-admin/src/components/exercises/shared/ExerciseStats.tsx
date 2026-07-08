/**
 * ExerciseStats Component
 * Reusable component for displaying exercise statistics
 * Supports both horizontal and vertical layouts
 */

import React from 'react';
import { Box, Typography } from '@mui/material';

export interface ExerciseStatsProps {
  score: number;
  moves: number;
  duration: number; // in seconds
  variant?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ExerciseStats: React.FC<ExerciseStatsProps> = ({
  score,
  moves,
  duration,
  variant = 'horizontal',
  showLabels = true,
  size = 'medium',
}) => {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTypographyVariant = () => {
    switch (size) {
      case 'small':
        return 'body2';
      case 'large':
        return 'h5';
      default:
        return 'h6';
    }
  };

  const getCaptionVariant = () => {
    switch (size) {
      case 'small':
        return 'caption';
      case 'large':
        return 'body2';
      default:
        return 'caption';
    }
  };

  const getGap = () => {
    switch (size) {
      case 'small':
        return 2;
      case 'large':
        return 6;
      default:
        return 4;
    }
  };

  const StatItem: React.FC<{ value: string | number; label: string; color?: string }> = ({
    value,
    label,
    color = 'text.primary',
  }) => (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant={getTypographyVariant()} sx={{ fontWeight: 'bold', color }}>
        {value}
      </Typography>
      {showLabels && (
        <Typography variant={getCaptionVariant()} color="text.secondary">
          {label}
        </Typography>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        gap: getGap(),
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: variant === 'vertical' ? 'column' : 'row',
      }}
    >
      <StatItem value={score} label="Điểm" color="primary.main" />
      <StatItem value={formatDuration(duration)} label="Thời gian" />
      <StatItem value={moves} label="Nước đi" />
    </Box>
  );
};

export default ExerciseStats;
