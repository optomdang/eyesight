/**
 * Standalone optotype character renderer — no ExamContext dependency.
 * Mirrors ExamChar layout (font size, spacing, viewport-aware height).
 */
import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { FONT_MAP } from 'src/utils/constant';
import { clinicalMmToLayoutPx } from 'src/utils/visionUtils';
import type { ScreenInfo } from 'src/utils/visionUtils';
import { getLastScreenConfig, DEFAULT_SCREEN_CONFIG } from 'src/services/deviceProfile.service';
import 'src/features/portal/views/exam/components/exam-fonts.css';

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

const OptotypeChar: React.FC<OptotypeCharProps> = ({
  char,
  display,
  sizeMm,
  screenInfo,
  textColor = 'black',
  spacing = 0,
  style,
}) => {
  let fontSizePx: number;
  try {
    fontSizePx = clinicalMmToLayoutPx(sizeMm, screenInfo);
  } catch {
    const savedScreen = getLastScreenConfig() ?? DEFAULT_SCREEN_CONFIG;
    fontSizePx = clinicalMmToLayoutPx(sizeMm, savedScreen);
  }

  const fontFamily = FONT_MAP[char as keyof typeof FONT_MAP] || 'sans-serif';
  const [containerHeight, setContainerHeight] = useState<string>('100%');

  useEffect(() => {
    const viewportHeight = window.innerHeight;
    const reservedSpace = 55;
    const availableHeight = viewportHeight - reservedSpace;
    if (fontSizePx < availableHeight) {
      setContainerHeight(`calc(100vh - ${reservedSpace}px)`);
    } else {
      setContainerHeight('100%');
    }
  }, [fontSizePx]);

  return (
    <Box
      data-testid="optotype-char"
      data-char={display}
      sx={{
        height: containerHeight,
        fontSize: `${fontSizePx}px`,
        width: `${fontSizePx}px`,
        minWidth: `${fontSizePx}px`,
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily,
        color: textColor,
        overflow: 'visible',
        lineHeight: 1,
        textAlign: 'center',
        marginRight: spacing ? `${spacing}px` : 0,
        ...style,
      }}
    >
      {display}
    </Box>
  );
};

export default OptotypeChar;
