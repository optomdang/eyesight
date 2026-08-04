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
import { useOptotypeFontsReady } from 'src/utils/optotypeFonts';
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
  const fontsReady = useOptotypeFontsReady();

  let fontSizePx: number;
  try {
    fontSizePx = clinicalMmToLayoutPx(sizeMm, screenInfo);
  } catch {
    const savedScreen = getLastScreenConfig() ?? DEFAULT_SCREEN_CONFIG;
    fontSizePx = clinicalMmToLayoutPx(sizeMm, savedScreen);
  }

  const fontFamily = FONT_MAP[char as keyof typeof FONT_MAP] || 'OptomDangLatinChart';
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
      data-fonts-ready={fontsReady ? 'true' : 'false'}
      sx={{
        height: containerHeight,
        fontSize: `${fontSizePx}px`,
        width: `${fontSizePx}px`,
        minWidth: `${fontSizePx}px`,
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: `"${fontFamily}"`,
        fontSynthesis: 'none',
        color: textColor,
        overflow: 'hidden',
        lineHeight: 1,
        textAlign: 'center',
        marginRight: spacing ? `${spacing}px` : 0,
        visibility: fontsReady ? 'visible' : 'hidden',
        ...style,
      }}
    >
      <Box
        key={display}
        component="span"
        sx={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          lineHeight: 1,
        }}
      >
        {display}
      </Box>
    </Box>
  );
};

export default OptotypeChar;
