/**
 * Far Acuity Exercise — adaptive 2D state machine.
 *
 * Axes:
 *   farLevel    1–20  (index into farVisionLevels; higher = smaller letters)
 *   contrastLevel 1–12  (index into contrastVisionLevels; higher = lower contrast; max logCS 1.65)
 *
 * Round rules (accuracy = correct / 5, pass = accuracy > 0.5):
 *   Pass, contrastLevel < 12  → contrastLevel += 1; new letters
 *   Pass, contrastLevel === 12, farLevel < 20  → farLevel += 1, contrastLevel = 1, new letters
 *   Pass at maximum difficulty → stay
 *   Fail, contrastLevel > 1   → contrastLevel -= 1; new letters
 *   Fail, contrastLevel === 1, farLevel > 1  → farLevel -= 1, new letters
 *   Fail at minimum difficulty → stay
 */

import { useCallback, useRef, useState } from 'react';
import { farVisionLevels, nearVisionLevels, contrastVisionLevels } from 'src/utils/constant';
import { generateRandomText } from 'src/utils/visionUtils';
import { evaluateAnswer } from 'src/utils/examUtils';

export const FAR_ACUITY_CHAR_COUNT = 5;
export const FAR_LEVEL_MIN = 1;
export const FAR_LEVEL_MAX = farVisionLevels.length;
export const CONTRAST_LEVEL_MIN = 1;
/** Hardest contrast step for far-acuity exercise (logCS 1.65); lower contrast is not usable. */
export const FAR_ACUITY_MAX_LOG_CS = 1.65;
export const CONTRAST_LEVEL_MAX =
  contrastVisionLevels.find((l) => parseFloat(l.score) === FAR_ACUITY_MAX_LOG_CS)?.level ??
  contrastVisionLevels.length;

export type FarAcuityCharType = 'E' | 'C' | 'A' | 'N' | 'S';

export interface FarAcuityLetter {
  char: FarAcuityCharType;
  display: string;
  answer?: string;
}

export interface FarAcuityRoundResult {
  accuracy: number;
  passed: boolean;
  prevFarLevel: number;
  prevContrastLevel: number;
  nextFarLevel: number;
  nextContrastLevel: number;
  lettersChanged: boolean;
}

export interface FarAcuityEngineState {
  farLevel: number;
  contrastLevel: number;
  letters: FarAcuityLetter[];
  /** How many times the current (farLevel, contrastLevel) combo has been passed in a row.
   *  Used to decide whether to keep or refresh letters on pass. */
  passStreak: number;
  roundsCompleted: number;
  peakFarLevel: number;
  peakContrastLevel: number;
}

export interface FarAcuityEngineReturn {
  state: FarAcuityEngineState;
  /** Record a single answer (0-based index). Call as user fills each cell. */
  setAnswer: (index: number, answer: string) => void;
  /** All 5 chars answered (or force-submitted). Grade & advance state. */
  submitRound: () => FarAcuityRoundResult;
  /** Serialize for pause/resume */
  serializeForPause: () => FarAcuityEngineState;
  restoreFromSnapshot: (snapshot: FarAcuityEngineState) => void;
  /**
   * Re-initialize the session (fresh letters, reset levels/peaks).
   * Used when the starting far level or charType resolves asynchronously
   * after mount, before any round has been played.
   */
  resetSession: (opts?: { farLevel?: number; contrastLevel?: number; charType?: FarAcuityCharType }) => void;
  /** Same far/contrast levels, new random letters, answers cleared */
  regenerateLetters: () => void;
  /** True when all 5 answers are filled */
  allAnswered: boolean;
}

function generateLetters(charType: FarAcuityCharType): FarAcuityLetter[] {
  return generateRandomText(FAR_ACUITY_CHAR_COUNT, charType) as FarAcuityLetter[];
}

export type FarAcuityVisionType = 'far' | 'near';

export function getAcuityLevelMax(visionType: FarAcuityVisionType = 'far'): number {
  return visionType === 'near' ? nearVisionLevels.length : farVisionLevels.length;
}

export interface UseFarAcuityEngineOptions {
  /** Starting acuity level (1-based, far or near table). Defaults to 1. */
  initialFarLevel?: number;
  /** Starting contrast level (1-based). Defaults to 1 (100%). */
  initialContrastLevel?: number;
  /** Char type used for the whole session. */
  charType?: FarAcuityCharType;
  /** Resume from a saved snapshot. */
  initialState?: FarAcuityEngineState;
  /** Which acuity table to use for level bounds and display. */
  visionType?: FarAcuityVisionType;
}

