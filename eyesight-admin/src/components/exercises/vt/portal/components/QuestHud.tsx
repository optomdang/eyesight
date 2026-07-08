/**
 * VT Quest — In-game HUD overlay (stars, coins, energy bar, timer).
 * Shown during trials and on the world map.
 */

import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { COPY } from '../../gamification/copy.vi';
import { isStreakMilestone, thresholdToPowerLevel } from '../../gamification/rewards';
import type { VtSessionState, VtWorld } from 'src/types/core/vtQuest';

interface QuestHudProps {
  session: VtSessionState;
  timeRemainingMs: number | null;
  currentWorld: VtWorld;
  latestThreshold: number | null;
  onPauseRequest: () => void;
  onStopRequest: () => void;
  pauseDisabled?: boolean;
  stopDisabled?: boolean;
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const QuestHud: React.FC<QuestHudProps> = ({
  session,
  timeRemainingMs,
  currentWorld,
  latestThreshold,
  onPauseRequest,
  onStopRequest,
  pauseDisabled = false,
  stopDisabled = false,
}) => {
  const powerLevel = thresholdToPowerLevel(latestThreshold, currentWorld);
  const comboMilestone = session.currentCombo > 0 && isStreakMilestone(session.currentCombo);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        pointerEvents: 'auto',
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'linear-gradient(180deg, rgba(15,10,40,0.92) 0%, transparent 100%)',
      }}
    >
      {/* Stars */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 60 }}>
        <Typography sx={{ fontSize: 18 }}>⭐</Typography>
        <Typography variant="subtitle2" sx={{ color: '#FFD93D', fontWeight: 700 }}>
          {session.totalStars}
        </Typography>
      </Box>

      {/* Coins */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 60 }}>
        <Typography sx={{ fontSize: 18 }}>🪙</Typography>
        <Typography variant="subtitle2" sx={{ color: '#FFD93D', fontWeight: 700 }}>
          {session.totalCoins}
        </Typography>
      </Box>

      {/* Energy bar */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" sx={{ color: '#4ECDC4', fontWeight: 600, fontSize: 10 }}>
          {COPY.powerLabel}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={powerLevel}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.1)',
            '& .MuiLinearProgress-bar': {
              bgcolor: powerLevel > 60 ? '#4ECDC4' : powerLevel > 30 ? '#FFD93D' : '#FF6B6B',
              borderRadius: 4,
            },
          }}
        />
      </Box>

      {/* Combo indicator */}
      {session.currentCombo >= 3 && (
        <Typography
          sx={{
            color: comboMilestone ? '#FF6B6B' : '#FFD93D',
            fontWeight: 800,
            fontSize: comboMilestone ? 14 : 13,
            animation: 'pulse 0.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.7, transform: 'scale(1.15)' },
            },
          }}
        >
          {comboMilestone
            ? COPY.streakMilestoneHud(session.currentCombo)
            : COPY.comboLabel(session.currentCombo)}
        </Typography>
      )}

      {/* Timer */}
      {timeRemainingMs !== null && (
        <Typography
          variant="subtitle2"
          sx={{
            color: timeRemainingMs < 60000 ? '#FF6B6B' : 'rgba(255,255,255,0.8)',
            fontWeight: 700,
            minWidth: 40,
            textAlign: 'right',
          }}
        >
          {formatTime(timeRemainingMs)}
        </Typography>
      )}

      {/* Stop training — end session early and save results */}
      <Box
        component="button"
        type="button"
        disabled={stopDisabled}
        onClick={(e) => {
          e.stopPropagation();
          onStopRequest();
        }}
        sx={{
          background: 'rgba(255,107,107,0.2)',
          border: '1px solid rgba(255,107,107,0.55)',
          borderRadius: 2,
          px: 1.25,
          py: 0.5,
          color: '#FF6B6B',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          '&:hover': { background: 'rgba(255,107,107,0.32)' },
          '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
        }}
      >
        {stopDisabled ? '…' : COPY.stopTrainingButton}
      </Box>

      {/* Pause — save progress and continue later */}
      <Box
        component="button"
        type="button"
        disabled={pauseDisabled}
        onClick={(e) => {
          e.stopPropagation();
          onPauseRequest();
        }}
        sx={{
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: 2,
          px: 1.5,
          py: 0.5,
          color: 'white',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          '&:hover': { background: 'rgba(255,255,255,0.25)' },
          '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
        }}
        title="Tạm dừng"
      >
        {pauseDisabled ? '…' : '⏸'}
      </Box>
    </Box>
  );
};

export default QuestHud;
