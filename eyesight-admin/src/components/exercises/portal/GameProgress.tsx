import React from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import { AccessTime } from '@mui/icons-material';
import type { GameSession } from 'src/hooks/exercises';

interface GameProgressProps {
  gameExecution: GameSession | null;
  currentTime: number;
  timeRemaining?: number | null;
  onEndExercise: () => void;
}

const GameProgress: React.FC<GameProgressProps> = ({
  gameExecution,
  currentTime,
  timeRemaining,
  onEndExercise,
}) => {
  if (!gameExecution) return null;

  // Calculate elapsed time
  const elapsedTime = Math.floor((currentTime - gameExecution.startTime) / 1000);

  // Format time function
  const formatTime = (timeInMs: number) => {
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs / 1000) % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box
      sx={{
        mt: 1,
        mb: 2,
        p: 1.5,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
      }}
    >
      {/* Compact Stats Row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {/* Left: Game Stats */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flex: 1 }}>
          {/* Score */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {gameExecution.maxScore}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Điểm
            </Typography>
          </Box>

          {/* Time Elapsed */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {elapsedTime}s
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Thời gian
            </Typography>
          </Box>

          {/* Moves */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {gameExecution.movesCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Nước đi
            </Typography>
          </Box>

          {/* Countdown Timer - Integrated */}
          {timeRemaining !== null && timeRemaining !== undefined && (
            <Box sx={{ textAlign: 'center' }}>
              <Chip
                icon={<AccessTime />}
                label={formatTime(timeRemaining)}
                color={timeRemaining <= 60000 ? 'error' : 'primary'}
                variant="filled"
                size="small"
                sx={{
                  fontWeight: 'bold',
                  minWidth: 80,
                  '& .MuiChip-label': {
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Còn lại
              </Typography>
            </Box>
          )}
        </Box>

        {/* Right: Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* End Button - Compact */}
          <Button
            variant="outlined"
            color="error"
            onClick={onEndExercise}
            size="small"
            sx={{ px: 2, minWidth: 'auto' }}
          >
            Kết thúc
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default GameProgress;
