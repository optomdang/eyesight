/**
 * VT Vernier — stimulus renderer for non-legacy task modes.
 *
 * - offset_direction_mcq / delayed_direction: one centred pair
 * - odd_line_out: 2×2 grid of card canvases
 */

import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { drawVernierSingle, clearVernierCanvas } from '../../stimuli/vernierRenderer';
import type { VtStimulusColorScheme } from '../../core/vtStimulusColors';
import type { DichopticPresentation } from 'src/types/core/visual-settings';
import type { VtVernierTaskMode } from 'src/types/core/vtQuest';

export const VERNIER_CARD_PADDING = 16;
export const VERNIER_CARD_GAP = 12;
export const VERNIER_SINGLE_PADDING = 24;

interface VernierTaskStimulusProps {
  mode: Exclude<VtVernierTaskMode, 'alignment_2afc' | 'greater_offset_2afc'>;
  offsetPx: number;
  lineHeightPx: number;
  gapPx: number;
  lineWidthPx: number;
  backgroundLum?: number;
  colorScheme?: VtStimulusColorScheme | null;
  stimulusContrastPercent?: number;
  dichopticPresentation?: DichopticPresentation | null;
  visible?: boolean;
  offsetSign?: 1 | -1;
  cardOffsetSigns?: (1 | -1)[];
  selectedIndex?: number | null;
  onCardSelect?: (index: number) => void;
  cardsDisabled?: boolean;
}

const CardCanvas: React.FC<{
  offsetPx: number;
  lineHeightPx: number;
  gapPx: number;
  lineWidthPx: number;
  backgroundLum: number;
  colorScheme?: VtStimulusColorScheme | null;
  stimulusContrastPercent: number;
  dichopticPresentation?: DichopticPresentation | null;
  visible: boolean;
  offsetSign: 1 | -1;
  selected: boolean;
  disabled: boolean;
  onClick?: () => void;
}> = ({
  offsetPx,
  lineHeightPx,
  gapPx,
  lineWidthPx,
  backgroundLum,
  colorScheme,
  stimulusContrastPercent,
  dichopticPresentation,
  visible,
  offsetSign,
  selected,
  disabled,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pairW = lineWidthPx + Math.abs(offsetPx) + 8;
  const pairH = lineHeightPx * 2 + gapPx + 8;
  const cardW = pairW + VERNIER_CARD_PADDING * 2;
  const cardH = pairH + VERNIER_CARD_PADDING * 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = cardW;
    canvas.height = cardH;
    if (!visible) {
      clearVernierCanvas(canvas, backgroundLum, colorScheme);
      return;
    }
    drawVernierSingle({
      canvas,
      offsetPx: Math.max(offsetPx, 0.5),
      lineHeightPx,
      gapPx,
      lineWidthPx,
      backgroundLuminance: backgroundLum,
      colorScheme,
      stimulusContrastPercent,
      offsetSign,
      dichopticPresentation,
    });
  }, [
    offsetPx,
    lineHeightPx,
    gapPx,
    lineWidthPx,
    backgroundLum,
    colorScheme,
    stimulusContrastPercent,
    dichopticPresentation,
    visible,
    offsetSign,
    cardW,
    cardH,
  ]);

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      sx={{
        p: 0,
        lineHeight: 0,
        borderRadius: 2.5,
        overflow: 'hidden',
        cursor: disabled || !onClick ? 'default' : 'pointer',
        border: selected ? '3px solid #FFD93D' : '3px solid rgba(9,132,227,0.45)',
        boxShadow: selected ? '0 0 24px rgba(255,217,61,0.55)' : '0 0 16px rgba(9,132,227,0.2)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
        background: 'transparent',
        '&:hover': disabled || !onClick ? undefined : { transform: 'scale(1.03)' },
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </Box>
  );
};

const VernierTaskStimulus: React.FC<VernierTaskStimulusProps> = ({
  mode,
  offsetPx,
  lineHeightPx,
  gapPx,
  lineWidthPx,
  backgroundLum = 200,
  colorScheme,
  stimulusContrastPercent = 100,
  dichopticPresentation,
  visible = true,
  offsetSign = 1,
  cardOffsetSigns = [],
  selectedIndex = null,
  onCardSelect,
  cardsDisabled = false,
}) => {
  const singleRef = useRef<HTMLCanvasElement>(null);
  const pairW = lineWidthPx + Math.abs(offsetPx) + 16;
  const pairH = lineHeightPx * 2 + gapPx + 16;
  const singleSize = Math.max(pairW, pairH) + VERNIER_SINGLE_PADDING * 2;

  useEffect(() => {
    if (mode === 'odd_line_out') return;
    const canvas = singleRef.current;
    if (!canvas) return;
    canvas.width = singleSize;
    canvas.height = singleSize;
    if (!visible) {
      clearVernierCanvas(canvas, backgroundLum, colorScheme);
      return;
    }
    drawVernierSingle({
      canvas,
      offsetPx: Math.max(offsetPx, 0.5),
      lineHeightPx,
      gapPx,
      lineWidthPx,
      backgroundLuminance: backgroundLum,
      colorScheme,
      stimulusContrastPercent,
      offsetSign,
      dichopticPresentation,
    });
  }, [
    mode,
    offsetPx,
    lineHeightPx,
    gapPx,
    lineWidthPx,
    backgroundLum,
    colorScheme,
    stimulusContrastPercent,
    dichopticPresentation,
    visible,
    offsetSign,
    singleSize,
  ]);

  if (mode === 'odd_line_out') {
    const signs: (1 | -1)[] = cardOffsetSigns.length >= 4 ? cardOffsetSigns : [1, 1, 1, -1];
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: `${VERNIER_CARD_GAP}px`,
        }}
      >
        {signs.map((sign, idx) => (
          <CardCanvas
            key={idx}
            offsetPx={offsetPx}
            lineHeightPx={lineHeightPx}
            gapPx={gapPx}
            lineWidthPx={lineWidthPx}
            backgroundLum={backgroundLum}
            colorScheme={colorScheme}
            stimulusContrastPercent={stimulusContrastPercent}
            dichopticPresentation={dichopticPresentation}
            visible={visible}
            offsetSign={sign}
            selected={selectedIndex === idx}
            disabled={cardsDisabled}
            onClick={onCardSelect ? () => onCardSelect(idx) : undefined}
          />
        ))}
      </Box>
    );
  }

  return (
    <canvas
      ref={singleRef}
      style={{
        display: 'block',
        width: singleSize,
        height: singleSize,
        maxWidth: '100%',
        maxHeight: '100%',
      }}
    />
  );
};

export default VernierTaskStimulus;
