/**
 * GameHeader Component
 * Extracted from PortalExercise.tsx - displays game statistics and controls
 */

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { GameSession } from 'src/hooks/exercises';

interface GameHeaderProps {
  gameSession: GameSession | null;
  currentTime: number;
  timeRemaining: number | null;
  onEndExercise: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  gameSession,
  currentTime,
  timeRemaining,
  onEndExercise,
}) => {
  if (!gameSession) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        p: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        zIndex: 2100, // Higher than game container
      }}
    >
      {/* Game Stats - Centered */}
      <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {gameSession.maxScore}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Điểm
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {Math.floor((currentTime - gameSession.startTime) / 1000)}s
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Thời gian
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {gameSession.movesCount}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Nước đi
          </Typography>
        </Box>
        {timeRemaining !== null && timeRemaining !== undefined && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h6"
              sx={{
                color: timeRemaining <= 60000 ? 'error.main' : 'success.main',
                fontWeight: 'bold',
              }}
            >
              {Math.floor(timeRemaining / 60000)}:
              {(Math.floor(timeRemaining / 1000) % 60).toString().padStart(2, '0')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Còn lại
            </Typography>
          </Box>
        )}
      </Box>

      {/* Control Button - Positioned absolute right */}
      <Box sx={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
        <Button onClick={onEndExercise} variant="contained" color="error" size="small">
          Kết thúc
        </Button>
      </Box>
    </Box>
  );
};

export default GameHeader;
