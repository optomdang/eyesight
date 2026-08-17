import React from 'react';
import { Box } from '@mui/material';
import FarAcuityInstructionStep from 'src/components/exercises/far-acuity/portal/FarAcuityInstructionStep';

/** Dev-only preview for the VAC pre-game instruction screen. */
const FarAcuityGuidePreviewPage: React.FC = () => (
  <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <FarAcuityInstructionStep
      trainingEye="left"
      requiresAnaglyphGlasses={false}
      onStart={() => {
        window.alert('Preview only — nút Bắt đầu chưa vào bài tập thật.');
      }}
    />
  </Box>
);

export default FarAcuityGuidePreviewPage;
