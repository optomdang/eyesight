/**
 * Shown inside TrialScreen when clinical stimulus cannot fit the viewport.
 */

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import MonitorIcon from '@mui/icons-material/Monitor';
import { COPY } from '../../gamification/copy.vi';
import type { VtWorld } from 'src/types/core/vtQuest';

const WORLD_LABEL: Record<VtWorld, string> = {
  gabor: 'Gabor',
  vernier: 'Vernier',
  crowding: 'Crowding (đám đông)',
  stereopsis: 'Stereopsis (RDS)',
};

interface TrialScreenFitWarningProps {
  world: VtWorld;
  requiredWidth: number;
  requiredHeight: number;
  letterHeightPx?: number;
  screenRecommendation?: string | null;
  onExit?: () => void;
  exitDisabled?: boolean;
}

const TrialScreenFitWarning: React.FC<TrialScreenFitWarningProps> = ({
  world,
  requiredWidth,
  requiredHeight,
  letterHeightPx,
  screenRecommendation,
  onExit,
  exitDisabled = false,
}) => (
  <Box
    sx={{
      m: 'auto',
      maxWidth: 480,
      px: 3,
      py: 3,
      textAlign: 'center',
      borderRadius: 3,
      border: '1px solid rgba(255,107,107,0.45)',
      bgcolor: 'rgba(40,10,20,0.75)',
      boxShadow: '0 0 32px rgba(255,107,107,0.15)',
    }}
  >
    <MonitorIcon sx={{ fontSize: 40, color: '#FF8A8A', mb: 1 }} />
    <Typography variant="h6" sx={{ color: '#FF8A8A', fontWeight: 800, mb: 1 }}>
      {COPY.screenTooSmallTitle}
    </Typography>
    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mb: 1.5, lineHeight: 1.55 }}>
      {COPY.screenTooSmallMessage}
    </Typography>
    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
      {COPY.screenTooSmallHint(requiredWidth, requiredHeight)}
    </Typography>
    {letterHeightPx != null && letterHeightPx > 0 && (
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', display: 'block', mb: 1 }}>
        Cỡ chữ lâm sàng theo cấu hình: ~{letterHeightPx}px ({WORLD_LABEL[world]}).
      </Typography>
    )}
    {screenRecommendation && (
      <Typography
        variant="caption"
        sx={{
          color: '#4ECDC4',
          display: 'block',
          mt: 1,
          fontWeight: 600,
        }}
      >
        Gợi ý: {screenRecommendation}
      </Typography>
    )}
    {onExit && (
      <Button
        variant="outlined"
        size="small"
        disabled={exitDisabled}
        onClick={onExit}
        sx={{
          mt: 2,
          color: 'rgba(255,255,255,0.9)',
          borderColor: 'rgba(255,255,255,0.35)',
          '&:hover': { borderColor: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.08)' },
        }}
      >
        Thoát bài tập
      </Button>
    )}
  </Box>
);

export default TrialScreenFitWarning;
