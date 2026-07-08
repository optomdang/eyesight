/**
 * VT Gabor — task-mode helpers (trial meta generation + scoring).
 *
 * All modes share the contrast staircase; the difference is what the patient
 * must judge (location, orientation, matching, odd-one-out, stripe thickness,
 * delayed recall) and how the response is expressed (side / index / indices).
 *
 * Orientation convention (matches gaborRenderer / canvas y-down):
 * 0° = sọc dọc, 90° = sọc ngang, 45° = chéo ↗, 135° = chéo ↘.
 * Values are carrier-axis degrees passed to the Gabor renderer.
 */

import type {
  VtGaborTaskMode,
  VtStimulusGaborConfig,
  VtTrial,
  VtTrialResponseInput,
  VtResponseSide,
} from 'src/types/core/vtQuest';

export const GABOR_ORIENTATIONS_2: number[] = [0, 90];
export const GABOR_ORIENTATIONS_4: number[] = [0, 45, 90, 135];

/** SF ratio between "thick" and "thin" side in sf_discrimination (thin = ratio × thick). */
export const SF_DISCRIMINATION_RATIO = 2;

/** Memorize-phase duration for delayed_match, in ms. */
export const DELAYED_MATCH_MEMORIZE_MS = 1600;

export const GABOR_TASK_MODE_LABELS: Record<VtGaborTaskMode, string> = {
  location_2afc: 'Tìm ánh sáng (trái/phải)',
  orientation_id: 'Xác định hướng sọc',
  orientation_match: 'Ghép thẻ cùng hướng',
  odd_one_out: 'Tìm thẻ khác biệt',
  sf_discrimination: 'So sánh độ dày sọc',
  delayed_match: 'Ghi nhớ hướng sọc',
};

export const ALL_GABOR_TASK_MODES: VtGaborTaskMode[] = [
  'location_2afc',
  'orientation_id',
  'orientation_match',
  'odd_one_out',
  'sf_discrimination',
  'delayed_match',
];

/** Effectively unlimited trials per stage (single Gabor mode — session ends on timer). */
export const VT_UNLIMITED_TRIALS_PER_STAGE = Number.MAX_SAFE_INTEGER;

/** Ordered list of Gabor task modes for this config (always ≥ 1). */
export function getGaborModeRotation(
  config: VtStimulusGaborConfig | undefined
): VtGaborTaskMode[] {
  const rotation = config?.taskModesPerSession?.filter((m) =>
    (ALL_GABOR_TASK_MODES as string[]).includes(m)
  );
  if (rotation && rotation.length > 0) return rotation;
  const single = config?.taskMode ?? 'location_2afc';
  return [single];
}

export interface GaborStageEndPolicy {
  trialsPerStage: number;
  /** When false, stage ends only on trialsPerStage (staircase still adapts contrast). */
  endOnStaircase: boolean;
}

/**
 * Single Gabor mode → unlimited trials until session timer; multi-mode → trialsPerStage cap.
 */
export function resolveGaborStageEndPolicy(
  settings: { trialsPerStage: number },
  config: VtStimulusGaborConfig | undefined
): GaborStageEndPolicy {
  const modes = getGaborModeRotation(config);
  if (modes.length === 1) {
    return { trialsPerStage: VT_UNLIMITED_TRIALS_PER_STAGE, endOnStaircase: false };
  }
  return {
    trialsPerStage: settings.trialsPerStage,
    endOnStaircase: false,
  };
}

