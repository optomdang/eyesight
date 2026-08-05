/**
 * Helpers for single-character optotype answer boxes (letters/digits).
 * Prevents Vietnamese Telex IME diacritics and focus-race leaks that write the
 * same keystroke into the next box (or double-advance the caret).
 *
 * Fast typing: a second keystroke must NOT be dropped while focus is still on
 * the previous box — it is redirected to the next empty box instead.
 */

/** Strip combining marks / telex product and keep one ASCII letter or digit. */
export function toOptotypeInputChar(raw: string, numbersOnly = false): string {
  if (!raw) return '';
  const base = raw.normalize('NFD').replace(/\p{M}/gu, '');
  const matches = numbersOnly ? base.match(/[0-9]/g) : base.match(/[A-Za-z0-9]/g);
  if (!matches?.length) return '';
  // Prefer the last alphanumeric — when a race dumps two keystrokes into one box.
  return matches[matches.length - 1].toUpperCase();
}

/** Shared HTML input attributes that discourage IME / autocorrect. */
export const OPTOTYPE_LATIN_INPUT_ATTRS = {
  maxLength: 1,
  lang: 'en',
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'characters',
  spellCheck: false,
  inputMode: 'text' as const,
};

/**
 * Brief lock so the SAME keystroke that filled box N cannot also land in box N+1
 * after auto-focus. Must stay short — fast typists exceed 100ms between keys.
 */
export const OPTOTYPE_FOCUS_LEAK_SUPPRESS_MS = 50;

/** Collapse keydown + beforeInput for the same char on the same field. */
export const OPTOTYPE_COMMIT_DEBOUNCE_MS = 45;

export type OptotypeCommitDecision =
  | { action: 'accept'; index: number }
  | { action: 'duplicate' }
  | { action: 'overflow'; index: number };

export type OptotypeFocusLeakGuard = {
  /** Lock next field against the leaked char from the keystroke that just advanced. */
  armNextField: (nextAbsoluteIndex: number, leakedChar: string) => void;
  /**
   * True when this field should drop input (focus-race of the previous keystroke).
   * Only the leaked character is ignored — a different fast keystroke is allowed.
   */
  shouldIgnore: (absoluteIndex: number, incomingChar?: string) => boolean;
  /**
   * Decide where a keystroke should land.
   * - accept: commit on `index`
   * - duplicate: keydown+beforeInput same gesture — drop
   * - overflow: this field just accepted a different char — commit on next index
   */
  decideCommit: (absoluteIndex: number, char: string) => OptotypeCommitDecision;
};

export function createOptotypeFocusLeakGuard(
  suppressMs: number = OPTOTYPE_FOCUS_LEAK_SUPPRESS_MS,
  commitDebounceMs: number = OPTOTYPE_COMMIT_DEBOUNCE_MS
): OptotypeFocusLeakGuard {
  let lockedIndex = -1;
  let lockedChar = '';
  let lockedUntil = 0;
  let lastCommitIndex = -1;
  let lastCommitChar = '';
  let lastCommitUntil = 0;

  return {
    armNextField(nextAbsoluteIndex, leakedChar) {
      lockedIndex = nextAbsoluteIndex;
      lockedChar = leakedChar;
      lockedUntil = performance.now() + suppressMs;
    },
    shouldIgnore(absoluteIndex, incomingChar) {
      if (absoluteIndex !== lockedIndex || performance.now() >= lockedUntil) {
        return false;
      }
      // No char provided → ignore any input during the short lock (legacy callers).
      if (incomingChar == null || incomingChar === '') return true;
      // Only suppress the character that leaked from the previous box.
      return incomingChar === lockedChar;
    },
    decideCommit(absoluteIndex, char) {
      const now = performance.now();

      if (
        absoluteIndex === lastCommitIndex &&
        now < lastCommitUntil &&
        char === lastCommitChar
      ) {
        return { action: 'duplicate' };
      }

      // Fast typing: next key arrived before focus moved — send to the next box.
      if (
        absoluteIndex === lastCommitIndex &&
        now < lastCommitUntil &&
        char !== lastCommitChar
      ) {
        const nextIndex = absoluteIndex + 1;
        lastCommitIndex = nextIndex;
        lastCommitChar = char;
        lastCommitUntil = now + commitDebounceMs;
        return { action: 'overflow', index: nextIndex };
      }

      lastCommitIndex = absoluteIndex;
      lastCommitChar = char;
      lastCommitUntil = now + commitDebounceMs;
      return { action: 'accept', index: absoluteIndex };
    },
  };
}
