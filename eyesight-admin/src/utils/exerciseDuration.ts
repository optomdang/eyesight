declare global {
  interface Window {
    __E2E_EXERCISE_DURATION_SECONDS?: number;
  }
}

const parsePositiveNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export const getExerciseDurationOverrideSeconds = (): number | null => {
  const runtimeOverride =
    typeof window !== 'undefined'
      ? parsePositiveNumber(window.__E2E_EXERCISE_DURATION_SECONDS)
      : null;

  if (runtimeOverride !== null) {
    return runtimeOverride;
  }

  return parsePositiveNumber(import.meta.env.VITE_E2E_EXERCISE_DURATION_SECONDS);
};

export const getEffectiveExerciseDurationSeconds = (
  durationMinutes?: number | null
): number | null => {
  const configuredSeconds = parsePositiveNumber(durationMinutes)
    ? Number(durationMinutes) * 60
    : null;

  if (configuredSeconds === null) {
    return null;
  }

  const overrideSeconds = getExerciseDurationOverrideSeconds();
  if (overrideSeconds === null) {
    return configuredSeconds;
  }

  return Math.min(configuredSeconds, overrideSeconds);
};

export const getReportedTimeoutDurationSeconds = (
  durationMinutes?: number | null
): number | null => {
  const configuredSeconds = parsePositiveNumber(durationMinutes)
    ? Number(durationMinutes) * 60
    : null;

  if (configuredSeconds === null) {
    return null;
  }

  const effectiveSeconds = getEffectiveExerciseDurationSeconds(durationMinutes);
  if (effectiveSeconds === null) {
    return configuredSeconds;
  }

  return effectiveSeconds < configuredSeconds ? configuredSeconds : effectiveSeconds;
};

export const getEffectiveExerciseDurationMs = (durationMinutes?: number | null): number | null => {
  const effectiveSeconds = getEffectiveExerciseDurationSeconds(durationMinutes);
  return effectiveSeconds === null ? null : effectiveSeconds * 1000;
};

/**
 * Default inactivity window (giây) khi ExerciseConfig không cấu hình.
 */
export const DEFAULT_INACTIVITY_THRESHOLD_SECONDS = 30;

type InactivityThresholdSource =
  | number
  | null
  | undefined
  | { inactivityThreshold?: number | null };

const resolveInactivityThresholdSeconds = (source?: InactivityThresholdSource): number => {
  const raw =
    source != null && typeof source === 'object' ? source.inactivityThreshold : source;
  return parsePositiveNumber(raw) ?? DEFAULT_INACTIVITY_THRESHOLD_SECONDS;
};

/**
 * Ngưỡng "bỏ tương tác" (ms) lấy từ ExerciseConfig.inactivityThreshold.
 * VT Quest dùng cùng giá trị làm thời gian chờ phản hồi mỗi trial.
 * Fallback DB default (30 giây) chỉ khi config thiếu / không hợp lệ.
 */
export const getInactivityThresholdMs = (source?: InactivityThresholdSource): number => {
  // E2E test override
  if (typeof window !== 'undefined' && (window as any).__E2E_INACTIVITY_THRESHOLD_SECONDS) {
    return (window as any).__E2E_INACTIVITY_THRESHOLD_SECONDS * 1000;
  }
  return resolveInactivityThresholdSeconds(source) * 1000;
};

export const getInactivityThresholdSeconds = (source?: InactivityThresholdSource): number =>
  resolveInactivityThresholdSeconds(source);

export const formatExerciseDuration = (durationMinutes?: number | null): string => {
  const configuredMinutes = parsePositiveNumber(durationMinutes) ? Number(durationMinutes) : 0;
  const configuredSeconds = configuredMinutes > 0 ? configuredMinutes * 60 : 0;
  const effectiveSeconds = getEffectiveExerciseDurationSeconds(durationMinutes);

  if (!effectiveSeconds) {
    return `${configuredMinutes} phút`;
  }

  if (configuredSeconds === effectiveSeconds) {
    return `${configuredMinutes} phút`;
  }

  if (effectiveSeconds % 60 === 0) {
    return `${effectiveSeconds / 60} phút`;
  }

  return `${effectiveSeconds} giây`;
};
