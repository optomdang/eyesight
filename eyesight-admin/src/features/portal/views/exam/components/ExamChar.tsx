import { Box } from '@mui/material';
import './exam-fonts.css';
import React, { useEffect, useState } from 'react';
import { FONT_MAP } from 'src/utils/constant';
import { useExamContext } from 'src/contexts/ExamContext';
import { clinicalMmToLayoutPx } from 'src/utils/visionUtils';
import { getLastScreenConfig, DEFAULT_SCREEN_CONFIG } from 'src/services/deviceProfile.service';

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
  } catch (error) {
    // screenInfo from exam context is invalid — try the screen the user already
    // configured and saved (via ScreenSetupForm → localStorage).
    // Last resort: 15.6" 1920×1080 (the most common laptop size).
    const savedScreen = getLastScreenConfig() ?? DEFAULT_SCREEN_CONFIG;
    fontSizePx = clinicalMmToLayoutPx(size, savedScreen);
    hasFallback = true;
  }

  const fontFamily = FONT_MAP[char as keyof typeof FONT_MAP] || 'sans-serif';

  const [containerHeight, setContainerHeight] = useState<string>('100%');

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
        color: 'black',
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

export default ExamChar;
