import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  toOptotypeInputChar,
  createOptotypeFocusLeakGuard,
  OPTOTYPE_FOCUS_LEAK_SUPPRESS_MS,
  OPTOTYPE_COMMIT_DEBOUNCE_MS,
} from '../optotypeInput';

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

  it('keeps the last printable latin/digit when multiple arrive in one event', () => {
    expect(toOptotypeInputChar('UX')).toBe('X');
    expect(toOptotypeInputChar('CK')).toBe('K');
    expect(toOptotypeInputChar('12')).toBe('2');
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

describe('createOptotypeFocusLeakGuard', () => {
  beforeEach(() => {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks only the leaked character on the next field', () => {
    const guard = createOptotypeFocusLeakGuard(100);
    guard.armNextField(1, 'C');

    expect(guard.shouldIgnore(1, 'C')).toBe(true);
    expect(guard.shouldIgnore(1, 'S')).toBe(false);
    expect(guard.shouldIgnore(0, 'C')).toBe(false);
  });

  it('stops locking after the window elapses', () => {
    const guard = createOptotypeFocusLeakGuard(OPTOTYPE_FOCUS_LEAK_SUPPRESS_MS);
    guard.armNextField(1, 'C');

    vi.spyOn(performance, 'now').mockReturnValue(1000 + OPTOTYPE_FOCUS_LEAK_SUPPRESS_MS + 1);
    expect(guard.shouldIgnore(1, 'C')).toBe(false);
  });

  it('collapses keydown+beforeInput into a single commit', () => {
    const guard = createOptotypeFocusLeakGuard(100, OPTOTYPE_COMMIT_DEBOUNCE_MS);
    expect(guard.decideCommit(0, 'C')).toEqual({ action: 'accept', index: 0 });
    expect(guard.decideCommit(0, 'C')).toEqual({ action: 'duplicate' });

    vi.spyOn(performance, 'now').mockReturnValue(1000 + OPTOTYPE_COMMIT_DEBOUNCE_MS + 1);
    expect(guard.decideCommit(0, 'C')).toEqual({ action: 'accept', index: 0 });
  });

  it('forwards a different fast keystroke to the next box (overflow)', () => {
    const guard = createOptotypeFocusLeakGuard(100, OPTOTYPE_COMMIT_DEBOUNCE_MS);
    expect(guard.decideCommit(0, 'C')).toEqual({ action: 'accept', index: 0 });
    // Second key while still on box 0 — must not be dropped
    expect(guard.decideCommit(0, 'S')).toEqual({ action: 'overflow', index: 1 });
  });
});
