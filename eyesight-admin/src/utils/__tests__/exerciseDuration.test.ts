import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatExerciseDuration,
  getEffectiveExerciseDurationSeconds,
  getReportedTimeoutDurationSeconds,
  getInactivityThresholdMs,
  DEFAULT_INACTIVITY_THRESHOLD_SECONDS,
} from '../exerciseDuration';

declare global {
  interface Window {
    __E2E_EXERCISE_DURATION_SECONDS?: number;
  }
}

describe('exerciseDuration fast E2E override', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.__E2E_EXERCISE_DURATION_SECONDS;
  });

  it('keeps the configured duration when no override is present', () => {
    expect(getEffectiveExerciseDurationSeconds(10)).toBe(600);
    expect(formatExerciseDuration(10)).toBe('10 phút');
  });

  it('clamps long durations to the configured E2E override seconds', () => {
    vi.stubEnv('VITE_E2E_EXERCISE_DURATION_SECONDS', '30');

    expect(getEffectiveExerciseDurationSeconds(10)).toBe(30);
    expect(formatExerciseDuration(10)).toBe('30 giây');
  });

  it('never lengthens an already shorter exercise duration', () => {
    vi.stubEnv('VITE_E2E_EXERCISE_DURATION_SECONDS', '60');

    expect(getEffectiveExerciseDurationSeconds(0.5)).toBe(30);
    expect(formatExerciseDuration(0.5)).toBe('0.5 phút');
  });

  it('prefers the runtime window override over the env value', () => {
    vi.stubEnv('VITE_E2E_EXERCISE_DURATION_SECONDS', '60');
    window.__E2E_EXERCISE_DURATION_SECONDS = 45;

    expect(getEffectiveExerciseDurationSeconds(10)).toBe(45);
    expect(formatExerciseDuration(10)).toBe('45 giây');
  });

  it('reports the original configured timeout duration to backend when fast mode triggers timeout', () => {
    vi.stubEnv('VITE_E2E_EXERCISE_DURATION_SECONDS', '30');

    expect(getReportedTimeoutDurationSeconds(10)).toBe(600);
  });

  it('keeps the real duration for already short exercises when reporting timeout', () => {
    vi.stubEnv('VITE_E2E_EXERCISE_DURATION_SECONDS', '60');

    expect(getReportedTimeoutDurationSeconds(0.5)).toBe(30);
  });
});

describe('getInactivityThresholdMs', () => {
  it('uses the configured threshold (seconds → ms)', () => {
    expect(getInactivityThresholdMs(40)).toBe(40000);
    expect(getInactivityThresholdMs(15)).toBe(15000);
  });

  it('reads inactivityThreshold from ExerciseConfig object', () => {
    expect(getInactivityThresholdMs({ inactivityThreshold: 45 })).toBe(45000);
    expect(getInactivityThresholdMs({ inactivityThreshold: null })).toBe(
      DEFAULT_INACTIVITY_THRESHOLD_SECONDS * 1000
    );
  });

  it('falls back to default 30s when null/undefined/invalid', () => {
    const defaultMs = DEFAULT_INACTIVITY_THRESHOLD_SECONDS * 1000;
    expect(getInactivityThresholdMs(undefined)).toBe(defaultMs);
    expect(getInactivityThresholdMs(null)).toBe(defaultMs);
    expect(getInactivityThresholdMs(0)).toBe(defaultMs);
    expect(getInactivityThresholdMs(-5)).toBe(defaultMs);
  });
});
