/**
 * Helpers for single-character optotype answer boxes (letters/digits).
 * Prevents Vietnamese Telex IME from applying diacritics across adjacent fields
 * (e.g. typing "U" then "X" in the next box turning the first into "Ũ").
 */

/** Strip combining marks / telex product and keep one ASCII letter or digit. */
export function toOptotypeInputChar(raw: string, numbersOnly = false): string {
  if (!raw) return '';
  const base = raw.normalize('NFD').replace(/\p{M}/gu, '');
  const match = numbersOnly ? base.match(/[0-9]/) : base.match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : '';
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
