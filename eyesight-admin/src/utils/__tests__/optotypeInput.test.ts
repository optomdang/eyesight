import { describe, it, expect } from 'vitest';
import { toOptotypeInputChar } from '../optotypeInput';

describe('toOptotypeInputChar', () => {
  it('uppercases a single latin letter', () => {
    expect(toOptotypeInputChar('u')).toBe('U');
    expect(toOptotypeInputChar('x')).toBe('X');
  });

  it('strips vietnamese diacritics (Ũ → U)', () => {
    expect(toOptotypeInputChar('Ũ')).toBe('U');
    expect(toOptotypeInputChar('ứ')).toBe('U');
    expect(toOptotypeInputChar('ẵ')).toBe('A');
  });

  it('keeps only the first printable latin/digit char', () => {
    expect(toOptotypeInputChar('UX')).toBe('U');
    expect(toOptotypeInputChar('12')).toBe('1');
  });

  it('supports numbers-only mode', () => {
    expect(toOptotypeInputChar('A3', true)).toBe('3');
    expect(toOptotypeInputChar('A', true)).toBe('');
  });

  it('returns empty for empty / non-latin', () => {
    expect(toOptotypeInputChar('')).toBe('');
    expect(toOptotypeInputChar(' ')).toBe('');
  });
});
