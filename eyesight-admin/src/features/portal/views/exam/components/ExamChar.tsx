import { Box } from '@mui/material';
import './exam-fonts.css';
import React, { useEffect, useState } from 'react';
import { FONT_MAP } from 'src/utils/constant';
import { useExamContext } from 'src/contexts/ExamContext';
import { clinicalMmToLayoutPx } from 'src/utils/visionUtils';
import { getLastScreenConfig, DEFAULT_SCREEN_CONFIG } from 'src/services/deviceProfile.service';
import { ensureOptotypeFontsLoaded } from 'src/utils/optotypeFonts';
import { resolveOptotypeCellPadPx } from 'src/utils/optotypeCellPad';

interface ExamCharProps {
  char: 'E' | 'C' | 'A' | 'N' | 'S' | 'I' | string;
  display: string;
  size: number; // mm
  style?: React.CSSProperties;
  spacing?: number;
}

const ExamChar: React.FC<ExamCharProps> = ({ char, display, size, style, spacing }) => {
  const { screenInfo } = useExamContext();

  let fontSizePx: number;
  let hasFallback = false;

  try {
    fontSizePx = clinicalMmToLayoutPx(size, screenInfo);
  } catch {
    // screenInfo from exam context is invalid — try the screen the user already
    // configured and saved (via ScreenSetupForm → localStorage).
    // Last resort: 15.6" 1920×1080 (the most common laptop size).
    const savedScreen = getLastScreenConfig() ?? DEFAULT_SCREEN_CONFIG;
    fontSizePx = clinicalMmToLayoutPx(size, savedScreen);
    hasFallback = true;
  }

  const cellPadPx = resolveOptotypeCellPadPx(fontSizePx);
  const fontFamily = FONT_MAP[char as keyof typeof FONT_MAP] || 'OptomDangLatinChart';

  const [containerHeight, setContainerHeight] = useState<string>('100%');

  useEffect(() => {
    void ensureOptotypeFontsLoaded();
  }, []);

  useEffect(() => {
    if (hasFallback) {
      console.warn(
        'Thiếu thông tin màn hình, sử dụng DPI mặc định (96). Kích thước chữ có thể không chính xác.'
      );
    }

    const viewportHeight = window.innerHeight;
    const reservedSpace = 55;
    const availableHeight = viewportHeight - reservedSpace;

    if (fontSizePx < availableHeight) {
      setContainerHeight(`calc(100vh - ${reservedSpace}px)`);
    } else {
      setContainerHeight('100%');
    }
  }, [fontSizePx, hasFallback]);

  return (
    <Box
      data-testid="exam-char"
      data-char={display}
      data-font-size-px={Math.round(fontSizePx)}
      data-cell-pad-px={cellPadPx}
      sx={{
        height: containerHeight,
        // Clinical size is fontSize only. Avoid a tight fixed em-box width —
        // curved glyphs (O/C/U/D) ink past the em square and get hard-clipped.
        minWidth: `${fontSizePx}px`,
        width: 'auto',
        px: `${cellPadPx}px`,
        boxSizing: 'content-box',
        fontSize: `${fontSizePx}px`,
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: `"${fontFamily}"`,
        fontSynthesis: 'none',
        color: 'black',
        overflow: 'visible',
        contain: 'none',
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
          textAlign: 'center',
          lineHeight: 1,
        }}
      >
        {display}
      </Box>
    </Box>
  );
};

export default ExamChar;