export function useFarAcuityEngine(options: UseFarAcuityEngineOptions = {}): FarAcuityEngineReturn {
  const charType = options.charType ?? 'A';
  const charTypeRef = useRef<FarAcuityCharType>(charType);
  charTypeRef.current = charType;
  const visionType = options.visionType ?? 'far';
  const acuityLevelMaxRef = useRef(getAcuityLevelMax(visionType));
  acuityLevelMaxRef.current = getAcuityLevelMax(visionType);

  const [state, setState] = useState<FarAcuityEngineState>(() => {
    if (options.initialState) return options.initialState;
    const acuityLevelMax = getAcuityLevelMax(options.visionType ?? 'far');
    const farLevel = Math.max(FAR_LEVEL_MIN, Math.min(acuityLevelMax, options.initialFarLevel ?? 1));
    const contrastLevel = Math.max(CONTRAST_LEVEL_MIN, Math.min(CONTRAST_LEVEL_MAX, options.initialContrastLevel ?? 1));
    return {
      farLevel,
      contrastLevel,
      letters: generateLetters(charType),
      passStreak: 0,
      roundsCompleted: 0,
      peakFarLevel: farLevel,
      peakContrastLevel: contrastLevel,
    };
  });

  const setAnswer = useCallback((index: number, answer: string) => {
    setState((prev) => {
      const letters = prev.letters.map((l, i) => (i === index ? { ...l, answer } : l));
      return { ...prev, letters };
    });
  }, []);

  const submitRound = useCallback((): FarAcuityRoundResult => {
    let result: FarAcuityRoundResult = {
      accuracy: 0,
      passed: false,
      prevFarLevel: 0,
      prevContrastLevel: 0,
      nextFarLevel: 0,
      nextContrastLevel: 0,
      lettersChanged: false,
    };

    setState((prev) => {
      const evaluated = prev.letters.map((l) => evaluateAnswer({ ...l }, 'far'));
      const correct = evaluated.filter((l) => l.result).length;
      const accuracy = correct / FAR_ACUITY_CHAR_COUNT;
      const passed = accuracy > 0.5;

      const prevFarLevel = prev.farLevel;
      const prevContrastLevel = prev.contrastLevel;

      let nextFarLevel = prevFarLevel;
      let nextContrastLevel = prevContrastLevel;
      let nextPassStreak = prev.passStreak;
      let lettersChanged = false;

      if (passed) {
        if (prevContrastLevel < CONTRAST_LEVEL_MAX) {
          nextContrastLevel = prevContrastLevel + 1;
          nextPassStreak = prev.passStreak + 1;
        } else if (prevFarLevel < acuityLevelMaxRef.current) {
          nextFarLevel = prevFarLevel + 1;
          nextContrastLevel = CONTRAST_LEVEL_MIN;
          nextPassStreak = 0;
        }
      } else {
        nextPassStreak = 0;
        if (prevContrastLevel > CONTRAST_LEVEL_MIN) {
          nextContrastLevel = prevContrastLevel - 1;
        } else if (prevFarLevel > FAR_LEVEL_MIN) {
          nextFarLevel = prevFarLevel - 1;
        }
      }

      // Always new letters when logCS or Snellen level changes
      lettersChanged =
        nextContrastLevel !== prevContrastLevel || nextFarLevel !== prevFarLevel;

      const newLetters = lettersChanged
        ? generateLetters(charTypeRef.current)
        : prev.letters.map((l) => ({ char: l.char, display: l.display }));

      const nextPeakFarLevel = Math.max(prev.peakFarLevel, nextFarLevel);
      const nextPeakContrastLevel = Math.max(prev.peakContrastLevel, nextContrastLevel);

      result = {
        accuracy,
        passed,
        prevFarLevel,
        prevContrastLevel,
        nextFarLevel,
        nextContrastLevel,
        lettersChanged,
      };

      return {
        farLevel: nextFarLevel,
        contrastLevel: nextContrastLevel,
        letters: newLetters,
        passStreak: nextPassStreak,
        roundsCompleted: prev.roundsCompleted + 1,
        peakFarLevel: nextPeakFarLevel,
        peakContrastLevel: nextPeakContrastLevel,
      };
    });

    return result;
  }, []);

  const serializeForPause = useCallback((): FarAcuityEngineState => state, [state]);

  const restoreFromSnapshot = useCallback((snapshot: FarAcuityEngineState) => {
    setState(snapshot);
  }, []);

  const resetSession = useCallback(
    (opts?: { farLevel?: number; contrastLevel?: number; charType?: FarAcuityCharType }) => {
      if (opts?.charType) charTypeRef.current = opts.charType;
      setState((prev) => {
        const acuityLevelMax = acuityLevelMaxRef.current;
        const farLevel = Math.max(
          FAR_LEVEL_MIN,
          Math.min(acuityLevelMax, opts?.farLevel ?? prev.farLevel)
        );
        const contrastLevel = Math.max(
          CONTRAST_LEVEL_MIN,
          Math.min(CONTRAST_LEVEL_MAX, opts?.contrastLevel ?? CONTRAST_LEVEL_MIN)
        );
        return {
          farLevel,
          contrastLevel,
          letters: generateLetters(charTypeRef.current),
          passStreak: 0,
          roundsCompleted: 0,
          peakFarLevel: farLevel,
          peakContrastLevel: contrastLevel,
        };
      });
    },
    []
  );

  const regenerateLetters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      letters: generateLetters(charTypeRef.current),
      passStreak: 0,
    }));
  }, []);

  const allAnswered = state.letters.every((l) => l.answer !== undefined && l.answer !== '');

  return {
    state,
    setAnswer,
    submitRound,
    serializeForPause,
    restoreFromSnapshot,
    resetSession,
    regenerateLetters,
    allAnswered,
  };
}

// ── Pure helpers (exported for tests & rendering) ───────────────────────────

export function getFarLevelInfo(farLevel: number) {
  return farVisionLevels[farLevel - 1] ?? farVisionLevels[0];
}

export function getNearLevelInfo(nearLevel: number) {
  return nearVisionLevels[nearLevel - 1] ?? nearVisionLevels[0];
}

export function getAcuityLevelInfo(visionType: FarAcuityVisionType, level: number) {
  return visionType === 'near' ? getNearLevelInfo(level) : getFarLevelInfo(level);
}

export function getContrastLevelInfo(contrastLevel: number) {
  return contrastVisionLevels[contrastLevel - 1] ?? contrastVisionLevels[0];
}
