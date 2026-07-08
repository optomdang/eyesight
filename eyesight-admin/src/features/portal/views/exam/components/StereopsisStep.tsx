import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'src/hooks/useTranslation';
import { useExamContext } from 'src/contexts/ExamContext';
import { useAutoInstructionAudioQueue } from 'src/hooks/useInstructionAudioPlayback';
import { getStereopsisQuestionAudioId } from 'src/utils/audio/instructionAudioResolver';
import {
  SeededRng,
  renderDigitPanel,
  renderShapeRow,
  renderShapeSingle,
  SHAPE_CHOICES,
  SHAPE_LABELS,
  generateStereopsisSteps,
  type ShapeChoiceId,
  type StereopsisStepResult,
  type StereopsisTestStep,
} from 'src/utils/stereopsis';

const ANSWER_BAR_HEIGHT = 168;

const StereopsisStep = () => {
  const { t, currentLanguage } = useTranslation();
  const { handleStereopsisComplete } = useExamContext();

  const rng = useMemo(() => new SeededRng(Date.now()), []);
  const steps = useMemo(() => generateStereopsisSteps(rng), [rng]);

  const [stepIdx, setStepIdx] = useState(0);
  const [selShape, setSelShape] = useState<ShapeChoiceId | null>(null);
  const [digitInput, setDigitInput] = useState('');
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [stepResults, setStepResults] = useState<StereopsisStepResult[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rowCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const digitInputRef = useRef<HTMLInputElement>(null);

  const step: StereopsisTestStep = steps[stepIdx];
  const isShapeStep = step?.type !== 'digit';

  const questionAudioId = useMemo(() => {
    if (!step) return null;
    const kind =
      step.type === 'shape-row' ? 'shape-row' : step.type === 'digit' ? 'digit' : 'shape-single';
    return getStereopsisQuestionAudioId(kind);
  }, [step, stepIdx]);

  useAutoInstructionAudioQueue(questionAudioId ? [questionAudioId] : [], {
    lang: currentLanguage,
    dedupeKey: questionAudioId ? `exam-stereo-q:${stepIdx}:${currentLanguage}` : undefined,
    enabled: Boolean(questionAudioId),
  });

  const renderSingleOrDigit = useCallback(() => {
    if (!step || step.type === 'shape-row') return;
    if (step.type === 'shape-single' && canvasRef.current && step.shapeType) {
      renderShapeSingle(canvasRef.current, step.shapeType, rng);
    } else if (step.type === 'digit' && canvasRef.current && step.digit != null) {
      renderDigitPanel(canvasRef.current, step.digit, step.arcsec, rng);
    }
  }, [step, rng]);

  const renderRow = useCallback(() => {
    if (!step || step.type !== 'shape-row' || step.floatShape == null || step.floatAt == null) return;
    const canvases = rowCanvasRefs.current.filter(Boolean) as HTMLCanvasElement[];
    if (canvases.length === 5) {
      renderShapeRow(canvases, step.floatShape, step.floatAt, step.arcsec, rng);
    }
  }, [step, rng]);

  useLayoutEffect(() => {
    setSelShape(null);
    setDigitInput('');
    setFeedback(null);
    setLocked(false);
  }, [stepIdx]);

  useLayoutEffect(() => {
    if (steps[stepIdx]?.type !== 'digit') return;
    const frame = requestAnimationFrame(() => {
      digitInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [stepIdx, steps]);

  useLayoutEffect(() => {
    if (step?.type === 'shape-row') {
      renderRow();
    } else {
      renderSingleOrDigit();
    }
  }, [stepIdx, step, renderRow, renderSingleOrDigit]);

  const finishTest = useCallback(
    (results: StereopsisStepResult[], failedAt: number) => {
      handleStereopsisComplete(results, failedAt, steps);
    },
    [handleStereopsisComplete, steps]
  );

  const confirmAnswer = useCallback(() => {
    if (locked || !step) return;

    const userAnswer = isShapeStep ? selShape : digitInput.trim();
    if (!userAnswer) return;

    const correct = userAnswer === step.answer;
    const result: StereopsisStepResult = {
      stepIndex: stepIdx,
      label: step.label,
      arcsec: step.arcsec,
      userAnswer,
      correct,
    };

    setLocked(true);

    if (correct) {
      setFeedback({ ok: true, text: t('exam.stereopsisCorrect', '✓ Đúng!') });
      const nextResults = [...stepResults, result];
      setStepResults(nextResults);

      if (stepIdx + 1 >= steps.length) {
        setTimeout(() => finishTest(nextResults, steps.length), 700);
      } else {
        setTimeout(() => setStepIdx((i) => i + 1), 700);
      }
    } else {
      const label =
        step.type === 'digit' ? step.answer : SHAPE_LABELS[step.answer] || step.answer;
      setFeedback({
        ok: false,
        text: t('exam.stereopsisWrong', '✗ Sai! Đáp án đúng: {{answer}}', { answer: label }),
      });
      const nextResults = [...stepResults, result];
      setStepResults(nextResults);
      setTimeout(() => finishTest(nextResults, stepIdx), 1400);
    }
  }, [
    locked,
    step,
    isShapeStep,
    selShape,
    digitInput,
    stepIdx,
    steps,
    stepResults,
    finishTest,
    t,
  ]);

  const canConfirm = isShapeStep ? !!selShape : /^[0-9]$/.test(digitInput);

  if (!step) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0c10', color: '#e8eef5', pb: `${ANSWER_BAR_HEIGHT}px` }}>
      <Container maxWidth="md" sx={{ py: 2 }}>
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: '#1a1f2e',
            border: '1px solid #3d4f6f',
            borderRadius: 2,
            px: 2,
            py: 1.5,
            mb: 1.5,
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#6eb5ff', fontSize: '0.95rem' }}>
              {step.label}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', opacity: 0.6 }}>
              {t('exam.stereopsisProgress', 'Bước {{current}} / {{total}}', {
                current: stepIdx + 1,
                total: steps.length,
              })}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.3rem', color: '#e8eef5' }}>
              {step.arcsec}″
            </Typography>
            {step.diff && (
              <Typography sx={{ fontSize: '0.72rem', opacity: 0.6 }}>{step.diff}</Typography>
            )}
          </Box>
        </Paper>

        {step.type === 'shape-row' ? (
          <Box
            sx={{
              bgcolor: '#000',
              borderRadius: 2,
              p: 1.25,
              display: 'flex',
              gap: 0.5,
              justifyContent: 'center',
              mb: 1,
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                component="canvas"
                ref={(el: HTMLCanvasElement | null) => {
                  rowCanvasRefs.current[i] = el;
                }}
                sx={{
                  display: 'block',
                  width: '100%',
                  maxWidth: 120,
                  height: 'auto',
                  imageRendering: 'pixelated',
                }}
              />
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              bgcolor: '#000',
              borderRadius: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 1,
              mb: 1,
              minHeight: 200,
            }}
          >
            <Box
              component="canvas"
              ref={canvasRef}
              sx={{
                display: 'block',
                maxWidth: '100%',
                height: 'auto',
                imageRendering: 'pixelated',
                ...(step.type === 'digit' ? { maxWidth: 480 } : {}),
              }}
            />
          </Box>
        )}

        <Typography sx={{ textAlign: 'center', fontSize: '0.88rem', opacity: 0.78, mb: 1 }}>
          {step.type === 'shape-single' &&
            t('exam.stereopsisQShape', 'Hình nào nổi lên khỏi nền?')}
          {step.type === 'shape-row' &&
            t('exam.stereopsisQRow', 'Trong 5 ô, hình nào nổi lên? (chọn hình bạn thấy)')}
          {step.type === 'digit' &&
            t('exam.stereopsisQDigit', 'Số nào nổi lên bên trong vòng tròn?')}
        </Typography>
      </Container>

      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: '#0e1117',
          borderTop: '1px solid #3d4f6f',
          px: 2,
          py: 1.5,
          zIndex: 1200,
        }}
      >
        <Box sx={{ maxWidth: 680, mx: 'auto' }}>
          <Typography
            sx={{
              textAlign: 'center',
              fontSize: '0.88rem',
              fontWeight: 600,
              minHeight: '1.5rem',
              mb: 0.75,
              color: feedback ? (feedback.ok ? '#4ade80' : '#f87171') : 'transparent',
            }}
          >
            {feedback?.text || '\u00a0'}
          </Typography>

          {isShapeStep ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center', mb: 1 }}>
              {SHAPE_CHOICES.map((choice) => (
                <Button
                  key={choice.id}
                  variant={selShape === choice.id ? 'contained' : 'outlined'}
                  disabled={locked}
                  onClick={() => setSelShape(choice.id)}
                  sx={{
                    minWidth: 66,
                    flexDirection: 'column',
                    py: 0.75,
                    fontSize: '0.78rem',
                    borderColor: selShape === choice.id ? '#6eb5ff' : '#3d4f6f',
                    color: selShape === choice.id ? '#0a0c10' : '#e8eef5',
                    bgcolor: selShape === choice.id ? '#6eb5ff' : '#1e2840',
                    '&:hover': { bgcolor: selShape === choice.id ? '#9ecfff' : '#253050' },
                  }}
                >
                  <Box component="span" sx={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                    {choice.icon}
                  </Box>
                  {choice.label}
                </Button>
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', alignItems: 'center', mb: 1 }}>
              <TextField
                inputRef={digitInputRef}
                value={digitInput}
                onChange={(e) => setDigitInput(e.target.value.replace(/\D/g, '').slice(0, 1))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canConfirm && !locked) confirmAnswer();
                }}
                disabled={locked}
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]',
                  maxLength: 1,
                  style: {
                    textAlign: 'center',
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    padding: '8px',
                  },
                }}
                placeholder="?"
                sx={{
                  width: 72,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#1e2840',
                    color: '#e8eef5',
                    '& fieldset': { borderColor: '#3d4f6f' },
                    '&.Mui-focused fieldset': { borderColor: '#6eb5ff' },
                  },
                }}
              />
              <Typography sx={{ fontSize: '0.82rem', opacity: 0.65, color: '#e8eef5' }}>
                {t('exam.stereopsisDigitHint', 'Số nổi lên (0–9)')}
              </Typography>
            </Box>
          )}

          <Button
            fullWidth
            variant="contained"
            disabled={!canConfirm || locked}
            onClick={confirmAnswer}
            sx={{
              bgcolor: '#6eb5ff',
              color: '#0a0c10',
              fontWeight: 700,
              '&:hover': { bgcolor: '#9ecfff' },
              '&.Mui-disabled': { opacity: 0.35, bgcolor: '#6eb5ff', color: '#0a0c10' },
            }}
          >
            {t('exam.confirm', 'Xác nhận')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default StereopsisStep;
