/**
 * Full Exam State - Restored from working useExam hook
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { ExamItems, ExamStep } from 'src/types/core';
import {
  getLevels,
  getEyeKey,
  evaluateAnswer,
  calculateAccuracy,
  getVisualAcuityValues,
} from 'src/utils/examUtils';
import {
  generateRandomText,
  calculateFarFontSize,
  calculateNearFontSize,
  calculatePPI,
  buildExamDisplayStrategy,
  resolveContrastFontFarN,
  type ScreenInfo,
} from 'src/utils/visionUtils';
import {
  computeAchievedArcsec,
  computeStereopsisAccuracy,
  type StereopsisStepResult,
  type StereopsisTestStep,
} from 'src/utils/stereopsis';
import { updateMyExamResult } from 'src/services/patient.service';
import { farVisionLevels, nearVisionLevels, contrastVisionLevels } from 'src/utils/constant';
import useAuth from 'src/contexts/authGuard/useAuth';
import { DEFAULT_SCREEN_CONFIG } from 'src/services/deviceProfile.service';
import { getPreferredScreenInfo } from 'src/services/screenCalibration.service';

/**
 * Horizontal padding (px) reserved on each side of the char display area.
 * Must match the `px` value on the char container in TestStep.tsx so that the
 * batch-fitting calculation and the actual rendered layout agree.
 */
export const EXAM_CHAR_PADDING_PX = 100;

const defaultExamDistance = (examType: 'far' | 'near' | 'contrast' | 'stereopsis') => {
  if (examType === 'near') return '0.4';
  if (examType === 'stereopsis') return '0.5';
  return '3'; // far, contrast
};