function pickOne<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/** Fisher–Yates shuffle (non-mutating). */
function shuffled<T>(items: T[], random: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Resolve which task mode applies to a stage.
 * - taskModesPerSession rotates per stage; boss stages pick a random entry
 * - otherwise the fixed taskMode (default location_2afc)
 */
export function resolveGaborTaskMode(
  config: VtStimulusGaborConfig | undefined,
  stageIndex: number,
  isBoss = false,
  random: () => number = Math.random
): VtGaborTaskMode {
  const rotation = getGaborModeRotation(config);
  if (rotation.length > 1) {
    if (isBoss) return pickOne(rotation, random);
    return rotation[stageIndex % rotation.length];
  }
  return rotation[0];
}

function orientationOptions(config: VtStimulusGaborConfig | undefined): number[] {
  return (config?.orientationCount ?? 4) === 2 ? GABOR_ORIENTATIONS_2 : GABOR_ORIENTATIONS_4;
}

function cardCount(config: VtStimulusGaborConfig | undefined): number {
  return config?.cardGridSize ?? 4;
}

/**
 * Build per-trial meta for a gabor task mode.
 * Returned object is merged into VtTrial.meta (phaseRad is added by trialRunner).
 * location_2afc returns {} — the legacy signalSide mechanism is used as-is.
 */
export function buildGaborTaskTrialMeta(
  mode: VtGaborTaskMode,
  config: VtStimulusGaborConfig | undefined,
  random: () => number = Math.random
): Record<string, unknown> {
  if (mode === 'location_2afc') return {};

  if (mode === 'orientation_id' || mode === 'delayed_match') {
    const optionsDeg = orientationOptions(config);
    const correctIndex = Math.floor(random() * optionsDeg.length);
    return {
      taskMode: mode,
      optionsDeg,
      correctIndex,
      targetOrientationDeg: optionsDeg[correctIndex],
    };
  }

  if (mode === 'orientation_match') {
    const n = cardCount(config);
    const pool = GABOR_ORIENTATIONS_4;
    const pairOrientation = pickOne(pool, random);
    const distractorPool = pool.filter((o) => o !== pairOrientation);
    // 2 cards share pairOrientation; remaining cards use distinct distractors (repeat if needed)
    const orientations: number[] = [pairOrientation, pairOrientation];
    const distractors = shuffled(distractorPool, random);
    for (let i = 0; i < n - 2; i++) {
      orientations.push(distractors[i % distractors.length]);
    }
    const order = shuffled(
      orientations.map((deg, idx) => ({ deg, isTarget: idx < 2 })),
      random
    );
    const targetIndices = order.map((c, idx) => (c.isTarget ? idx : -1)).filter((idx) => idx >= 0);
    return {
      taskMode: mode,
      cardOrientations: order.map((c) => c.deg),
      targetIndices,
    };
  }

  if (mode === 'odd_one_out') {
    const n = cardCount(config);
    const pool = GABOR_ORIENTATIONS_4;
    const commonOrientation = pickOne(pool, random);
    const oddOrientation = pickOne(
      pool.filter((o) => o !== commonOrientation),
      random
    );
    const correctIndex = Math.floor(random() * n);
    const cardOrientations = Array.from({ length: n }, (_, i) =>
      i === correctIndex ? oddOrientation : commonOrientation
    );
    return { taskMode: mode, cardOrientations, correctIndex };
  }

  // sf_discrimination — signalSide (set by trialRunner) is the side with thicker stripes
  return {
    taskMode: mode,
    sfRatio: SF_DISCRIMINATION_RATIO,
    orientationDeg: pickOne(GABOR_ORIENTATIONS_4, random),
  };
}

/** Read the task mode from a trial (legacy trials have no meta.taskMode). */
export function getGaborTaskModeFromTrial(trial: VtTrial | null | undefined): VtGaborTaskMode {
  const mode = trial?.meta?.taskMode;
  return typeof mode === 'string' && (ALL_GABOR_TASK_MODES as string[]).includes(mode)
    ? (mode as VtGaborTaskMode)
    : 'location_2afc';
}

/** Whether a mode expresses its response as left/right. */
export function isSideBasedMode(mode: VtGaborTaskMode): boolean {
  return mode === 'location_2afc' || mode === 'sf_discrimination';
}

/**
 * Score any trial (all worlds) against a response payload.
 * Non-gabor worlds and side-based gabor modes compare against signalSide.
 */
function metaNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Parse numeric fields from trial meta (handles JSON string coercion). */
export function metaNumberFromTrial(value: unknown): number | undefined {
  return metaNumber(value);
}

export function isVtResponseCorrect(trial: VtTrial, response: VtTrialResponseInput): boolean {
  if (typeof response === 'string') {
    return response === trial.signalSide;
  }
  if ('index' in response) {
    const targetDeg = metaNumber(trial.meta?.targetOrientationDeg);
    const optionsDeg = Array.isArray(trial.meta?.optionsDeg)
      ? (trial.meta!.optionsDeg as unknown[])
      : null;

    let chosenDeg = metaNumber(response.orientationDeg);
    if (chosenDeg == null && optionsDeg != null) {
      chosenDeg = metaNumber(optionsDeg[response.index]);
    }

    if (targetDeg != null && chosenDeg != null) {
      return chosenDeg === targetDeg;
    }

    const correctIndex = metaNumber(trial.meta?.correctIndex);
    if (correctIndex == null) return false;
    return response.index === correctIndex;
  }
  const targets = trial.meta?.targetIndices;
  if (!Array.isArray(targets)) return false;
  const chosen = [...response.indices].sort((a, b) => a - b);
  const expected = [...(targets as number[])].sort((a, b) => a - b);
  return chosen.length === expected.length && chosen.every((v, i) => v === expected[i]);
}

/** Extract the chosen side when the response is side-based (for feedback UI). */
export function responseSideOf(response: VtTrialResponseInput): VtResponseSide | undefined {
  return typeof response === 'string' ? response : undefined;
}

/** Child-facing label for an orientation option (icon renders the actual stripes). */
export function orientationLabel(deg: number): string {
  if (deg === 0) return 'Dọc';
  if (deg === 90) return 'Ngang';
  if (deg === 45) return 'Chéo ↗';
  if (deg === 135) return 'Chéo ↘';
  return `${deg}°`;
}

/**
 * CSS repeating-linear-gradient angle for MCQ stripe icons.
 *
 * Stripe direction deg (0 = dọc, 45 = ↗, 90 = ngang, 135 = ↘) maps directly to a
 * CSS angle (clockwise from up); the gradient runs perpendicular to the stripes,
 * hence +90. Verified against canvas output: icon stripes match drawGaborSingle.
 */
export function orientationCssAngle(deg: number): number {
  return (deg + 90) % 180;
}
