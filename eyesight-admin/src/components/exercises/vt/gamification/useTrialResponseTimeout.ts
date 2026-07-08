import { useEffect, useRef } from 'react';

interface UseTrialResponseTimeoutOptions {
  timeoutMs: number;
  /** Trial is shown and awaiting a choice */
  active: boolean;
  /** Resets the timer when the stimulus changes */
  trialKey: string | null;
  onTimeout: () => void;
}

/**
 * Fires onTimeout once per trial if the patient does not respond in time.
 * Uses ExerciseConfig.inactivityThreshold (same as idle / inactivity tracking).
 */
export function useTrialResponseTimeout(options: UseTrialResponseTimeoutOptions): void {
  const { timeoutMs, active, trialKey, onTimeout } = options;
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!active || timeoutMs <= 0 || trialKey == null) return;

    const id = setTimeout(() => {
      onTimeoutRef.current();
    }, timeoutMs);

    return () => clearTimeout(id);
  }, [active, timeoutMs, trialKey]);
}
