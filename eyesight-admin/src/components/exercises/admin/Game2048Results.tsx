import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

interface Game2048ResultsProps {
  gameState: {
    score: number;
    moves: number;
    startTime: number | null;
    endTime: number | null;
    restartCount: number;
  };
  sessionDuration: number; // in milliseconds
  showTitle?: boolean;
  compact?: boolean; // For different display modes
}

const Game2048Results: React.FC<Game2048ResultsProps> = ({
  gameState,
  sessionDuration,
  showTitle = true,
  compact = false,
}) => {
  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatStartTime = (startTime: number | null): string => {
    if (!startTime) return 'Chưa bắt đầu';
    return new Date(startTime).toLocaleTimeString();
  };

  if (compact) {
    // Compact mode for admin or small displays
    return (
      <Box display="flex" gap={2} flexWrap="wrap" sx={{ fontSize: '0.875rem' }}>
        <Typography variant="body2">
          <strong>Điểm:</strong> {gameState.score}
        </Typography>
        <Typography variant="body2">
          <strong>Bước:</strong> {gameState.moves}
        </Typography>
        <Typography variant="body2">
          <strong>Thời gian:</strong> {formatDuration(sessionDuration)}
        </Typography>
        <Typography variant="body2">
          <strong>Restart:</strong> {gameState.restartCount}
        </Typography>
      </Box>
    );
  }

  // Full mode for portal display
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {showTitle && (
          <Typography variant="h6" gutterBottom>
            Thông tin phiên chơi
          </Typography>
        )}
        <Box display="flex" gap={3} flexWrap="wrap">
          <Typography variant="body2">
            <strong>Thời gian chơi:</strong> {formatDuration(sessionDuration)}
          </Typography>
          <Typography variant="body2">
            <strong>Số bước di chuyển:</strong> {gameState.moves}
          </Typography>
          <Typography variant="body2">
            <strong>Điểm hiện tại:</strong> {gameState.score}
          </Typography>
          <Typography variant="body2">
            <strong>Số lần bắt đầu lại:</strong> {gameState.restartCount}
          </Typography>
          {gameState.startTime && (
            <Typography variant="body2">
              <strong>Bắt đầu lúc:</strong> {formatStartTime(gameState.startTime)}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default Game2048Results;
