import React, { useEffect, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'src/hooks/useTranslation';
import ExamChar from './ExamChar';
import { useExamContext } from 'src/contexts/ExamContext';
import { CHAR_POOL_MAP, FONT_MAP } from 'src/utils/constant.ts';
import { getCharSpacing, clinicalMmToLayoutPx } from 'src/utils/visionUtils';
import { EXAM_CHAR_PADDING_PX } from 'src/services/exam-state';
import { resolveOpaqueContrastColors } from 'src/utils/clinicalContrastColor';
import { resolveOptotypeCellPadPx } from 'src/utils/optotypeCellPad';
import OptotypeAnswerField, {
  useOptotypeAnswerLeakGuard,
} from 'src/components/shared/OptotypeAnswerField';

const TestStep = () => {
  const {
    currentLine,
    charType,
    currentBatch,
    currentBatchCharIndex,
    currentBatchItems,
    inputValues,
    screenInfo,
    handleResetCurrentLine,
    handleDirectionSelect,
    handleInputChange,
    handleConfirmAndNext,
    fontSize,
    visualAcuity,
    testEye,
    testMode,
    testContrast,
    displayStrategy,
    getCurrentBatchStartIndex,
    getCurrentLineData,
  } = useExamContext();
  const { t } = useTranslation();

  const fontSizePx = clinicalMmToLayoutPx(fontSize, screenInfo);
  const cellPadPx = resolveOptotypeCellPadPx(fontSizePx);
  // Keep ISO 1× letter-height gap between glyphs after per-cell horizontal pad.
  const spacing = Math.max(
    0,
    getCharSpacing(fontSizePx, currentBatchItems.length) - cellPadPx * 2
  );

  const contrastColors =
    testMode === 'contrast'
      ? resolveOpaqueContrastColors({
          contrastPercent: (Number(testContrast) || 0) * 100,
          textColor: '#000000',
          backgroundColor: '#FFFFFF',
        })
      : null;

  const answeredCount = getCurrentLineData(testEye as 'right' | 'left' | 'both').filter(
    (i: any) => i.answer !== undefined
  ).length;
  const allAnswered = answeredCount >= displayStrategy.totalChars;

  const isTextCharType = charType === 'A' || charType === 'N';
  const batchStart = getCurrentBatchStartIndex();
  const currentBatchInputsFilled =
    !isTextCharType ||
    currentBatchItems.every((_item, idx) => Boolean(inputValues[batchStart + idx]?.trim()));

  const confirmDisabled = isTextCharType ? !currentBatchInputsFilled : !allAnswered;

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const leakGuard = useOptotypeAnswerLeakGuard();

  useEffect(() => {
    if (!isTextCharType) return;

    const frame = requestAnimationFrame(() => {
      inputRefs.current[0]?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [currentLine, currentBatch, testEye, isTextCharType]);

  useEffect(() => {
    if (isTextCharType || !allAnswered) return;
    window.setTimeout(() => confirmButtonRef.current?.focus(), 0);
  }, [allAnswered, isTextCharType, currentLine, currentBatch]);


  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        p: 0,
        m: 0,
      }}
    >
      <Box
        sx={{
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: contrastColors?.backgroundColor ?? 'background.paper',
          // Do not clip optotype side strokes (O/C/U arcs need room past the em-box).
          overflowX: 'visible',
          overflowY: 'auto',
        }}
      >
        {currentBatchItems.length > 0 && (
          <Box textAlign="center" position="relative" sx={{ overflow: 'visible' }}>
            <Typography
              variant="body2"
              sx={{
                position: 'fixed',
                top: '50%',
                left: '20px',
                transform: 'translateY(-50%)',
                color: 'text.primary',
                fontWeight: 'medium',
                fontSize: '0.9rem',
                zIndex: 1000,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              {visualAcuity.feet}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                position: 'fixed',
                top: '50%',
                right: '20px',
                transform: 'translateY(-50%)',
                color: 'text.primary',
                fontWeight: 'medium',
                fontSize: '0.9rem',
                zIndex: 1000,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              {visualAcuity.snellen}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'nowrap',
                px: `${EXAM_CHAR_PADDING_PX}px`,
                boxSizing: 'border-box',
                gap: `${spacing}px`,
                overflow: 'visible',
              }}
            >
              {currentBatchItems.map((item: any, index: number) => (
                <ExamChar
                  key={`${batchStart + index}-${item.display}`}
                  char={item.char}
                  display={item.display}
                  size={fontSize}
                  spacing={0}
                  style={
                    contrastColors
                      ? { color: contrastColors.textColor }
                      : undefined
                  }
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          width: '100%',
          p: 1,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box display="flex" justifyContent="space-between" flexWrap="wrap">
          <Typography variant="body2">
            <strong>
              {testEye === 'right'
                ? t('exam.rightEye')
                : testEye === 'left'
                  ? t('exam.leftEye')
                  : t('exam.bothEyes')}
            </strong>{' '}
            – {t('exam.level')}{' '}
            <strong>
              {currentLine + 1}
              {testMode === 'contrast' ? ` (Contrast = ${(testContrast * 100).toFixed(2)}%)` : ''}
            </strong>
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" flexWrap="wrap">
          <Typography variant="body2">
            {t('exam.selected')}{' '}
            <strong>{`${getCurrentLineData(testEye as 'right' | 'left' | 'both').filter((i) => i.answer !== undefined).length} / ${displayStrategy.totalChars}`}</strong>
          </Typography>
        </Box>
        {(charType === 'E' || charType === 'C' || charType === 'S') && (
          <Box display="flex" flexWrap="wrap" justifyContent="center" gap={1}>
            {CHAR_POOL_MAP[charType].map((key) => (
              <Button
                key={key}
                size="small"
                variant="outlined"
                onClick={() => handleDirectionSelect(testEye as 'right' | 'left' | 'both', key)}
                disabled={currentBatchItems[currentBatchCharIndex]?.answer !== undefined}
                sx={{ fontFamily: FONT_MAP[charType] }}
              >
                {key}
              </Button>
            ))}
          </Box>
        )}
        {(charType === 'A' || charType === 'N') && (
          <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">
            {currentBatchItems.map((item: any, index: number) => {
              const absoluteIndex = batchStart + index;
              const fieldValue =
                item.answer !== undefined ? item.answer : inputValues[absoluteIndex] || '';
              return (
                <OptotypeAnswerField
                  key={absoluteIndex}
                  absoluteIndex={absoluteIndex}
                  batchLocalIndex={index}
                  value={fieldValue}
                  label={`${t('exam.enterCharacter')} ${absoluteIndex + 1}`}
                  ariaLabel={`${t('exam.enterCharacter')} ${absoluteIndex + 1}`}
                  disabled={item.answer !== undefined}
                  numbersOnly={charType === 'N'}
                  leakGuard={leakGuard}
                  inputRefs={inputRefs}
                  confirmButtonRef={confirmButtonRef}
                  onCommit={handleInputChange}
                />
              );
            })}
          </Box>
        )}
        <Box display="flex" justifyContent="center" gap={1}>
          <Button size="small" variant="outlined" color="warning" onClick={handleResetCurrentLine}>
            {t('exam.changeCharacters', 'Đổi chữ')}
          </Button>
          <Button
            ref={confirmButtonRef}
            size="small"
            variant="contained"
            onClick={() => void handleConfirmAndNext()}
            disabled={confirmDisabled}
          >
            {t('common.confirm', 'Xác nhận')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default TestStep;
