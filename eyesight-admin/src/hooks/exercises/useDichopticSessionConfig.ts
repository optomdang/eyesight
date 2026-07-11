/**
 * Mutable dichoptic config for an exercise session.
 * Starts from the assignment template; auto-balance can raise fellowContrast in-session.
 */

import { useCallback, useEffect, useState } from 'react';
import type { DichopticConfig } from 'src/types/core/visual-settings';
import { tryApplyDichopticAutoBalanceStep } from 'src/utils/dichopticUtils';

export interface UseDichopticSessionConfigResult {
  /** Live dichoptic config (may diverge from template after auto-balance steps). */
  dichopticConfig: DichopticConfig | null;
  /**
   * Call after a stage/round with accuracy in [0, 1].
   * Bumps fellowContrast when auto-balance is enabled and accuracy ≥ threshold.
   */
  tryAdvanceOnAccuracy: (accuracy: number) => void;
  /** Reset to template (e.g. new assignment). */
  resetDichopticConfig: () => void;
}

export function useDichopticSessionConfig(
  template: DichopticConfig | null | undefined
): UseDichopticSessionConfigResult {
  const [dichopticConfig, setDichopticConfig] = useState<DichopticConfig | null>(
    template ?? null
  );

  useEffect(() => {
    setDichopticConfig(template ?? null);
  }, [template]);

  const tryAdvanceOnAccuracy = useCallback((accuracy: number) => {
    setDichopticConfig((prev) => {
      const next = tryApplyDichopticAutoBalanceStep(prev, accuracy);
      if (!next || next === prev) return prev;
      return next;
    });
  }, []);

  const resetDichopticConfig = useCallback(() => {
    setDichopticConfig(template ?? null);
  }, [template]);

  return { dichopticConfig, tryAdvanceOnAccuracy, resetDichopticConfig };
}
