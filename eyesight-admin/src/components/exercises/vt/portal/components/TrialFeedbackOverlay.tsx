/**
 * VT Quest — trial feedback banner (correct / wrong animations).
 * Renders in the lower chrome band — does not cover the stimulus canvas.
 */

import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { COPY } from '../../gamification/copy.vi';
import type { TrialFeedbackState } from '../../gamification/useTrialFeedback';
import FloatingScorePopup from './FloatingScorePopup';
import type { VtWorld } from 'src/types/core/vtQuest';

const WORLD_ACCENT: Record<VtWorld, string> = {
  gabor: '#FFD93D',
  vernier: '#4ECDC4',
  crowding: '#a29bfe',
  stereopsis: '#E17055',
};

interface TrialFeedbackOverlayProps {
  feedback: TrialFeedbackState;
  world: VtWorld;
}

/** Sparkles burst upward from the banner (away from stimulus above). */
const SPARKLE_OFFSETS = [
  { x: -90, y: -55, delay: 0 },
  { x: 80, y: -48, delay: 0.05 },
  { x: -50, y: -72, delay: 0.08 },
  { x: 55, y: -65, delay: 0.03 },
  { x: 0, y: -85, delay: 0.1 },
  { x: -30, y: -40, delay: 0.06 },
  { x: 35, y: -38, delay: 0.04 },
  { x: -70, y: -30, delay: 0.07 },
];

const TrialFeedbackOverlay: React.FC<TrialFeedbackOverlayProps> = ({ feedback, world }) => {
  const accent = WORLD_ACCENT[world];
  const showCombo = feedback.correct && feedback.comboAfter >= 3 && !feedback.isStreakMilestone;
  const showStreakInBanner = feedback.correct && feedback.isStreakMilestone;

  const sparkles = useMemo(
    () =>
      SPARKLE_OFFSETS.map((s, i) => ({
        ...s,
        id: `${feedback.id}-${i}`,
        size: 14 + (i % 3) * 6,
      })),
    [feedback.id]
  );

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <FloatingScorePopup feedback={feedback} />

      {/* Edge-only flash — stimulus center stays visible */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: feedback.correct
            ? 'linear-gradient(180deg, rgba(78,205,196,0.22) 0%, transparent 28%, transparent 62%, rgba(78,205,196,0.12) 100%)'
            : 'linear-gradient(180deg, rgba(255,107,107,0.18) 0%, transparent 28%, transparent 62%, rgba(255,107,107,0.1) 100%)',
          animation: 'vt-flash 0.55s ease-out forwards',
          '@keyframes vt-flash': {
            '0%': { opacity: 0 },
            '25%': { opacity: 1 },
            '100%': { opacity: 0 },
          },
        }}
      />

      {!feedback.correct && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            animation: 'vt-shake 0.45s ease-in-out',
            '@keyframes vt-shake': {
              '0%, 100%': { transform: 'translateX(0)' },
              '20%': { transform: 'translateX(-6px)' },
              '40%': { transform: 'translateX(6px)' },
              '60%': { transform: 'translateX(-4px)' },
              '80%': { transform: 'translateX(4px)' },
            },
          }}
        />
      )}

      {/* Banner sits above response buttons, below stimulus */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: { xs: 84, sm: 92 },
          display: 'flex',
          justifyContent: 'center',
          px: 2,
          zIndex: 2,
        }}
      >
        <Box sx={{ position: 'relative', maxWidth: 420, width: '100%' }}>
          {feedback.correct &&
            sparkles.map((s, i) => (
              <Box
                key={s.id}
                sx={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '50%',
                  fontSize: s.size,
                  opacity: 0,
                  animation: `vt-sparkle 0.75s ease-out ${s.delay}s forwards`,
                  '@keyframes vt-sparkle': {
                    '0%': {
                      opacity: 0,
                      transform: 'translate(-50%, 0) scale(0.3) rotate(0deg)',
                    },
                    '30%': { opacity: 1 },
                    '100%': {
                      opacity: 0,
                      transform: `translate(calc(-50% + ${s.x}px), ${s.y}px) scale(1.2) rotate(180deg)`,
                    },
                  },
                }}
              >
                {i % 2 === 0 ? '✨' : '⭐'}
              </Box>
            ))}

          <Box
            sx={{
              position: 'relative',
              textAlign: 'center',
              px: 2.5,
              py: 1.5,
              borderRadius: 3,
              bgcolor: feedback.correct ? 'rgba(15,10,40,0.88)' : 'rgba(40,10,20,0.88)',
              border: `2px solid ${feedback.correct ? accent : '#FF6B6B'}`,
              boxShadow: feedback.correct
                ? `0 0 32px ${accent}77, 0 6px 24px rgba(0,0,0,0.45)`
                : '0 0 20px rgba(255,107,107,0.35)',
              animation: 'vt-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              '@keyframes vt-pop': {
                '0%': { opacity: 0, transform: 'scale(0.85) translateY(16px)' },
                '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
              },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 22, sm: 28 },
                fontWeight: 900,
                color: feedback.correct ? accent : '#FF8A8A',
                textShadow: feedback.correct
                  ? `0 0 16px ${accent}`
                  : '0 0 10px rgba(255,107,107,0.5)',
                lineHeight: 1.2,
              }}
            >
              {feedback.correct ? COPY.encourageCorrect : COPY.encourageAfterWrong}
            </Typography>

            {showStreakInBanner && (
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 17,
                  fontWeight: 900,
                  color: '#FFD93D',
                  animation: 'vt-combo-pulse 0.6s ease-in-out infinite',
                  '@keyframes vt-combo-pulse': {
                    '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                    '50%': { transform: 'scale(1.08)', opacity: 0.9 },
                  },
                }}
              >
                {COPY.streakBonusLabel(feedback.comboAfter, feedback.streakBonus)}
              </Typography>
            )}

            {showCombo && (
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#FFD93D',
                  animation: 'vt-combo-pulse 0.6s ease-in-out infinite',
                  '@keyframes vt-combo-pulse': {
                    '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                    '50%': { transform: 'scale(1.06)', opacity: 0.85 },
                  },
                }}
              >
                {COPY.comboLabel(feedback.comboAfter)}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TrialFeedbackOverlay;
