/**
 * VT Gabor — stimulus renderer for non-2AFC task modes.
 *
 * - orientation_id / delayed_match: one large patch centred in a single canvas
 * - orientation_match / odd_one_out: grid of card canvases (tap to select)
 * - sf_discrimination: two patches side by side, different stripe thickness
 *
 * Shared by portal TrialScreen and admin VtQuestPreview.
 */

import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { drawGaborSingle, drawGaborPairSF, clearGaborCanvas, computeGaborStimulusDiameterPx } from '../../stimuli/gaborRenderer';
import { SF_DISCRIMINATION_RATIO } from '../../core/gaborTaskModes';
import type { VtGaborTaskMode, VtResponseSide } from 'src/types/core/vtQuest';

export const GABOR_CARD_PADDING = 12;
export const GABOR_CARD_GAP = 12;
export const GABOR_SINGLE_PADDING = 20;

interface GaborTaskStimulusProps {
  mode: Exclude<VtGaborTaskMode, 'location_2afc'>;
  contrast: number;
  /** Clinical plateau diameter (= Snellen letter height); fade halo is outside */
  patchSizePx: number;
  pixelsPerDeg: number;
  sfCpD: number;
  phaseRad?: number;
  backgroundLum?: number;
  /** false → canvases cleared (ISI / delayed-match recall phase) */
  visible?: boolean;
  /** orientation_id / delayed_match */
  targetOrientationDeg?: number;
  /** orientation_match / odd_one_out */
  cardOrientations?: number[];
  selectedIndices?: number[];
  onCardSelect?: (index: number) => void;
  cardsDisabled?: boolean;
  /** sf_discrimination */
  thickSide?: VtResponseSide;
  sfOrientationDeg?: number;
}

const CardCanvas: React.FC<{
  orientationDeg: number;
  contrast: number;
  patchSizePx: number;
  pixelsPerDeg: number;
  sfCpD: number;
  phaseRad?: number;
  backgroundLum: number;
  visible: boolean;
  selected: boolean;
  disabled: boolean;
  onClick?: () => void;
}> = ({
  orientationDeg,
  contrast,
  patchSizePx,
  pixelsPerDeg,
  sfCpD,
  phaseRad,
  backgroundLum,
  visible,
  selected,
  disabled,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stimulusDiameter = computeGaborStimulusDiameterPx(Math.round(patchSizePx));
  const cardSize = stimulusDiameter + GABOR_CARD_PADDING * 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = cardSize;
    canvas.height = cardSize;
    if (!visible) {
      clearGaborCanvas(canvas, backgroundLum);
      return;
    }
    drawGaborSingle({
      canvas,
      contrast,
      orientationDeg,
      sfCpD,
      pixelsPerDeg,
      patchSizePx,
      phaseRad,
      backgroundLuminance: backgroundLum,
    });
  }, [
    orientationDeg,
    contrast,
    patchSizePx,
    pixelsPerDeg,
    sfCpD,
    phaseRad,
    backgroundLum,
    visible,
    cardSize,
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
        border: selected ? '3px solid #FFD93D' : '3px solid rgba(108,92,231,0.4)',
        boxShadow: selected ? '0 0 24px rgba(255,217,61,0.55)' : '0 0 16px rgba(108,92,231,0.2)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
        background: 'transparent',
        '&:hover': disabled || !onClick ? undefined : { transform: 'scale(1.03)' },
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: cardSize, height: cardSize }} />
    </Box>
  );
};

const GaborTaskStimulus: React.FC<GaborTaskStimulusProps> = ({
  mode,
  contrast,
  patchSizePx,
  pixelsPerDeg,
  sfCpD,
  phaseRad,
  backgroundLum = 128,
  visible = true,
  targetOrientationDeg = 0,
  cardOrientations = [],
  selectedIndices = [],
  onCardSelect,
  cardsDisabled = false,
  thickSide = 'left',
  sfOrientationDeg = 0,
}) => {
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);

  const isGridMode = mode === 'orientation_match' || mode === 'odd_one_out';
  const isSingleMode = mode === 'orientation_id' || mode === 'delayed_match';

  useEffect(() => {
    if (isGridMode) return;
    const canvas = singleCanvasRef.current;
    if (!canvas) return;

    if (isSingleMode) {
      const stimulusDiameter = computeGaborStimulusDiameterPx(Math.round(patchSizePx));
      const size = stimulusDiameter + GABOR_SINGLE_PADDING * 2;
      canvas.width = size;
      canvas.height = size;
      if (!visible) {
        clearGaborCanvas(canvas, backgroundLum);
        return;
      }
      drawGaborSingle({
        canvas,
        contrast,
        orientationDeg: targetOrientationDeg,
        sfCpD,
        pixelsPerDeg,
        patchSizePx,
        phaseRad,
        backgroundLuminance: backgroundLum,
      });
      return;
    }

    // sf_discrimination
    const stimulusDiameter = computeGaborStimulusDiameterPx(Math.round(patchSizePx));
    const panel = stimulusDiameter + GABOR_SINGLE_PADDING * 2;
    canvas.width = panel * 2 + 2;
    canvas.height = panel;
    if (!visible) {
      clearGaborCanvas(canvas, backgroundLum);
      return;
    }
    drawGaborPairSF({
      canvas,
      thickSide,
      contrast,
      sfCpD,
      sfRatio: SF_DISCRIMINATION_RATIO,
      orientationDeg: sfOrientationDeg,
      pixelsPerDeg,
      patchSizePx,
      phaseRad,
      backgroundLuminance: backgroundLum,
    });
  }, [
    isGridMode,
    isSingleMode,
    contrast,
    patchSizePx,
    pixelsPerDeg,
    sfCpD,
    phaseRad,
    backgroundLum,
    visible,
    targetOrientationDeg,
    thickSide,
    sfOrientationDeg,
  ]);

  if (isGridMode) {
    const cols = 2;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, auto)`,
          gap: `${GABOR_CARD_GAP}px`,
          justifyContent: 'center',
          alignContent: 'center',
        }}
      >
        {cardOrientations.map((deg, idx) => (
          <CardCanvas
            key={idx}
            orientationDeg={deg}
            contrast={contrast}
            patchSizePx={patchSizePx}
            pixelsPerDeg={pixelsPerDeg}
            sfCpD={sfCpD}
            phaseRad={phaseRad}
            backgroundLum={backgroundLum}
            visible={visible}
            selected={selectedIndices.includes(idx)}
            disabled={cardsDisabled}
            onClick={onCardSelect ? () => onCardSelect(idx) : undefined}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: '2px solid rgba(108,92,231,0.4)',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 0 48px rgba(108,92,231,0.25)',
        lineHeight: 0,
      }}
    >
      <canvas
        ref={singleCanvasRef}
        style={{
          display: 'block',
          background: `rgb(${backgroundLum},${backgroundLum},${backgroundLum})`,
        }}
      />
    </Box>
  );
};

export default GaborTaskStimulus;
