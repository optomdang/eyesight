/**
 * VT Stereopsis — RDS stimulus renderer for all stereopsis task modes.
 */

import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import type { VtStereopsisTaskMode } from 'src/types/core/vtQuest';
import type { GeoShapeType, IntroShapeType } from 'src/utils/stereopsis/stereopsisEngine';
import {
  clearStereopsisCanvas,
  drawStereopsisDigitPanel,
  drawStereopsisShapeRow,
  drawStereopsisShapeSingle,
  STEREOPSIS_BG,
  STEREOPSIS_DIGIT_CANVAS,
  STEREOPSIS_ROW_PANEL,
  STEREOPSIS_SHAPE_CANVAS,
} from '../../stimuli/stereopsisRenderer';

interface StereopsisTaskStimulusProps {
  mode: VtStereopsisTaskMode;
  arcsec: number;
  rngSeed: number;
  visible?: boolean;
  shapeType?: IntroShapeType;
  floatShape?: GeoShapeType;
  floatAt?: number;
  positionCount?: number;
  digit?: number;
}

const canvasStyle: React.CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  height: 'auto',
  background: STEREOPSIS_BG,
};

const StereopsisTaskStimulus: React.FC<StereopsisTaskStimulusProps> = ({
  mode,
  arcsec,
  rngSeed,
  visible = true,
  shapeType = 'star',
  floatShape = 'square',
  floatAt = 0,
  positionCount = 5,
  digit = 0,
}) => {
  const singleRef = useRef<HTMLCanvasElement>(null);
  const rowRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (mode === 'shape_id') {
      const canvas = singleRef.current;
      if (!canvas) return;
      if (!visible) {
        clearStereopsisCanvas(canvas);
        return;
      }
      drawStereopsisShapeSingle(canvas, shapeType, rngSeed);
      return;
    }

    if (mode === 'digit_id') {
      const canvas = singleRef.current;
      if (!canvas) return;
      if (!visible) {
        clearStereopsisCanvas(canvas);
        return;
      }
      drawStereopsisDigitPanel(canvas, digit, arcsec, rngSeed);
      return;
    }

    if (mode === 'float_position') {
      const canvases = rowRefs.current.slice(0, positionCount).filter(Boolean) as HTMLCanvasElement[];
      if (canvases.length !== positionCount) return;
      if (!visible) {
        canvases.forEach(clearStereopsisCanvas);
        return;
      }
      drawStereopsisShapeRow(canvases, floatShape, floatAt, arcsec, rngSeed);
    }
  }, [mode, arcsec, rngSeed, visible, shapeType, floatShape, floatAt, positionCount, digit]);

  if (mode === 'float_position') {
    return (
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          justifyContent: 'center',
          flexWrap: 'wrap',
          maxWidth: '100%',
        }}
      >
        {Array.from({ length: positionCount }, (_, i) => (
          <Box
            key={i}
            sx={{
              border: '2px solid rgba(108,92,231,0.35)',
              borderRadius: 2,
              overflow: 'hidden',
              lineHeight: 0,
            }}
          >
            <canvas
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              style={{
                ...canvasStyle,
                width: STEREOPSIS_ROW_PANEL,
                height: STEREOPSIS_ROW_PANEL,
              }}
            />
          </Box>
        ))}
      </Box>
    );
  }

  const displaySize =
    mode === 'digit_id'
      ? Math.min(STEREOPSIS_DIGIT_CANVAS, 520)
      : STEREOPSIS_SHAPE_CANVAS;

  return (
    <Box
      sx={{
        border: '2px solid rgba(108,92,231,0.4)',
        borderRadius: 3,
        overflow: 'hidden',
        lineHeight: 0,
        maxWidth: '100%',
        m: 'auto',
      }}
    >
      <canvas
        ref={singleRef}
        style={{
          ...canvasStyle,
          width: displaySize,
          height: displaySize,
        }}
      />
    </Box>
  );
};

export default StereopsisTaskStimulus;
