import React from 'react';
import { Box } from '@mui/material';
import Game2048InstructionStep from 'src/components/exercises/portal/Game2048InstructionStep';

/**
 * Dev-only preview for the 2048 pre-game instruction screen (no auth / assignment).
 * Open: /dev/2048-guide
 */
const Game2048GuidePreviewPage: React.FC = () => (
  <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <Game2048InstructionStep
      trainingEye="left"
      requiresAnaglyphGlasses={false}
      onStart={() => {
        window.alert('Preview only — nút Bắt đầu không vào game thật.');
      }}
    />
  </Box>
);

export default Game2048GuidePreviewPage;
