/**
 * Compact package-tier chip for patient list (Standard → Ultimate).
 * Cool palette; Pro+ animate, intensity rises with tier. Ultimate = bright lemon.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  resolveTreatmentPackageTierLabel,
  type TreatmentPackageTier,
} from 'src/utils/treatmentPackageTier';

interface TreatmentPackageTierChipProps {
  name?: string | null;
  code?: string | null;
  emptyLabel?: string;
}

type TierFx = {
  fg: string;
  bg: string;
  border: string;
  glow: string;
  glowPeak: string;
  shine: string;
  /** Soft shine sweep only */
  shineMs: number;
  /** Soft box-shadow pulse (0 = off) */
  pulseMs: number;
};

const TIER_STYLE: Record<TreatmentPackageTier, TierFx> = {
  standard: {
    fg: '#E8F4FC',
    bg: 'linear-gradient(135deg, #5B7C99 0%, #7A9BB5 55%, #9BB4C8 100%)',
    border: 'rgba(187, 212, 230, 0.55)',
    glow: '0 2px 8px rgba(91, 124, 153, 0.28)',
    glowPeak: '0 2px 8px rgba(91, 124, 153, 0.28)',
    shine: 'rgba(255,255,255,0.2)',
    shineMs: 0,
    pulseMs: 0,
  },
  pro: {
    fg: '#F0FFFE',
    bg: 'linear-gradient(135deg, #0E8A8A 0%, #14B8A6 48%, #5EEAD4 100%)',
    border: 'rgba(153, 246, 228, 0.75)',
    glow: '0 3px 12px rgba(20, 184, 166, 0.4)',
    glowPeak: '0 3px 14px rgba(20, 184, 166, 0.55)',
    shine: 'rgba(255,255,255,0.42)',
    shineMs: 3400,
    pulseMs: 0,
  },
  ultra: {
    fg: '#F0F7FF',
    bg: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 42%, #38BDF8 100%)',
    border: 'rgba(147, 197, 253, 0.9)',
    glow: '0 4px 14px rgba(37, 99, 235, 0.45), 0 0 14px rgba(56, 189, 248, 0.28)',
    glowPeak: '0 4px 18px rgba(37, 99, 235, 0.65), 0 0 20px rgba(56, 189, 248, 0.45)',
    shine: 'rgba(255,255,255,0.5)',
    shineMs: 2600,
    pulseMs: 2800,
  },
  ultimate: {
    fg: '#1A2E05',
    bg: 'linear-gradient(135deg, #C6F600 0%, #E8FF3D 38%, #F7FF8A 72%, #FCFFE6 100%)',
    border: 'rgba(236, 255, 140, 0.95)',
    glow: '0 4px 18px rgba(198, 246, 0, 0.55), 0 0 22px rgba(232, 255, 61, 0.4)',
    glowPeak: '0 5px 24px rgba(198, 246, 0, 0.8), 0 0 30px rgba(247, 255, 138, 0.6)',
    shine: 'rgba(255,255,255,0.72)',
    shineMs: 1800,
    pulseMs: 2000,
  },
};

export const TreatmentPackageTierChip: React.FC<TreatmentPackageTierChipProps> = ({
  name,
  code,
  emptyLabel = 'Chưa gán gói',
}) => {
  const resolved = resolveTreatmentPackageTierLabel(name, code);

  if (!resolved) {
    return (
      <Typography variant="body2" color="text.secondary" noWrap>
        {emptyLabel}
      </Typography>
    );
  }

  const style = TIER_STYLE[resolved.tier];
  const hasShine = style.shineMs > 0;
  const hasPulse = style.pulseMs > 0;
  const dualShine = resolved.tier === 'ultimate';

  return (
    <Box
      component="span"
      title={name || resolved.label}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 78,
        px: 1.25,
        py: 0.4,
        borderRadius: 999,
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.fg,
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: resolved.tier === 'ultimate' ? 0.55 : 0.35,
        lineHeight: 1.2,
        boxShadow: style.glow,
        overflow: 'hidden',
        textShadow:
          resolved.tier === 'ultimate'
            ? '0 0 8px rgba(255,255,255,0.55)'
            : resolved.tier === 'standard'
              ? 'none'
              : '0 1px 2px rgba(0,20,40,0.28)',
        '@keyframes pkgShine': {
          '0%': { transform: 'translateX(-130%) skewX(-18deg)' },
          '100%': { transform: 'translateX(230%) skewX(-18deg)' },
        },
        '@keyframes pkgShineRev': {
          '0%': { transform: 'translateX(230%) skewX(-18deg)' },
          '100%': { transform: 'translateX(-130%) skewX(-18deg)' },
        },
        '@keyframes pkgPulse': {
          '0%, 100%': { boxShadow: style.glow },
          '50%': { boxShadow: style.glowPeak },
        },
        animation: hasPulse ? `pkgPulse ${style.pulseMs}ms ease-in-out infinite` : 'none',
        '&::before': dualShine
          ? {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(105deg, transparent, ${style.shine}, transparent)`,
              width: '36%',
              animation: `pkgShineRev ${style.shineMs + 700}ms ease-in-out infinite`,
              animationDelay: '0.55s',
              pointerEvents: 'none',
              opacity: 0.7,
            }
          : undefined,
        '&::after': hasShine
          ? {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(90deg, transparent, ${style.shine}, transparent)`,
              width: dualShine ? '48%' : '40%',
              animation: `pkgShine ${style.shineMs}ms ease-in-out infinite`,
              pointerEvents: 'none',
            }
          : undefined,
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          '&::before': { animation: 'none' },
          '&::after': { animation: 'none' },
        },
      }}
    >
      {resolved.label}
    </Box>
  );
};

export default TreatmentPackageTierChip;
