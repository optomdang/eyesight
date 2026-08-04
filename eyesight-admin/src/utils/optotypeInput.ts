/**
 * Helpers for single-character optotype answer boxes (letters/digits).
 * Prevents Vietnamese Telex IME diacritics and focus-race leaks that write the
 * same keystroke into the next box (or double-advance the caret).
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

/** Ignore ALL input on the next field after auto-advance (not only same char). */
export const OPTOTYPE_FOCUS_LEAK_SUPPRESS_MS = 220;

/** Ignore a second commit on the same field from keydown+beforeInput in one gesture. */
export const OPTOTYPE_COMMIT_DEBOUNCE_MS = 80;

export type OptotypeFocusLeakGuard = {
  /** Lock the next field against any input after advancing. */
  armNextField: (nextAbsoluteIndex: number) => void;
  /** True while this field should ignore leaked / duplicate input. */
  shouldIgnore: (absoluteIndex: number) => boolean;
  /**
   * Returns false if this field already accepted a char in the debounce window
   * (keydown + beforeInput both firing). True if the commit should proceed.
   */
  tryBeginCommit: (absoluteIndex: number) => boolean;
};

export function createOptotypeFocusLeakGuard(
  suppressMs: number = OPTOTYPE_FOCUS_LEAK_SUPPRESS_MS,
  commitDebounceMs: number = OPTOTYPE_COMMIT_DEBOUNCE_MS
): OptotypeFocusLeakGuard {
  let lockedIndex = -1;
  let lockedUntil = 0;
  let lastCommitIndex = -1;
  let lastCommitUntil = 0;

  return {
    armNextField(nextAbsoluteIndex) {
      lockedIndex = nextAbsoluteIndex;
      lockedUntil = performance.now() + suppressMs;
    },
    shouldIgnore(absoluteIndex) {
      return absoluteIndex === lockedIndex && performance.now() < lockedUntil;
    },
    tryBeginCommit(absoluteIndex) {
      const now = performance.now();
      if (absoluteIndex === lastCommitIndex && now < lastCommitUntil) {
        return false;
      }
      lastCommitIndex = absoluteIndex;
      lastCommitUntil = now + commitDebounceMs;
      return true;
    },
  };
}
