/**
 * Far Acuity Exercise — adaptive 2D state machine.
 *
 * Two training modes:
 *
 * ## 'contrast' (Thị lực tương phản)
 *   Axes: farLevel (1–20) × contrastLevel (1–16, higher = harder/more faded)
 *   Pass, contrastLevel < CONTRAST_LEVEL_MAX  → contrastLevel += 1
 *   Pass, contrastLevel ≥ max, farLevel < max  → farLevel += 1, contrastLevel = 1
 *   Pass at maximum difficulty → stay
 *   Fail, contrastLevel > 1   → contrastLevel -= 1
 *   Fail, contrastLevel === 1, farLevel > 1  → farLevel -= 1, contrastLevel = CONTRAST_LEVEL_MAX
 *   Fail at minimum difficulty → stay
 *
 * ## 'acuity' (Thị lực xa / Thị lực gần)
 *   Axis: farLevel only; contrastLevel locked at 1 (100% contrast)
 *   Correct → passStreak += 1; failStreak = 0; new random letters
 *   passStreak reaches ACUITY_STREAK_TARGET → farLevel += 1, passStreak = 0
 *   Wrong  → failStreak += 1; passStreak = 0; new random letters
 *   failStreak reaches ACUITY_FAIL_TARGET → farLevel -= 1 (if > min), failStreak = 0
 */

import { useCallback, useRef, useState } from 'react';
import { farVisionLevels, nearVisionLevels, contrastVisionLevels } from 'src/utils/constant';
import { generateRandomText } from 'src/utils/visionUtils';
import { evaluateAnswer } from 'src/utils/examUtils';

export const FAR_ACUITY_CHAR_COUNT = 5;
export const FAR_LEVEL_MIN = 1;
export const FAR_LEVEL_MAX = farVisionLevels.length;
export const CONTRAST_LEVEL_MIN = 1;
/** Absolute max contrast step (full clinical ladder including designated starts like logCS 1.80). */
export const CONTRAST_LEVEL_ABSOLUTE_MAX = contrastVisionLevels.length;
/** Adaptive training ceiling (logCS 1.65); pass at/above this advances letter size. */
export const FAR_ACUITY_MAX_LOG_CS = 1.65;
export const CONTRAST_LEVEL_MAX =
  contrastVisionLevels.find((l) => parseFloat(l.score) === FAR_ACUITY_MAX_LOG_CS)?.level ??
  CONTRAST_LEVEL_ABSOLUTE_MAX;

/** Acuity mode: consecutive correct rounds required before advancing to the next size level. */
export const ACUITY_STREAK_TARGET = 10;
/** Acuity mode: consecutive fail rounds at a size before dropping back to the previous (easier) size. */
export const ACUITY_FAIL_TARGET = 5;

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
  /** Consecutive correct rounds at the current level (acuity mode: drives level advance). */
  passStreak: number;
  /** Consecutive fail rounds at the current level (acuity mode: drives level drop). */
  failStreak: number;
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
  /** Active training mode (contrast or acuity). */
  trainingMode: 'contrast' | 'acuity';
  /** Number of consecutive correct answers needed to advance level in acuity mode. */
  streakTarget: number;
  /** Number of consecutive fail rounds at a size before dropping back (acuity mode). */
  failTarget: number;
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
  /**
   * 'contrast' → adaptive contrast + size training (Thị lực tương phản).
   * 'acuity'   → streak-based size advancement only, contrast locked at 100%
   *              (Thị lực xa / Thị lực gần).
   * Defaults to 'contrast'.
   */
  trainingMode?: 'contrast' | 'acuity';
}

export function useFarAcuityEngine(options: UseFarAcuityEngineOptions = {}): FarAcuityEngineReturn {
  const charType = options.charType ?? 'A';
  const charTypeRef = useRef<FarAcuityCharType>(charType);
  charTypeRef.current = charType;
  const visionType = options.visionType ?? 'far';
  const acuityLevelMaxRef = useRef(getAcuityLevelMax(visionType));
  acuityLevelMaxRef.current = getAcuityLevelMax(visionType);
  const trainingModeRef = useRef<'contrast' | 'acuity'>(options.trainingMode ?? 'contrast');
  trainingModeRef.current = options.trainingMode ?? 'contrast';

  const [state, setState] = useState<FarAcuityEngineState>(() => {
    if (options.initialState) return options.initialState;
    const acuityLevelMax = getAcuityLevelMax(options.visionType ?? 'far');
    const farLevel = Math.max(FAR_LEVEL_MIN, Math.min(acuityLevelMax, options.initialFarLevel ?? 1));
    const contrastLevel = Math.max(
      CONTRAST_LEVEL_MIN,
      Math.min(CONTRAST_LEVEL_ABSOLUTE_MAX, options.initialContrastLevel ?? 1)
    );
    return {
      farLevel,
      contrastLevel,
      letters: generateLetters(charType),
      passStreak: 0,
      failStreak: 0,
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
      let nextFailStreak = prev.failStreak ?? 0;
      let lettersChanged = false;

      if (trainingModeRef.current === 'acuity') {
        // ── Acuity mode: contrast stays at 100%, streak-based size advancement ──
        nextContrastLevel = CONTRAST_LEVEL_MIN;
        if (passed) {
          nextFailStreak = 0;
          const newStreak = prev.passStreak + 1;
          if (newStreak >= ACUITY_STREAK_TARGET && prevFarLevel < acuityLevelMaxRef.current) {
            // 10 correct in a row → advance to harder (smaller) size
            nextFarLevel = prevFarLevel + 1;
            nextPassStreak = 0;
          } else {
            nextPassStreak = Math.min(newStreak, ACUITY_STREAK_TARGET);
          }
        } else {
          nextPassStreak = 0;
          const newFailStreak = (prev.failStreak ?? 0) + 1;
          if (newFailStreak >= ACUITY_FAIL_TARGET && prevFarLevel > FAR_LEVEL_MIN) {
            // 5 fails in a row → drop back to easier (larger) size
            nextFarLevel = prevFarLevel - 1;
            nextFailStreak = 0;
          } else {
            nextFailStreak = newFailStreak;
          }
        }
        lettersChanged = true; // always fresh letters for variety
      } else {
        // ── Contrast mode: adaptive contrast + size staircase ──
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
            // Drop a size AND reset contrast to hardest: patient must now work up
            // the full contrast ladder at the easier size.
            nextFarLevel = prevFarLevel - 1;
            nextContrastLevel = CONTRAST_LEVEL_MAX;
          }
        }
        lettersChanged = nextContrastLevel !== prevContrastLevel || nextFarLevel !== prevFarLevel;
      }

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
        failStreak: nextFailStreak,
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
          Math.min(CONTRAST_LEVEL_ABSOLUTE_MAX, opts?.contrastLevel ?? CONTRAST_LEVEL_MIN)
        );
        return {
          farLevel,
          contrastLevel,
          letters: generateLetters(charTypeRef.current),
          passStreak: 0,
          failStreak: 0,
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
      failStreak: 0,
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
    trainingMode: trainingModeRef.current,
    streakTarget: ACUITY_STREAK_TARGET,
    failTarget: ACUITY_FAIL_TARGET,
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
