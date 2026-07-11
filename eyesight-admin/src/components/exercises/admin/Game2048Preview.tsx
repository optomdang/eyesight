import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import type { ExercisePreviewProps } from 'src/components/exercises/registry';
import { useGame2048Engine } from 'src/hooks/exercises/useGame2048Engine';

/**
 * Game2048Preview Component
 *
 * Admin preview component for Game2048 exercise.
 *
 * Uses the shared useGame2048Engine hook so the preview is a fully INTERACTIVE
 * game (real GameManager + KeyboardInputManager), exactly like the patient
 * experience. The clinician can play with the arrow keys to verify tile
 * sizing/contrast/colors per vision level, screen and distance.
 */
const Game2048Preview: React.FC<ExercisePreviewProps> = ({
  visualSettings,
  dichopticPresentation = null,
}) => {
  const { gameContainerRef, isReady, error } = useGame2048Engine({
    visualSettings,
    dichopticPresentation,
    // Preview is for clinician trial only — no result tracking, clean board.
    enableTracking: false,
    hideUnnecessaryUI: true,
  });

  return (
    <Box sx={{ padding: 4, width: '100%', maxWidth: 760, margin: '0 auto' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 560,
          position: 'relative',
        }}
      >
        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        {!isReady && !error && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Đang khởi tạo bài tập 2048...
            </Typography>
          </Box>
        )}

        {/* Interactive game board. KeyboardInputManager listens on document,
            so arrow keys work once the game is initialized. */}
        <div
          ref={gameContainerRef}
          role="application"
          aria-label="2048 Game Preview"
          tabIndex={0}
          style={{
            width: '100%',
            maxWidth: 500,
            margin: '0 auto',
            outline: 'none',
            visibility: isReady ? 'visible' : 'hidden',
          }}
          onKeyDown={(e) => {
            // Prevent the dialog/page from scrolling when playing.
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
              e.preventDefault();
            }
          }}
        />

        {isReady && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            Dùng các phím mũi tên để di chuyển các ô số.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Game2048Preview;
