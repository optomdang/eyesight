/**
 * Dichoptic configuration resolver.
 *
 * Takes a raw ExerciseConfig (colorScheme + dichoptic fields) and an optional
 * assignment (for trainingEye) and returns a DichopticPresentation object that
 * game renderers consume directly — no further interpretation needed downstream.
 *
 * Channel convention (matches vtStimulusColors.ts):
 *   textColor      → RED-lens channel
 *   backgroundColor → channel-2 (blue or green) lens
 */

import { blendHexAtLogContrastPercent } from 'src/utils/clinicalContrastColor';
import { isAnaglyphExerciseColorScheme } from 'src/components/exercises/vt/core/vtStimulusColors';
import { resolveAssignmentTrainingEye } from 'src/utils/visionUtils';
import type {
  ColorScheme,
  DichopticConfig,
  DichopticPresentation,
} from 'src/types/core/visual-settings';
import { DICHOPTIC_PRESENTATION_OFF as DICHOPTIC_OFF } from 'src/types/core/visual-settings';

/** Minimal shape of ExerciseConfig consumed by this resolver. */
export interface DichopticConfigSource {
  colorScheme?: ColorScheme | null;
  dichoptic?: DichopticConfig | null;
  /** eye field on the config template (fallback when no assignment) */
  eye?: string | null;
}

/** Minimal shape of an Assignment (or assignment-like object). */
export interface DichopticAssignmentSource {
  trainingEye?: string | null;
}

/**
 * Resolve the full dichoptic presentation from an ExerciseConfig and an optional
 * Assignment.  Returns DICHOPTIC_PRESENTATION_OFF when dichoptic is inactive.
 *
 * @param config  - ExerciseConfig (colorScheme + dichoptic)
 * @param assignment - Optional assignment override for trainingEye
 */
export function resolveDichopticPresentation(
  config: DichopticConfigSource,
  assignment?: DichopticAssignmentSource | null
): DichopticPresentation {
  const { colorScheme, dichoptic } = config;

  // Guard: needs an anaglyph preset and a non-off dichoptic config
  if (!isAnaglyphExerciseColorScheme(colorScheme) || !dichoptic || dichoptic.mode === 'off') {
    return DICHOPTIC_OFF;
  }

  const redColor = colorScheme!.textColor || '#ff0000';
  const ch2Color = colorScheme!.backgroundColor || '#0000ff';

  if (dichoptic.mode === 'anti_cue') {
    // Anti-cue: both channels at full contrast, no per-eye role differentiation
    return {
      enabled: true,
      mode: 'anti_cue',
      amblyopicEye: null,
      fellowEye: null,
      redChannelColor: redColor,
      redChannelContrast: 100,
      redChannelRole: 'signal',
      ch2ChannelColor: ch2Color,
      ch2ChannelContrast: 100,
      ch2ChannelRole: 'signal',
    };
  }

  // mode === 'balance'
  if (!dichoptic.mapping || !dichoptic.balance) {
    return DICHOPTIC_OFF;
  }

  const amblyopicEye = resolveAssignmentTrainingEye({
    trainingEye: assignment?.trainingEye,
    configEye: config.eye,
  });

  // 'both' is not a valid dichoptic target — fall back to off
  if (!amblyopicEye || amblyopicEye === 'both') {
    return DICHOPTIC_OFF;
  }

  const fellowEye: 'left' | 'right' = amblyopicEye === 'left' ? 'right' : 'left';
  const { amblyopicContrastPercent, fellowContrastPercent } = dichoptic.balance;
  const { redEye } = dichoptic.mapping;

  const redIsAmblyopic = redEye === amblyopicEye;

  const redContrast = redIsAmblyopic ? amblyopicContrastPercent : fellowContrastPercent;
  const ch2Contrast = redIsAmblyopic ? fellowContrastPercent : amblyopicContrastPercent;

  return {
    enabled: true,
    mode: 'balance',
    amblyopicEye,
    fellowEye,
    redChannelColor: blendHexAtLogContrastPercent(redColor, redContrast, '#000000'),
    redChannelContrast: redContrast,
    redChannelRole: redIsAmblyopic ? 'signal' : 'fellow',
    ch2ChannelColor: blendHexAtLogContrastPercent(ch2Color, ch2Contrast, '#000000'),
    ch2ChannelContrast: ch2Contrast,
    ch2ChannelRole: redIsAmblyopic ? 'fellow' : 'signal',
  };
}

/**
 * After a stage/round, bump fellowContrast when auto-balance is on and accuracy meets threshold.
 * Returns the same config reference when no change is applied.
 */
export function tryApplyDichopticAutoBalanceStep(
  config: DichopticConfig | null | undefined,
  accuracy: number
): DichopticConfig | null {
  if (!config || config.mode !== 'balance' || !config.balance) {
    return config ?? null;
  }
  const ab = config.balance.autoBalance;
  if (!ab?.enabled) {
    return config;
  }
  const threshold = ab.accuracyThreshold ?? 0.75;
  if (!Number.isFinite(accuracy) || accuracy < threshold) {
    return config;
  }
  return applyDichopticAutoBalanceStep(config);
}

/**
 * Derive the updated balance params after a successful stage.
 * Call this in the game engine when stage accuracy >= autoBalance.accuracyThreshold.
 * Returns a new DichopticConfig with adjusted fellowContrastPercent (capped at maxFellowPercent).
 */
export function applyDichopticAutoBalanceStep(
  config: DichopticConfig
): DichopticConfig {
  const ab = config.balance?.autoBalance;
  if (!ab?.enabled || !config.balance) return config;

  const current = config.balance.fellowContrastPercent;
  const next = Math.min(current + ab.stepPercent, ab.maxFellowPercent);
  if (next === current) return config;

  return {
    ...config,
    balance: {
      ...config.balance,
      fellowContrastPercent: next,
    },
  };
}
