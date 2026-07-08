/**
 * VT Quest — Stage Result Overlay.
 * Shown after each staircase block completes: stars, coins, power level.
 */

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { COPY } from '../../gamification/copy.vi';
import { thresholdToPowerLevel } from '../../gamification/rewards';
import type { VtStageResult } from 'src/types/core/vtQuest';

interface StageResultOverlayProps {
  result: VtStageResult;
  onContinue: () => void;
}

const StarRow: React.FC<{ stars: 0 | 1 | 2 | 3 }> = ({ stars }) => (
  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', my: 2 }}>
    {[1, 2, 3].map((s) => (
      <Typography
        key={s}
        sx={{
          fontSize: 40,
          opacity: s <= stars ? 1 : 0.2,
          transition: 'all 0.4s ease',
          transform: s <= stars ? 'scale(1)' : 'scale(0.7)',
          animation: s <= stars ? `starPop ${0.2 * s}s ease backwards` : 'none',
          '@keyframes starPop': {
            '0%': { transform: 'scale(0)', opacity: 0 },
            '80%': { transform: 'scale(1.3)' },
            '100%': { transform: 'scale(1)', opacity: 1 },
          },
        }}
      >
        ⭐
      </Typography>
    ))}
  </Box>
);

const StageResultOverlay: React.FC<StageResultOverlayProps> = ({ result, onContinue }) => {
  const powerLevel = thresholdToPowerLevel(result.threshold, result.world);

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(108,92,231,0.5) 0%, rgba(10,5,32,0.97) 70%)',
        zIndex: 20,
        px: 3,
        animation: 'fadeIn 0.3s ease',
        '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
      }}
    >
      <Typography
        variant="h5"
        sx={{ color: 'white', fontWeight: 800, mb: 0.5, textAlign: 'center' }}
      >
        {COPY.stageComplete}
      </Typography>

      <StarRow stars={result.stars} />

      <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#FFD93D', fontWeight: 700 }}>
          {COPY.coinsEarned(result.coinsEarned)}
        </Typography>
      </Box>

      {/* Power bar */}
      <Box sx={{ width: '100%', maxWidth: 300, mb: 3 }}>
        <Typography
          variant="caption"
          sx={{ color: '#4ECDC4', fontWeight: 600, display: 'block', mb: 0.5, textAlign: 'center' }}
        >
          {COPY.powerLabel}: {powerLevel}%
        </Typography>
        <Box
          sx={{
            height: 12,
            borderRadius: 6,
            bgcolor: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${powerLevel}%`,
              bgcolor: powerLevel > 60 ? '#4ECDC4' : powerLevel > 30 ? '#FFD93D' : '#FF6B6B',
              borderRadius: 6,
              transition: 'width 1s ease',
            }}
          />
        </Box>
      </Box>

      <Button
        variant="contained"
        onClick={onContinue}
        sx={{
          bgcolor: '#6C5CE7',
          color: 'white',
          fontWeight: 700,
          px: 5,
          py: 1.5,
          borderRadius: 3,
          fontSize: 15,
          '&:hover': { bgcolor: '#5a4bd1' },
        }}
      >
        {COPY.continueButton} →
      </Button>
    </Box>
  );
};

export default StageResultOverlay;
