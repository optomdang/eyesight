import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';

import { use2048Exercise } from 'src/hooks/exercises/use2048Exercise';
import Game2048Results from './Game2048Results';
import { Game2048Board } from '../shared';

interface Game2048ComponentProps {
  exerciseId?: number;
  onGameComplete?: (result: unknown) => void;
  hideSettings?: boolean;
}

const Game2048Component: React.FC<Game2048ComponentProps> = ({ exerciseId, onGameComplete }) => {
  const [sessionDuration, setSessionDuration] = useState(0);
  const [gameState, setGameState] = useState({
    score: 0,
    moves: 0,
    startTime: null as number | null,
    endTime: null as number | null,
    restartCount: 0,
  });

  const {
    gameState: hookGameState,
    isLoading: loading,
    error,
  } = use2048Exercise({
    mode: 'standalone', // Admin preview mode - no API calls
    onGameComplete,
  });

  // Handle game state changes from Game2048Board
  const handleGameStateChange = (newGameState: typeof gameState) => {
    setGameState(newGameState);
  };

  // Timer to track session duration only (for admin preview)
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (gameState.startTime && !gameState.endTime) {
      setSessionDuration(0);
      timer = setInterval(() => {
        setSessionDuration(Date.now() - gameState.startTime!);
      }, 1000);
    } else if (!gameState.startTime) {
      setSessionDuration(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState.startTime, gameState.endTime]);

  return (
    <LoadingBoundary loading={loading} height="400px">
      {error ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <Typography variant="h6" color="error">
            {error}
          </Typography>
        </Box>
      ) : !hookGameState ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <Typography variant="h6">Đang khởi tạo bài tập 2048...</Typography>
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            maxWidth: 800,
            margin: '0 auto',
          }}
        >
          {/* Exercise Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Bài tập 2048
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Trò chơi 2048 giúp luyện tập thị lực và tập trung
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Hướng dẫn:</strong> Sử dụng phím mũi tên để di chuyển các ô số. Kết hợp các
                ô có cùng số để tạo ra ô có giá trị lớn hơn. Mục tiêu là đạt được ô 2048.
              </Typography>
            </CardContent>
          </Card>

          {/* Game Session Statistics */}
          <Game2048Results gameState={gameState} sessionDuration={sessionDuration} />

          {/* Game Board */}
          <Game2048Board
            exerciseId={exerciseId}
            onGameComplete={onGameComplete}
            onGameStateChange={handleGameStateChange}
          />
        </Box>
      )}
    </LoadingBoundary>
  );
};

export default Game2048Component;
