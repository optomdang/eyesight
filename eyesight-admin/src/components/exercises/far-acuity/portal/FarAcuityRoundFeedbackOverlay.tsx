/**
 * Round feedback overlay — VT Quest style (banner + top-left floating coins).
 */

import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { COPY } from 'src/components/exercises/vt/gamification/copy.vi';
import type { RoundFeedbackState } from '../gamification/useFarAcuityGamification';

const ACCENT = '#4ECDC4';

const SPARKLE_OFFSETS = [
  { x: -90, y: -55, delay: 0 },
  { x: 80, y: -48, delay: 0.05 },
  { x: -50, y: -72, delay: 0.08 },
  { x: 55, y: -65, delay: 0.03 },
  { x: 0, y: -85, delay: 0.1 },
];

interface FarAcuityRoundFeedbackOverlayProps {
  feedback: RoundFeedbackState;
  /** Offset below top HUD (px) */
  hudOffset?: number;
}

const FarAcuityRoundFeedbackOverlay: React.FC<FarAcuityRoundFeedbackOverlayProps> = ({
  feedback,
  hudOffset = 72,
}) => {
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
      {/* Floating +coins — always top-left per product spec */}
      {feedback.correct && feedback.pointsEarned > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: hudOffset,
            left: { xs: 12, sm: 20 },
            zIndex: 55,
            animation: 'fa-score-float 1.1s ease-out forwards',
            '@keyframes fa-score-float': {
              '0%': { opacity: 0, transform: 'translateY(12px) scale(0.6)' },
              '15%': { opacity: 1, transform: 'translateY(0) scale(1.15)' },
              '35%': { transform: 'translateY(-4px) scale(1)' },
              '100%': { opacity: 0, transform: 'translateY(-48px) scale(0.95)' },
            },
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
                mt: 0.25,
                fontSize: { xs: 12, sm: 14 },
                fontWeight: 800,
                color: '#FFD93D',
                bgcolor: 'rgba(15,10,40,0.85)',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                border: '1px solid rgba(255,217,61,0.5)',
              }}
            >
              {COPY.streakBonusLabel(feedback.comboAfter, feedback.streakBonus)}
            </Typography>
          )}
        </Box>
      )}

      {/* Edge flash */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: feedback.correct
            ? 'linear-gradient(180deg, rgba(78,205,196,0.18) 0%, transparent 28%, transparent 62%, rgba(78,205,196,0.1) 100%)'
            : 'linear-gradient(180deg, rgba(255,107,107,0.15) 0%, transparent 28%, transparent 62%, rgba(255,107,107,0.08) 100%)',
          animation: 'fa-flash 0.55s ease-out forwards',
          '@keyframes fa-flash': {
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
            animation: 'fa-shake 0.45s ease-in-out',
            '@keyframes fa-shake': {
              '0%, 100%': { transform: 'translateX(0)' },
              '20%': { transform: 'translateX(-6px)' },
              '40%': { transform: 'translateX(6px)' },
              '60%': { transform: 'translateX(-4px)' },
              '80%': { transform: 'translateX(4px)' },
            },
          }}
        />
      )}

      {/* Encouragement banner above input bar */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: { xs: 84, sm: 92 },
          display: 'flex',
          justifyContent: 'center',
          px: 2,
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
                  animation: `fa-sparkle 0.75s ease-out ${s.delay}s forwards`,
                  '@keyframes fa-sparkle': {
                    '0%': { opacity: 0, transform: 'translate(-50%, 0) scale(0.3)' },
                    '30%': { opacity: 1 },
                    '100%': {
                      opacity: 0,
                      transform: `translate(calc(-50% + ${s.x}px), ${s.y}px) scale(1.2)`,
                    },
                  },
                }}
              >
                {i % 2 === 0 ? '✨' : '⭐'}
              </Box>
            ))}

          <Box
            sx={{
              textAlign: 'center',
              px: 2.5,
              py: 1.5,
              borderRadius: 3,
              bgcolor: feedback.correct ? 'rgba(15,10,40,0.88)' : 'rgba(40,10,20,0.88)',
              border: `2px solid ${feedback.correct ? ACCENT : '#FF6B6B'}`,
              boxShadow: feedback.correct
                ? `0 0 32px ${ACCENT}77, 0 6px 24px rgba(0,0,0,0.45)`
                : '0 0 20px rgba(255,107,107,0.35)',
              animation: 'fa-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              '@keyframes fa-pop': {
                '0%': { opacity: 0, transform: 'scale(0.85) translateY(16px)' },
                '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
              },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 22, sm: 28 },
                fontWeight: 900,
                color: feedback.correct ? ACCENT : '#FF8A8A',
                lineHeight: 1.2,
              }}
            >
              {feedback.correct ? COPY.encourageCorrect : COPY.encourageAfterWrong}
            </Typography>

            {feedback.correct && (
              <Typography variant="body2" sx={{ mt: 0.5, color: 'rgba(255,255,255,0.85)' }}>
                {feedback.correctCount}/5 chữ đúng
              </Typography>
            )}

            {showStreakInBanner && (
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 17,
                  fontWeight: 900,
                  color: '#FFD93D',
                }}
              >
                {COPY.streakBonusLabel(feedback.comboAfter, feedback.streakBonus)}
              </Typography>
            )}

            {showCombo && (
              <Typography sx={{ mt: 0.5, fontSize: 16, fontWeight: 800, color: '#FFD93D' }}>
                {COPY.comboLabel(feedback.comboAfter)}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default FarAcuityRoundFeedbackOverlay;
