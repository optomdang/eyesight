/**
 * VT Crowding — stimulus renderer for non-legacy task modes.
 *
 * - central_letter_id / delayed_letter / flanker_same_different: single triplet
 * - letter_match_2afc: reference + 2AFC (uses main canvas in TrialScreen)
 * - odd_letter_out: 2×2 grid of triplets
 */

import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import {
  drawCrowdingSingle,
  drawCrowdingGrid,
  clearCrowdingCanvas,
} from '../../stimuli/crowdingRenderer';
import type { VtCrowdingTaskMode } from 'src/types/core/vtQuest';
import type { DichopticPresentation } from 'src/types/core/visual-settings';
import type { VtStimulusColorScheme } from '../../core/vtStimulusColors';

export const CROWDING_CARD_PADDING = 16;
export const CROWDING_CARD_GAP = 14;
export const CROWDING_SINGLE_PADDING = 24;

interface CrowdingTaskStimulusProps {
  mode: Exclude<VtCrowdingTaskMode, 'location_2afc' | 'letter_match_2afc'>;
  spacingRatio: number;
  letterHeightPx: number;
  targetLetter: string;
  flankerLetters: [string, string];
  backgroundLum?: number;
  colorScheme?: VtStimulusColorScheme | null;
  stimulusContrastPercent?: number;
  dichopticPresentation?: DichopticPresentation | null;
  visible?: boolean;
  /** odd_letter_out */
  cardTargets?: string[];
  selectedIndex?: number;
  onCardSelect?: (index: number) => void;
  cardsDisabled?: boolean;
}

const CardCanvas: React.FC<{
  targetLetter: string;
  flankerLetters: [string, string];
  spacingRatio: number;
  letterHeightPx: number;
  backgroundLum: number;
  colorScheme?: VtStimulusColorScheme | null;
  stimulusContrastPercent: number;
  dichopticPresentation?: DichopticPresentation | null;
  visible: boolean;
  selected: boolean;
  disabled: boolean;
  onClick?: () => void;
}> = ({
  targetLetter,
  flankerLetters,
  spacingRatio,
  letterHeightPx,
  backgroundLum,
  colorScheme,
  stimulusContrastPercent,
  dichopticPresentation,
  visible,
  selected,
  disabled,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spacingPx = spacingRatio * letterHeightPx;
  const cardW = spacingPx * 2 + letterHeightPx + CROWDING_CARD_PADDING * 2;
  const cardH = letterHeightPx + CROWDING_CARD_PADDING * 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.ceil(cardW);
    canvas.height = Math.ceil(cardH);
    if (!visible) {
      clearCrowdingCanvas(canvas, backgroundLum, colorScheme);
      return;
    }
    drawCrowdingSingle({
      canvas,
      spacingRatio,
      letterHeightPx,
      targetLetter,
      flankerLetters,
      backgroundLuminance: backgroundLum,
      colorScheme,
      stimulusContrastPercent,
      dichopticPresentation,
    });
  }, [
    targetLetter,
    flankerLetters,
    spacingRatio,
    letterHeightPx,
    backgroundLum,
    colorScheme,
    stimulusContrastPercent,
    dichopticPresentation,
    visible,
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
        border: selected ? '3px solid #FFD93D' : '3px solid rgba(162,155,254,0.5)',
        boxShadow: selected ? '0 0 24px rgba(255,217,61,0.55)' : '0 0 16px rgba(162,155,254,0.2)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
        background: 'transparent',
        '&:hover': disabled || !onClick ? undefined : { transform: 'scale(1.03)' },
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: cardW, height: cardH }} />
    </Box>
  );
};

const CrowdingTaskStimulus: React.FC<CrowdingTaskStimulusProps> = ({
  mode,
  spacingRatio,
  letterHeightPx,
  targetLetter,
  flankerLetters,
  backgroundLum = 220,
  colorScheme,
  stimulusContrastPercent = 100,
  dichopticPresentation,
  visible = true,
  cardTargets = [],
  selectedIndex = -1,
  onCardSelect,
  cardsDisabled = false,
}) => {
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const isGridMode = mode === 'odd_letter_out';
  const isSingleMode =
    mode === 'central_letter_id' ||
    mode === 'delayed_letter' ||
    mode === 'flanker_same_different';

  useEffect(() => {
    if (isGridMode) return;
    const canvas = singleCanvasRef.current;
    if (!canvas || !isSingleMode) return;

    const spacingPx = spacingRatio * letterHeightPx;
    const w = spacingPx * 2 + letterHeightPx + CROWDING_SINGLE_PADDING * 2;
    const h = letterHeightPx + CROWDING_SINGLE_PADDING * 2;
    canvas.width = Math.ceil(w);
    canvas.height = Math.ceil(h);

    if (!visible) {
      clearCrowdingCanvas(canvas, backgroundLum, colorScheme);
      return;
    }

    drawCrowdingSingle({
      canvas,
      spacingRatio,
      letterHeightPx,
      targetLetter,
      flankerLetters,
      backgroundLuminance: backgroundLum,
      colorScheme,
      stimulusContrastPercent,
      dichopticPresentation,
    });
  }, [
    isGridMode,
    isSingleMode,
    spacingRatio,
    letterHeightPx,
    targetLetter,
    flankerLetters,
    backgroundLum,
    colorScheme,
    stimulusContrastPercent,
    dichopticPresentation,
    visible,
  ]);

  if (isGridMode) {
    const cols = 2;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, auto)`,
          gap: `${CROWDING_CARD_GAP}px`,
          justifyContent: 'center',
          alignContent: 'center',
        }}
      >
        {cardTargets.map((letter, idx) => (
          <CardCanvas
            key={idx}
            targetLetter={letter}
            flankerLetters={flankerLetters}
            spacingRatio={spacingRatio}
            letterHeightPx={letterHeightPx}
            backgroundLum={backgroundLum}
            colorScheme={colorScheme}
            stimulusContrastPercent={stimulusContrastPercent}
            dichopticPresentation={dichopticPresentation}
            visible={visible}
            selected={selectedIndex === idx}
            disabled={cardsDisabled}
            onClick={onCardSelect ? () => onCardSelect(idx) : undefined}
          />
        ))}
      </Box>
    );
  }

  const spacingPx = spacingRatio * letterHeightPx;
  const w = spacingPx * 2 + letterHeightPx + CROWDING_SINGLE_PADDING * 2;
  const h = letterHeightPx + CROWDING_SINGLE_PADDING * 2;

  return (
    <Box
      sx={{
        border: '2px solid rgba(162,155,254,0.4)',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 0 48px rgba(162,155,254,0.25)',
        lineHeight: 0,
      }}
    >
      <canvas
        ref={singleCanvasRef}
        style={{
          display: 'block',
          width: w,
          height: h,
          background:
            colorScheme?.useColoredPanels === true
              ? '#000000'
              : `rgb(${backgroundLum},${backgroundLum},${backgroundLum})`,
        }}
      />
    </Box>
  );
};

export default CrowdingTaskStimulus;
