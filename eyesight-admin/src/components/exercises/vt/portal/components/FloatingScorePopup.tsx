/**
 * Floating +coins popup at top corner (same side as player tap).
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { COPY } from '../../gamification/copy.vi';
import type { TrialFeedbackState } from '../../gamification/useTrialFeedback';

interface FloatingScorePopupProps {
  feedback: TrialFeedbackState;
}

const FloatingScorePopup: React.FC<FloatingScorePopupProps> = ({ feedback }) => {
  if (!feedback.correct || feedback.pointsEarned <= 0) return null;

  const isLeft = feedback.chosenSide === 'left';

  return (
    <Box
      sx={{
        position: 'absolute',
        top: { xs: 72, sm: 80 },
        ...(isLeft ? { left: { xs: 12, sm: 20 } } : { right: { xs: 12, sm: 20 } }),
        zIndex: 55,
        pointerEvents: 'none',
        animation: 'vt-score-float 1.1s ease-out forwards',
        '@keyframes vt-score-float': {
          '0%': { opacity: 0, transform: 'translateY(12px) scale(0.6)' },
          '15%': { opacity: 1, transform: 'translateY(0) scale(1.15)' },
          '35%': { transform: 'translateY(-4px) scale(1)' },
          '100%': { opacity: 0, transform: 'translateY(-48px) scale(0.95)' },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isLeft ? 'flex-start' : 'flex-end',
          gap: 0.25,
        }}
      >
        <Typography
          sx={{
            fontSize: feedback.isStreakMilestone ? { xs: 28, sm: 34 } : { xs: 22, sm: 26 },
            fontWeight: 900,
            color: feedback.isStreakMilestone ? '#FFD93D' : '#4ECDC4',
            textShadow: feedback.isStreakMilestone
              ? '0 0 20px rgba(255,217,61,0.9), 0 2px 8px rgba(0,0,0,0.5)'
              : '0 0 12px rgba(78,205,196,0.8), 0 2px 6px rgba(0,0,0,0.4)',
            lineHeight: 1,
          }}
        >
          +{feedback.pointsEarned} 🪙
        </Typography>

        {feedback.isStreakMilestone && (
          <Typography
            sx={{
              fontSize: { xs: 12, sm: 14 },
              fontWeight: 800,
              color: '#FFD93D',
              bgcolor: 'rgba(15,10,40,0.85)',
              px: 1,
              py: 0.25,
              borderRadius: 1,
              border: '1px solid rgba(255,217,61,0.5)',
              whiteSpace: 'nowrap',
            }}
          >
            {COPY.streakBonusLabel(feedback.comboAfter, feedback.streakBonus)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default FloatingScorePopup;
