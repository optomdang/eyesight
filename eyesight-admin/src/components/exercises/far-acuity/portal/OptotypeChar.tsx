/**
 * Standalone optotype character renderer — no ExamContext dependency.
 * Sized for Far Acuity / VAC exercise (embedded layout with HUD + input bar).
 */
import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { FONT_MAP } from 'src/utils/constant';
import { clinicalMmToLayoutPx } from 'src/utils/visionUtils';
import type { ScreenInfo } from 'src/utils/visionUtils';
import { getLastScreenConfig, DEFAULT_SCREEN_CONFIG } from 'src/services/deviceProfile.service';
import { ensureOptotypeFontsLoaded } from 'src/utils/optotypeFonts';
import 'src/features/portal/views/exam/components/exam-fonts.css';

/** Extra CSS px around the clinical glyph so overflow clip / AA does not thin strokes. */
export const OPTOTYPE_CELL_PAD_PX = 2;

interface OptotypeCharProps {
  char: string;
  display: string;
  /** Letter height in mm */
  sizeMm: number;
  screenInfo: ScreenInfo;
  /** Letter color (opaque; contrast is blended into this hex) */
  textColor?: string;
  spacing?: number;
  style?: React.CSSProperties;
}

export function resolveOptotypeFontSizePx(sizeMm: number, screenInfo: ScreenInfo): number {
  try {
    return Math.round(clinicalMmToLayoutPx(sizeMm, screenInfo));
  } catch {
    const savedScreen = getLastScreenConfig() ?? DEFAULT_SCREEN_CONFIG;
    return Math.round(clinicalMmToLayoutPx(sizeMm, savedScreen));
  }
}

const OptotypeChar: React.FC<OptotypeCharProps> = ({
  char,
  display,
  sizeMm,
  screenInfo,
  textColor = 'black',
  spacing = 0,
  style,
}) => {
  const fontSizePx = resolveOptotypeFontSizePx(sizeMm, screenInfo);
  const cellPx = fontSizePx + OPTOTYPE_CELL_PAD_PX * 2;
  const fontFamily = FONT_MAP[char as keyof typeof FONT_MAP] || 'OptomDangLatinChart';

  useEffect(() => {
    void ensureOptotypeFontsLoaded();
  }, []);

  return (
    <Box
      data-testid="optotype-char"
      data-char={display}
      data-font-size-px={fontSizePx}
      sx={{
        // Clinical glyph size stays fontSizePx; cell is slightly larger so edge
        // strokes (e.g. left bar of H) are not clipped by overflow / AA.
        height: `${cellPx}px`,
        minHeight: `${cellPx}px`,
        width: `${cellPx}px`,
        minWidth: `${cellPx}px`,
        fontSize: `${fontSizePx}px`,
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: `"${fontFamily}"`,
        fontSynthesis: 'none',
        color: textColor,
        overflow: 'visible',
        lineHeight: 1,
        textAlign: 'center',
        marginRight: spacing ? `${spacing}px` : 0,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        ...style,
      }}
    >
      {/* Remount on glyph change so browser never composites previous letter ink */}
      <Box
        key={display}
        component="span"
        sx={{
          display: 'block',
          lineHeight: 1,
          textAlign: 'center',
        }}
      >
        {display}
      </Box>
    </Box>
  );
};

export default OptotypeChar;
