/**
 * Optotype test row + input bar — mirrors exam TestStep layout.
 * Supports direction buttons (E/C/S) and text inputs (A/N).
 */
import React, { useEffect, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'src/hooks/useTranslation';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { CHAR_POOL_MAP, FONT_MAP } from 'src/utils/constant';
import {
  buildExamDisplayStrategy,
  clinicalMmToLayoutPx,
  getCharSpacing,
  EXAM_HORIZONTAL_PADDING_PX,
  type ScreenInfo,
} from 'src/utils/visionUtils';
import type { FarAcuityLetter } from 'src/hooks/exercises/useFarAcuityEngine';
import type { ExamCharType } from 'src/utils/resolvePatientExamCharType';
import OptotypeChar from './OptotypeChar';

const EXAM_CHAR_PADDING_PX = EXAM_HORIZONTAL_PADDING_PX;

interface FarAcuityTestStepProps {
  letters: FarAcuityLetter[];
  charType: ExamCharType;
  fontSizeMm: number;
  screenInfo: ScreenInfo;
  /** Optotype fill color (already contrast-blended when needed) */
  textColor?: string;
  /** Display area background from exercise colorScheme */
  backgroundColor?: string;
  snellenLabel: string;
  logCsLabel: string;
  eyeLabel: string;
  acuityScore: string;
  contrastPercent: number;
  /** 'contrast' shows contrast %, 'acuity' hides contrast info */
  trainingMode?: 'contrast' | 'acuity';
  /** E/C/S: index of next char to fill via direction buttons */
  currentBatchCharIndex: number;
  currentBatch: number;
  inputValues: string[];
  /** Increment to focus first input of current batch (after confirm / new round). */
  inputFocusKey?: number;
  allAnswered: boolean;
  disabled?: boolean;
  onDirectionSelect: (direction: string) => void;
  onInputChange: (index: number, value: string) => void;
  onRegenerateLetters: () => void;
  onConfirmRound: () => void;
}

const FarAcuityTestStep: React.FC<FarAcuityTestStepProps> = ({
  letters,
  charType,
  fontSizeMm,
  screenInfo,
  textColor = '#000000',
  backgroundColor = '#FFFFFF',
  snellenLabel,
  logCsLabel,
  eyeLabel,
  acuityScore,
  contrastPercent,
  trainingMode = 'contrast',
  currentBatchCharIndex,
  currentBatch,
  inputValues,
  inputFocusKey = 0,
  allAnswered,
  disabled = false,
  onDirectionSelect,
  onInputChange,
  onRegenerateLetters,
  onConfirmRound,
}) => {
  const { t } = useTranslation();

  const viewportWidthPx =
    typeof window !== 'undefined' ? window.innerWidth : screenInfo.screenWidth;

  const displayStrategy = buildExamDisplayStrategy({
    fontSizeMm,
    screenInfo,
    charType,
    viewportWidthPx,
    horizontalPaddingPx: EXAM_CHAR_PADDING_PX,
    totalChars: letters.length,
  });

  const batchStart = displayStrategy.batches
    .slice(0, currentBatch)
    .reduce((sum, n) => sum + n, 0);
  const batchSize = displayStrategy.batches[currentBatch] ?? letters.length;
  const currentBatchItems = letters.slice(batchStart, batchStart + batchSize);

  const fontSizePx = clinicalMmToLayoutPx(fontSizeMm, screenInfo);
  const spacing = getCharSpacing(fontSizePx, currentBatchItems.length);

  const answeredCount = letters.filter((l) => l.answer !== undefined && l.answer !== '').length;

  const isTextCharType = charType === 'A' || charType === 'N';
  const currentBatchInputsFilled =
    !isTextCharType ||
    Array.from({ length: batchSize }, (_, idx) =>
      Boolean(inputValues[batchStart + idx]?.trim())
    ).every(Boolean);

  const confirmDisabled =
    disabled ||
    (isTextCharType ? !currentBatchInputsFilled : !allAnswered);

  const firstInputRef = useRef<HTMLInputElement>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isTextCharType || disabled) return;

    const frame = requestAnimationFrame(() => {
      (inputRefs.current[0] ?? firstInputRef.current)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [inputFocusKey, currentBatch, disabled, isTextCharType]);

  const handleCharInput = (
    absoluteIndex: number,
    batchLocalIndex: number,
    rawValue: string
  ) => {
    const value = rawValue.trim().slice(0, 1).toUpperCase();
    onInputChange(absoluteIndex, value);
    if (!value || disabled) return;

    window.setTimeout(() => {
      const nextInput = inputRefs.current[batchLocalIndex + 1];
      if (nextInput) {
        nextInput.focus();
        return;
      }
      confirmButtonRef.current?.focus();
    }, 0);
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        p: 0,
        m: 0,
      }}
    >
      {/* Letter display — same structure as exam TestStep */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: backgroundColor,
          overflowX: 'hidden',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {currentBatchItems.length > 0 && (
          <Box textAlign="center" position="relative" width="100%">
            <Typography
              variant="body2"
              sx={{
                position: 'absolute',
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
              {snellenLabel}
            </Typography>
            {trainingMode === 'contrast' && (
              <Typography
                variant="body2"
                sx={{
                  position: 'absolute',
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
                {logCsLabel}
              </Typography>
            )}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'nowrap',
                gap: `${spacing}px`,
                px: `${EXAM_CHAR_PADDING_PX}px`,
                boxSizing: 'border-box',
              }}
            >
              {currentBatchItems.map((item, index) => (
                <OptotypeChar
                  key={batchStart + index}
                  char={item.char}
                  display={item.display}
                  sizeMm={fontSizeMm}
                  screenInfo={screenInfo}
                  textColor={textColor}
                  spacing={0}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Sticky input bar — mirrors exam TestStep bottom panel */}
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
          flexShrink: 0,
        }}
      >
        <Box display="flex" justifyContent="space-between" flexWrap="wrap">
          <Typography variant="body2">
            <strong>{eyeLabel}</strong> – {t('exam.level')}{' '}
            <strong>
              {trainingMode === 'contrast'
                ? `${acuityScore} (Contrast = ${contrastPercent.toFixed(2)}%)`
                : acuityScore}
            </strong>
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" flexWrap="wrap">
          <Typography variant="body2">
            {t('exam.selected')}{' '}
            <strong>{`${answeredCount} / ${displayStrategy.totalChars}`}</strong>
          </Typography>
        </Box>

        {(charType === 'E' || charType === 'C' || charType === 'S') && (
          <Box display="flex" flexWrap="wrap" justifyContent="center" gap={1}>
            {CHAR_POOL_MAP[charType].map((key) => (
              <Button
                key={key}
                size="small"
                variant="outlined"
                onClick={() => onDirectionSelect(key)}
                disabled={
                  disabled || currentBatchItems[currentBatchCharIndex]?.answer !== undefined
                }
                sx={{ fontFamily: FONT_MAP[charType], minWidth: 48 }}
              >
                {key}
              </Button>
            ))}
          </Box>
        )}

        {(charType === 'A' || charType === 'N') && (
          <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">
            {currentBatchItems.map((item, index) => {
              const absoluteIndex = batchStart + index;
              return (
                <CustomTextField
                  key={absoluteIndex}
                  size="small"
                  label={`${absoluteIndex + 1}`}
                  inputRef={(el: HTMLInputElement | null) => {
                    inputRefs.current[index] = el;
                    if (index === 0) {
                      (firstInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                    }
                  }}
                  value={
                    item.answer !== undefined
                      ? item.answer
                      : inputValues[absoluteIndex] || ''
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleCharInput(absoluteIndex, index, e.target.value)
                  }
                  disabled={disabled || item.answer !== undefined}
                  inputProps={{
                    maxLength: 1,
                    'aria-label': `${t('exam.enterCharacter')} ${absoluteIndex + 1}`,
                    style: { textAlign: 'center' },
                  }}
                  sx={{
                    width: 56,
                    flex: '0 0 auto',
                    '& .MuiOutlinedInput-input': {
                      textAlign: 'center',
                      px: 0.5,
                    },
                  }}
                />
              );
            })}
          </Box>
        )}

        <Box display="flex" justifyContent="center" gap={1}>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            onClick={onRegenerateLetters}
            disabled={disabled}
          >
            {t('exam.changeCharacters', 'Đổi chữ')}
          </Button>
          <Button
            ref={confirmButtonRef}
            size="small"
            variant="contained"
            onClick={onConfirmRound}
            disabled={confirmDisabled}
          >
            {t('common.confirm', 'Xác nhận')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default FarAcuityTestStep;