export const useExamState = (
  examResultId: number | null,
  initialExamType: 'far' | 'near' | 'contrast' | 'stereopsis' = 'far',
  sessionId?: number // NEW: Optional sessionId parameter
) => {
  const { user } = useAuth();
  const [distance, setDistance] = useState(() => defaultExamDistance(initialExamType));
  const [charType, setCharType] = useState<'E' | 'C' | 'A' | 'N' | 'S'>('A');
  // Prefer calibrated screen info, then last manual config, then built-in default.
  // The DistanceStep no longer shows a ScreenSetupForm — screen dimensions are
  // captured once in ScreenCalibrationPage and reused here automatically.
  const [screenInfo, setScreenInfo] = useState(
    () => getPreferredScreenInfo()
  );
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : DEFAULT_SCREEN_CONFIG.screenWidth
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [step, setStep] = useState<ExamStep>('distance');
  const [currentLine, setCurrentLine] = useState(0);
  const [testItems, setTestItems] = useState<ExamItems>({
    right: [],
    left: [],
    both: [],
    mode: initialExamType,
  });

  const [rightEyeResult, setRightEyeResult] = useState<number | null>(null);
  const [leftEyeResult, setLeftEyeResult] = useState<number | null>(null);
  const [bothResult, setBothEyeResult] = useState<number | null>(null);

  const [currentBatch, setCurrentBatch] = useState(0);
  const [currentBatchCharIndex, setCurrentBatchCharIndex] = useState(0);
  const [inputValues, setInputValues] = useState<string[]>([]);
  const [testStartedAt, setTestStartedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examSessionId] = useState(sessionId); // NEW: Store sessionId in state

  // Auto-start level calculation
  const getAutoStartLevel = useCallback((targetEye?: 'right' | 'left' | 'both') => {
    const patientExamResults = (user?.patient as { examResults?: Record<string, any> } | undefined)
      ?.examResults;

    if (!patientExamResults?.[initialExamType]?.currentResult) {
      return 0;
    }
    const currentResult = patientExamResults[initialExamType].currentResult;
    const levels = getLevels(initialExamType);

    const toIndex = (val: any): number => {
      const idx = levels.findIndex((l) => l.level === parseInt(val));
      return idx >= 0 ? idx : 0;
    };

    // When a specific eye is requested, return ONLY that eye's own previous result.
    // If the eye has no result yet, return 0 (start from the easiest level).
    // Never inherit another eye's result — a weaker eye must not be forced to start
    // at the level of a stronger eye.
    if (targetEye === 'right') return currentResult.rightEye ? toIndex(currentResult.rightEye) : 0;
    if (targetEye === 'left')  return currentResult.leftEye  ? toIndex(currentResult.leftEye)  : 0;
    if (targetEye === 'both')  return currentResult.bothEye  ? toIndex(currentResult.bothEye)  : 0;

    // No specific eye requested (e.g. initialising stereopsis): use max across all eyes.
    let maxLevel = 0;
    if (currentResult.rightEye) { const i = toIndex(currentResult.rightEye); if (i > maxLevel) maxLevel = i; }
    if (currentResult.leftEye)  { const i = toIndex(currentResult.leftEye);  if (i > maxLevel) maxLevel = i; }
    if (currentResult.bothEye)  { const i = toIndex(currentResult.bothEye);  if (i > maxLevel) maxLevel = i; }
    return maxLevel;
  }, [user, initialExamType]);

  /** Far level (1-based) for contrast letter size — per eye or worst eye before test starts. */
  const getPatientFarLevelForContrast = useCallback(
    (eye: 'right' | 'left' | 'both'): number | null => {
      const farResult = (user?.patient as { examResults?: Record<string, any> } | undefined)
        ?.examResults?.far?.currentResult;
      if (!farResult) return null;

      const parseLevel = (val: unknown): number | null => {
        const n = parseInt(String(val), 10);
        return Number.isFinite(n) && n > 0 ? n : null;
      };

      if (eye === 'right') return parseLevel(farResult.rightEye);
      if (eye === 'left') return parseLevel(farResult.leftEye);

      const levels = [parseLevel(farResult.leftEye), parseLevel(farResult.rightEye)].filter(
        (v): v is number => v != null
      );
      if (levels.length === 0) return null;
      return Math.min(...levels);
    },
    [user]
  );

  const getContrastFontEye = (): 'right' | 'left' | 'both' => {
    if (step === 'test-right') return 'right';
    if (step === 'test-left') return 'left';
    return 'both';
  };

  const getFontSize = (
    mode: 'far' | 'near' | 'contrast' | 'stereopsis',
    lineOverride?: number
  ) => {
    const parsedDistance = parseFloat(distance);
    // Important: do NOT throw on invalid distance here.
    // This function is called during render/init (e.g., to compute display strategy),
    // so throwing would crash the whole portal when the user types "0" or clears the input.
    // Keep the math strict, but return 0 so the UI can block "Tiếp tục" until distance > 0.
    if (!Number.isFinite(parsedDistance) || parsedDistance <= 0) {
      return 0;
    }

    const line = lineOverride ?? currentLine;

    if (mode === 'contrast') {
      const farLevel = getPatientFarLevelForContrast(getContrastFontEye());
      const n = resolveContrastFontFarN(farLevel);
      return calculateFarFontSize(n, parsedDistance);
    } else if (mode === 'near') {
      if (!nearVisionLevels[line]) {
        throw new Error(`Hàng ${line} không hợp lệ cho near vision test`);
      }
      // Distance input is meters (e.g., 0.4 for 40cm).
      // Do NOT divide by 100, otherwise 5m becomes 0.05m and font size becomes ~0.24px.
      return calculateNearFontSize(nearVisionLevels[line].size, parsedDistance);
    } else {
      if (!farVisionLevels[line]) {
        throw new Error(`Hàng ${line} không hợp lệ cho far vision test`);
      }
      return calculateFarFontSize(farVisionLevels[line].n, parsedDistance);
    }
  };

  const getDisplayStrategy = (
    mode: 'far' | 'near' | 'contrast' | 'stereopsis',
    charType: 'E' | 'C' | 'A' | 'N' | 'S',
    lineOverride?: number,
    screenOverride?: ScreenInfo,
    viewportOverride?: number
  ) => {
    const fontSize = getFontSize(mode, lineOverride);
    return buildExamDisplayStrategy({
      fontSizeMm: fontSize,
      screenInfo: screenOverride ?? screenInfo,
      charType,
      viewportWidthPx: viewportOverride ?? viewportWidth,
      horizontalPaddingPx: EXAM_CHAR_PADDING_PX,
    });
  };

  const getContrastValue = useCallback(
    (lineIndex: number): number => {
      if (initialExamType === 'contrast') {
        const levelData = contrastVisionLevels[lineIndex];
        return levelData.contrastPercent / 100;
      }
      return 1.0;
    },
    [initialExamType]
  );

  const screenParams = {
    screenWidth: screenInfo.screenWidth,
    screenHeight: screenInfo.screenHeight,
    screenDPI: calculatePPI(screenInfo),
    distance:
      initialExamType === 'near' ? parseFloat(distance || '0.4') : parseFloat(distance || '5'),
  };

  const liveDisplayStrategy = useMemo(
    () => getDisplayStrategy(initialExamType, charType, currentLine),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      initialExamType,
      charType,
      currentLine,
      distance,
      viewportWidth,
      screenInfo.diagonalInch,
      screenInfo.screenWidth,
      screenInfo.screenHeight,
      step,
      user?.patient,
    ]
  );
  // Batches recompute per currentLine so each level uses its own font-size-based batch split.
  const displayStrategy = liveDisplayStrategy;
  const testEye = step === 'test-right' ? 'right' : step === 'test-left' ? 'left' : 'both';
  const testMode = step === 'test-both' ? 'stereopsis' : initialExamType;
  const testContrast = getContrastValue(currentLine);

  const getCurrentLineData = (eye: 'right' | 'left' | 'both') => {
    const eyeKey = eye === 'right' ? 'right' : eye === 'left' ? 'left' : 'both';
    return testItems[eyeKey]?.[currentLine] || [];
  };

  const getCurrentBatchSize = () => {
    return displayStrategy.batches[currentBatch] || 0;
  };

  const getCurrentBatchStartIndex = () => {
    let startIndex = 0;
    for (let i = 0; i < currentBatch; i++) {
      startIndex += displayStrategy.batches[i] || 0;
    }
    return startIndex;
  };

  const getCurrentBatchItems = (eye: 'right' | 'left' | 'both') => {
    const allItems = getCurrentLineData(eye);
    if (!allItems.length) return [];
    const startIndex = getCurrentBatchStartIndex();
    const batchSize = getCurrentBatchSize();
    return allItems.slice(startIndex, startIndex + batchSize);
  };

  const getCurrentBatchProgress = () => {
    const batchItems = getCurrentBatchItems(testEye);
    const batchSize = getCurrentBatchSize();
    const answeredInBatch = batchItems.filter((item) => item?.answer !== undefined).length;
    return { answered: answeredInBatch, total: batchSize };
  };

  const isCurrentBatchComplete = () => {
    const progress = getCurrentBatchProgress();
    return progress.answered === progress.total;
  };

  const hasMoreBatches = () => {
    return currentBatch < displayStrategy.batches.length - 1;
  };

  const handleInitTest = useCallback(
    (configuredScreenInfo?: ScreenInfo) => {
    const effectiveScreenInfo = configuredScreenInfo ?? screenInfo;
    const levels = getLevels(initialExamType);
    const items: ExamItems = { right: [], left: [], both: [], mode: initialExamType };
    // Compute startLevel FIRST so strategy is based on the actual starting line,
    // not line 0. Far vision line 0 has n=120 (~525px font) which fits only 1 char.
    // Non-stereopsis tests always start with the right eye, so use its own previous result.
    const startLevel = initialExamType === 'stereopsis'
      ? getAutoStartLevel('both')
      : getAutoStartLevel('right');
    const strategy = getDisplayStrategy(
      initialExamType,
      charType,
      startLevel,
      effectiveScreenInfo
    );

    if (initialExamType === 'stereopsis') {
      // Titmus RDS flow: steps generated inside StereopsisStep at runtime.
      items.both = [];
    } else {
      // Generate items for each eye using THAT eye's own strategy (totalChars),
      // not the other eye's — the font size differs per level and per eye start.
      const leftStartLevel = getAutoStartLevel('left');
      const leftStrategy = getDisplayStrategy(
        initialExamType,
        charType,
        leftStartLevel,
        effectiveScreenInfo
      );
      items.right = levels.map(() => generateRandomText(strategy.totalChars, charType));
      items.left = levels.map(() => generateRandomText(leftStrategy.totalChars, charType));
    }

    if (configuredScreenInfo) {
      setScreenInfo(configuredScreenInfo);
    }
    setTestItems(items);
    setCurrentLine(startLevel);
    setStep('instructions');
    setCurrentBatch(0);
    setCurrentBatchCharIndex(0);
    setInputValues(new Array(strategy.totalChars).fill(''));
  }, [initialExamType, charType, getAutoStartLevel, screenInfo]);

  const handleAnswerSelect = useCallback(
    (itemIndex: number, answer: string) => {
      const eyeKey = getEyeKey(initialExamType, step);

      setTestItems((prev) => {
        const updated = { ...prev };
        if (updated[eyeKey][currentLine]?.[itemIndex]) {
          const item = updated[eyeKey][currentLine][itemIndex];
          updated[eyeKey][currentLine][itemIndex] = {
            ...item,
            answer,
            result: evaluateAnswer({ ...item, answer }, initialExamType).result,
          };
        }
        return updated;
      });
    },
    [initialExamType, step, currentLine]
  );

  const handleDirectionSelect = useCallback(
    (_eye: 'right' | 'left' | 'both', result: string) => {
      const batchSize = getCurrentBatchSize();
      if (currentBatchCharIndex >= batchSize) return;

      const absoluteIndex = getCurrentBatchStartIndex() + currentBatchCharIndex;
      handleAnswerSelect(absoluteIndex, result);

      if (currentBatchCharIndex < batchSize - 1) {
        setCurrentBatchCharIndex(currentBatchCharIndex + 1);
      } else if (isCurrentBatchComplete() && hasMoreBatches()) {
        setCurrentBatch(currentBatch + 1);
        setCurrentBatchCharIndex(0);
      }
    },
    [
      currentBatch,
      currentBatchCharIndex,
      handleAnswerSelect,
      getCurrentBatchStartIndex,
      getCurrentBatchSize,
      isCurrentBatchComplete,
      hasMoreBatches,
    ]
  );

  const handleInputChange = useCallback((index: number, value: string) => {
    setInputValues((prev) => {
      const newValues = [...prev];
      newValues[index] = value.trim();
      return newValues;
    });
  }, []);

  const handleSubmitInputs = useCallback(() => {
    const batchItems = getCurrentBatchItems(testEye);
    const startIndex = getCurrentBatchStartIndex();

    batchItems.forEach((_item, idx) => {
      const absoluteIndex = startIndex + idx;
      const value = inputValues[absoluteIndex] || '';
      if (value) {
        handleAnswerSelect(absoluteIndex, value);
      }
    });

    const allInputsFilled = batchItems.every((_item, idx) => {
      const absoluteIndex = startIndex + idx;
      return inputValues[absoluteIndex]?.trim();
    });

    if (allInputsFilled && hasMoreBatches()) {
      setCurrentBatch(currentBatch + 1);
      setCurrentBatchCharIndex(0);
    } else if (allInputsFilled) {
      setInputValues(new Array(displayStrategy.totalChars).fill(''));
    }
  }, [
    testEye,
    inputValues,
    currentBatch,
    getCurrentBatchItems,
    getCurrentBatchStartIndex,
    handleAnswerSelect,
    hasMoreBatches,
    displayStrategy.totalChars,
  ]);

  const handleResetCurrentLine = useCallback(() => {
    if (initialExamType === 'stereopsis') return;
    const eyeKey = getEyeKey(initialExamType, step);
    const strategy = getDisplayStrategy(initialExamType, charType, currentLine);

    setTestItems((prev) => {
      const updated = { ...prev };
      updated[eyeKey][currentLine] = generateRandomText(strategy.totalChars, charType);
      return updated;
    });
    setCurrentBatch(0);
    setCurrentBatchCharIndex(0);
    setInputValues(new Array(strategy.totalChars).fill(''));
  }, [initialExamType, step, currentLine, charType]);

  const handleNextLine = useCallback(
    async (options?: { lineItemsOverride?: ExamItems['right'][number] }) => {
    // Stereopsis test shows all items at once, no batch navigation
    if (initialExamType !== 'stereopsis') {
      if (
        displayStrategy.numberOfBatches > 1 &&
        currentBatch < displayStrategy.batches.length - 1
      ) {
        return;
      }
    }

    const eyeKey = getEyeKey(initialExamType, step);
    const currentTestItem =
      options?.lineItemsOverride ?? testItems[eyeKey][currentLine] ?? [];
    const levels = getLevels(initialExamType);

    const evaluatedLine = currentTestItem.map((item) => evaluateAnswer(item, initialExamType));
    setTestItems((prev) => ({
      ...prev,
      [eyeKey]: [
        ...prev[eyeKey].slice(0, currentLine),
        evaluatedLine,
        ...prev[eyeKey].slice(currentLine + 1),
      ],
    }));

    const accuracy = calculateAccuracy(evaluatedLine);

    // FIX: Determine correct level based on accuracy
    // If accuracy > 0.5 (pass) → continue to next level
    // If accuracy ≤ 0.5 (fail) → save PREVIOUS level (last passed level)
    // Levels are NUMBERS (SOT = backend examResult level smallint).
    let finalLevel: number;

    if (accuracy > 0.5) {
      // Passed current level
      finalLevel = levels[currentLine].level;
    } else {
      // Failed current level → use previous level (last passed)
      // If currentLine = 0 (failed first level), use the easiest level.
      const previousLineIndex = Math.max(0, currentLine - 1);
      finalLevel = levels[previousLineIndex].level;
    }

    if (accuracy > 0.5 && currentLine < levels.length - 1) {
      setCurrentLine(currentLine + 1);
      setCurrentBatch(0);
      setCurrentBatchCharIndex(0);
      setInputValues(new Array(displayStrategy.totalChars).fill(''));
    } else {
      if (step === 'test-right') {
        setRightEyeResult(finalLevel);
        // Reset line to left eye's own previous result so each eye starts at its own baseline.
        setCurrentLine(getAutoStartLevel('left'));
        setCurrentBatch(0);
        setCurrentBatchCharIndex(0);
        setInputValues(new Array(displayStrategy.totalChars).fill(''));
        setStep('switch-eye');
      } else if (step === 'test-left') {
        setLeftEyeResult(finalLevel);

        if (examResultId && testStartedAt) {
          try {
            setIsLoading(true);
            const completedAt = new Date();
            const currentAccuracy = calculateAccuracy(evaluatedLine);

            await updateMyExamResult(examResultId, {
              status: 'completed',
              examType: initialExamType,
              charType,
              accuracy: currentAccuracy,
              rightEyeLevel: rightEyeResult,
              leftEyeLevel: finalLevel,
              bothEyeLevel: undefined,
              distance: initialExamType === 'near' ? parseFloat(distance) : parseFloat(distance),
              startedAt: testStartedAt.toISOString(),
              completedAt: completedAt.toISOString(),
              rawData: testItems,
            });
          } catch (err) {
            setError('Failed to save test results. Please try again.');
          } finally {
            setIsLoading(false);
          }
        }

        setStep('results');
      } else {
        setBothEyeResult(finalLevel);

        if (examResultId && testStartedAt) {
          try {
            setIsLoading(true);
            const completedAt = new Date();
            const currentAccuracy = calculateAccuracy(evaluatedLine);

            await updateMyExamResult(examResultId, {
              status: 'completed',
              examType: initialExamType,
              charType,
              accuracy: currentAccuracy,
              rightEyeLevel: undefined,
              leftEyeLevel: undefined,
              bothEyeLevel: finalLevel,
              distance: initialExamType === 'near' ? parseFloat(distance) : parseFloat(distance),
              startedAt: testStartedAt.toISOString(),
              completedAt: completedAt.toISOString(),
              rawData: testItems,
            });
          } catch (err) {
            setError('Failed to save test results. Please try again.');
          } finally {
            setIsLoading(false);
          }
        }

        setStep('results');
      }
    }
  },
    [
    initialExamType,
    step,
    testItems,
    currentLine,
    currentBatch,
    displayStrategy.batches,
    displayStrategy.numberOfBatches,
    examResultId,
    testStartedAt,
    charType,
    rightEyeResult,
    distance,
    displayStrategy.totalChars,
    getAutoStartLevel, // ← required: used inside to set left-eye start line
  ]
  );

  const handleConfirmAndNext = useCallback(async () => {
    const isTextCharType = charType === 'A' || charType === 'N';
    const eyeKey = getEyeKey(initialExamType, step);

    if (isTextCharType) {
      const batchItems = getCurrentBatchItems(testEye);
      const startIndex = getCurrentBatchStartIndex();
      const batchFilled = batchItems.every((_item, idx) =>
        Boolean(inputValues[startIndex + idx]?.trim())
      );
      if (!batchFilled) return;

      if (hasMoreBatches()) {
        handleSubmitInputs();
        return;
      }

      const baseLine = testItems[eyeKey]?.[currentLine] ?? [];
      const mergedLine = baseLine.map((item, i) => {
        const val = inputValues[i]?.trim().toUpperCase();
        if (!val) return item;
        return {
          ...item,
          answer: val,
          result: evaluateAnswer({ ...item, answer: val }, initialExamType).result,
        };
      });

      flushSync(() => {
        setTestItems((prev) => ({
          ...prev,
          [eyeKey]: [
            ...prev[eyeKey].slice(0, currentLine),
            mergedLine,
            ...prev[eyeKey].slice(currentLine + 1),
          ],
        }));
        setInputValues(new Array(displayStrategy.totalChars).fill(''));
      });

      await handleNextLine({ lineItemsOverride: mergedLine });
      return;
    }

    const lineData = getCurrentLineData(testEye as 'right' | 'left' | 'both');
    if (!lineData.every((i) => i.answer !== undefined && i.answer !== '')) {
      return;
    }

    await handleNextLine();
  }, [
    charType,
    initialExamType,
    step,
    testEye,
    testItems,
    currentLine,
    inputValues,
    displayStrategy.totalChars,
    getCurrentBatchItems,
    getCurrentBatchStartIndex,
    hasMoreBatches,
    handleSubmitInputs,
    handleNextLine,
    getCurrentLineData,
  ]);

  const handleStereopsisComplete = useCallback(
    async (
      stepResults: StereopsisStepResult[],
      failedStepIndex: number,
      steps: StereopsisTestStep[]
    ) => {
      const achievedArcsec = computeAchievedArcsec(steps, failedStepIndex);
      const accuracy = computeStereopsisAccuracy(stepResults, steps.length);

      setBothEyeResult(achievedArcsec);

      const rawData = {
        version: 'titmus-rds-v1',
        steps: steps.map((s) => ({
          type: s.type,
          label: s.label,
          arcsec: s.arcsec,
        })),
        results: stepResults,
        achievedArcsec,
        failedStepIndex,
      };

      setTestItems((prev) => ({
        ...prev,
        both: [stepResults as unknown as typeof prev.both[0]],
      }));

      if (examResultId && testStartedAt) {
        try {
          setIsLoading(true);
          const completedAt = new Date();
          await updateMyExamResult(examResultId, {
            status: 'completed',
            examType: 'stereopsis',
            charType,
            accuracy,
            rightEyeLevel: undefined,
            leftEyeLevel: undefined,
            bothEyeLevel: achievedArcsec ?? undefined,
            distance: parseFloat(distance),
            startedAt: testStartedAt.toISOString(),
            completedAt: completedAt.toISOString(),
            rawData,
          });
        } catch {
          setError('Failed to save test results. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }

      setStep('results');
    },
    [examResultId, testStartedAt, charType, distance]
  );

  const handleStartTest = useCallback(() => {
    setTestStartedAt(new Date());
    if (initialExamType === 'stereopsis') {
      setStep('test-both');
    } else {
      setStep('test-right');
    }
  }, [initialExamType]);

  const handleSwitchToLeftEye = useCallback(() => {
    setStep('test-left');
  }, []);

  return {
    distance,
    charType,
    screenInfo,
    step,
    currentLine,
    testItems,
    rightEyeResult,
    leftEyeResult,
    bothResult,
    currentBatch,
    currentBatchCharIndex,
    inputValues,
    screenParams,
    isLoading,
    error,
    currentBatchItems: getCurrentBatchItems(testEye),
    fontSize: getFontSize(testMode),
    visualAcuity: getVisualAcuityValues(testMode === 'stereopsis' ? 'far' : testMode, currentLine),
    testEye,
    testMode,
    testContrast,
    displayStrategy,
    examType: initialExamType,
    examSessionId, // NEW: Expose examSessionId to components
    setDistance,
    setCharType,
    setScreenInfo,
    setStep,
    setCurrentLine,
    setCurrentBatch,
    setCurrentBatchCharIndex,
    handleInitTest,
    handleAnswerSelect,
    handleResetCurrentLine,
    handleNextLine,
    handleConfirmAndNext,
    handleStartTest,
    handleSwitchToLeftEye,
    handleDirectionSelect,
    handleInputChange,
    handleSubmitInputs,
    handleStereopsisComplete,
    getCurrentLineData,
    getCurrentBatchStartIndex,
  };
};

export type ExamStateType = ReturnType<typeof useExamState>;
