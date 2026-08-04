/**
 * Helpers for single-character optotype answer boxes (letters/digits).
 * Prevents Vietnamese Telex IME from applying diacritics across adjacent fields
 * and blocks the common “key leak” where the same keystroke is written into the
 * next box after auto-advance (e.g. typed C,K but answers become C,C).
 */

/** Strip combining marks / telex product and keep one ASCII letter or digit. */
export function toOptotypeInputChar(raw: string, numbersOnly = false): string {
  if (!raw) return '';
  const base = raw.normalize('NFD').replace(/\p{M}/gu, '');
  const matches = numbersOnly ? base.match(/[0-9]/g) : base.match(/[A-Za-z0-9]/g);
  if (!matches?.length) return '';
  // Prefer the last alphanumeric — when focus-race / IME dumps two keystrokes
  // into one box ("CK"), keep the most recently typed character.
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

/** How long to ignore leaked keystrokes on the next field after auto-advance. */
export const OPTOTYPE_FOCUS_LEAK_SUPPRESS_MS = 100;

export type OptotypeFocusLeakGuard = {
  /** Call after committing a char and before focusing the next field. */
  armNextField: (nextAbsoluteIndex: number, committedChar: string) => void;
  /** True when this field should ignore a leaked duplicate of the previous key. */
  shouldIgnore: (absoluteIndex: number, candidateChar: string) => boolean;
};

/**
 * Suppresses the duplicate character that can land on the newly focused field
 * in the same keystroke turn (keydown → setState → focus next → leftover input).
 */
export function createOptotypeFocusLeakGuard(
  suppressMs: number = OPTOTYPE_FOCUS_LEAK_SUPPRESS_MS
): OptotypeFocusLeakGuard {
  let until = 0;
  let index = -1;
  let char = '';

  return {
    armNextField(nextAbsoluteIndex, committedChar) {
      if (!committedChar) return;
      index = nextAbsoluteIndex;
      char = committedChar;
      until = performance.now() + suppressMs;
    },
    shouldIgnore(absoluteIndex, candidateChar) {
      if (absoluteIndex !== index || !candidateChar) return false;
      if (performance.now() >= until) return false;
      return candidateChar === char;
    },
  };
}
