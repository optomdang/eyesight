// ============================================================
// VT Quest — shared types for engine, portal, and backend API
// ============================================================

export type VtWorld = 'gabor' | 'vernier' | 'crowding' | 'stereopsis';

export type VtResponseSide = 'left' | 'right';

/**
 * Gabor sub-task modes (all share the contrast staircase):
 * - location_2afc:      "ánh sáng bên nào?" — patch một bên (mặc định, hành vi cũ)
 * - orientation_id:     1 patch lớn giữa màn hình, chọn hướng sọc (MCQ 2/4 hướng)
 * - orientation_match:  lưới thẻ, chọn 2 thẻ có sọc cùng hướng
 * - odd_one_out:        lưới thẻ, chạm thẻ có hướng sọc khác biệt
 * - sf_discrimination:  2 patch, chọn bên có sọc to (dày) hơn
 * - delayed_match:      ghi nhớ hướng sọc rồi chọn lại sau khi ẩn
 */
export type VtGaborTaskMode =
  | 'location_2afc'
  | 'orientation_id'
  | 'orientation_match'
  | 'odd_one_out'
  | 'sf_discrimination'
  | 'delayed_match';

/**
 * Vernier sub-task modes (all share the arcsec offset staircase):
 * - alignment_2afc:       "đường thẳng nào bị lệch?" — 2AFC trái/phải (mặc định, hành vi cũ)
 * - offset_direction_mcq: một cặp giữa màn, MCQ hướng lệch (trái / phải)
 * - greater_offset_2afc:  cả hai bên lệch; chọn bên lệch nhiều hơn
 * - odd_line_out:         lưới 4 thẻ, chạm cặp có hướng lệch khác
 * - delayed_direction:    ghi nhớ hướng lệch rồi chọn lại sau khi ẩn
 */
export type VtVernierTaskMode =
  | 'alignment_2afc'
  | 'offset_direction_mcq'
  | 'greater_offset_2afc'
  | 'odd_line_out'
  | 'delayed_direction';

/**
 * Crowding sub-task modes (all share the spacing-ratio staircase):
 * - location_2afc:           "chữ đặc biệt bên nào?" — 2AFC trái/phải (mặc định, hành vi cũ)
 * - central_letter_id:     một cụm crowding giữa màn, MCQ nhận diện chữ giữa
 * - letter_match_2afc:     chữ mẫu phía trên, 2AFC ghép cụm crowding khớp mẫu
 * - odd_letter_out:        lưới 4 cụm, chạm cụm có chữ giữa khác biệt
 * - delayed_letter:        ghi nhớ chữ giữa rồi chọn lại sau khi ẩn
 * - flanker_same_different: phán đoán chữ giữa có giống flankers hay không
 */
export type VtCrowdingTaskMode =
  | 'location_2afc'
  | 'central_letter_id'
  | 'letter_match_2afc'
  | 'odd_letter_out'
  | 'delayed_letter'
  | 'flanker_same_different';

/**
 * Stereopsis sub-task modes (all share the arcsec disparity staircase):
 * - shape_id:        nhận hình nổi đơn (star / triangle / square)
 * - float_position:  hàng 5 ô RDS — ô nào có hình nổi
 * - digit_id:        nhận chữ số nổi trong RDS
 */
export type VtStereopsisTaskMode = 'shape_id' | 'float_position' | 'digit_id';

/**
 * Response payload for a trial:
 * - VtResponseSide for side-based modes (2AFC, SF discrimination)
 * - { index } for MCQ / odd-one-out / delayed match
 * - { indices } for multi-select match cards
 */
export type VtTrialResponseInput =
  | VtResponseSide
  | { index: number; orientationDeg?: number }
  | { indices: number[] };

// ---------- Staircase ----------

export interface VtStaircaseState {
  /** Current difficulty value (contrast 0–1, offset px, spacing ratio) */
  currentValue: number;
  /** Direction of last step: 1 = harder (lower value for contrast/offset), -1 = easier */
  lastDirection: 1 | -1;
  /** Number of reversals so far */
  reversalCount: number;
  /** Values recorded at each reversal */
  reversalValues: number[];
  /** Total trial count in this staircase run */
  trialCount: number;
  /** Step size — may halve after first reversal */
  stepSize: number;
}

export interface VtStaircaseParams {
  /** Starting difficulty value */
  startValue: number;
  /** Initial step size */
  stepSize: number;
  /** Halve step after this many reversals (Levitt transformed staircase) */
  stepHalveAfterReversals: number;
  /** Minimum allowed value */
  minValue: number;
  /** Maximum allowed value */
  maxValue: number;
}

// ---------- Trials ----------

export interface VtTrial {
  trialIndex: number;
  world: VtWorld;
  /** Which side the signal appeared (ground truth) */
  signalSide: VtResponseSide;
  /** Patient's response */
  response: VtResponseSide | null;
  correct: boolean | null;
  /** Difficulty value at trial time */
  difficultyValue: number;
  /** RT in ms (null until response) */
  reactionTimeMs: number | null;
  /** Chosen option index — MCQ / odd-one-out / delayed match modes */
  responseIndex?: number | null;
  /** Chosen card indices — match-cards mode */
  responseIndices?: number[] | null;
  /**
   * Modality-specific metadata:
   * - gabor: { phaseRad, taskMode?, targetOrientationDeg?, optionsDeg?,
   *            correctIndex?, cardOrientations?, targetIndices?, sfRatio?, thickSide? }
   * - vernier: { offsetSign?, taskMode?, correctIndex?, cardOffsetSigns?,
   *              distractorOffsetRatio? }
   * - crowding: { targetLetter, flankerLetters, taskMode?, optionsLetters?,
   *              correctIndex?, referenceLetter?, matchSide?, cardTargets?,
   *              flankersMatchTarget?, leftTargetLetter?, rightTargetLetter? }
   * - stereopsis: { taskMode?, rngSeed?, correctIndex?, shapeType?, floatAt?,
   *                 floatShape?, digit?, optionShapeIds?, optionDigits? }
   */
  meta?: Record<string, unknown>;
}

// ---------- Stage ----------

export interface VtStageResult {
  world: VtWorld;
  stageIndex: number;
  trials: VtTrial[];
  threshold: number | null;
  accuracy: number;
  stars: 0 | 1 | 2 | 3;
  coinsEarned: number;
  maxCombo: number;
}

// ---------- Session state (pause/resume) ----------

export interface VtSessionState {
  currentWorld: VtWorld;
  stageIndex: number;
  /** Completed stages with results */
  completedStages: VtStageResult[];
  /** Live staircase state for current stage */
  staircaseState: VtStaircaseState;
  /** Trials in current (in-flight) stage */
  currentStageTrials: VtTrial[];
  /** Gamification counters */
  totalStars: number;
  totalCoins: number;
  currentCombo: number;
}

/** Crowding letter config persisted for the current stage */
export interface VtCrowdingStageConfig {
  targetLetter: string;
  flankerLetters: [string, string];
}

// ---------- Result metrics (sent to BE on complete) ----------

export interface VtWorldMetrics {
  threshold: number | null;
  unit: 'contrastPercent' | 'arcsec' | 'spacingRatio';
  trials: number;
  accuracy: number;
  /** Gabor task modes exercised this session (absent for legacy 2AFC-only sessions) */
  taskModes?: VtGaborTaskMode[];
  /** Vernier task modes exercised this session (absent for legacy alignment-only sessions) */
  vernierTaskModes?: VtVernierTaskMode[];
  /** Crowding task modes exercised this session (absent for legacy 2AFC-only sessions) */
  crowdingTaskModes?: VtCrowdingTaskMode[];
  /** Stereopsis task modes exercised this session */
  stereopsisTaskModes?: VtStereopsisTaskMode[];
}

export interface VtResultMetrics {
  exerciseKind: 'vt-quest' | 'vt-gabor' | 'vt-vernier' | 'vt-crowding' | 'vt-stereopsis';
  worlds: Partial<Record<VtWorld, VtWorldMetrics>>;
  sessionSummary: {
    totalTrials: number;
    totalStars: number;
    coinsEarned: number;
    stagesCompleted: number;
  };
  /**
   * Highest vision level (sizeVisionLevel, same scale as the config's visionType)
   * reached during this execution. Written at exercise complete and consumed by
   * the backend to update ExerciseAssignment.lastAchievedVisionLevel.
   */
  peakVisionLevel?: number | null;
}

// ---------- vtSettings (from ExerciseConfig) ----------

export interface VtStimulusGaborConfig {
  /** Spatial frequency in cycles/degree */
  sfCpD: number;
  /** 'vertical' | 'horizontal' */
  orientation: 'vertical' | 'horizontal';
  /** Gaussian sigma in degrees of visual angle */
  sigmaDeg: number;
  /** Task mode — defaults to 'location_2afc' (legacy behavior) */
  taskMode?: VtGaborTaskMode;
  /**
   * Rotate task modes per stage (stageIndex % length).
   * Boss stages pick a random mode from this list.
   * Takes precedence over taskMode when non-empty.
   */
  taskModesPerSession?: VtGaborTaskMode[];
  /** MCQ orientation count for orientation_id / delayed_match (default 4) */
  orientationCount?: 2 | 4;
  /** Card count for orientation_match / odd_one_out (default 4) */
  cardGridSize?: 4 | 6;
}

export interface VtStimulusCrowdingConfig {
  /** Flankers per side of target (default 1 → 2 flankers total) */
  flankerCount?: number;
  /** Letter pool key (default 'A' — far-vision Latin chart) */
  letterSet?: string;
  /** Task mode — defaults to location_2afc (legacy behavior) */
  taskMode?: VtCrowdingTaskMode;
  /**
   * Rotate task modes per stage (stageIndex % length).
   * Boss stages pick a random mode from this list.
   */
  taskModesPerSession?: VtCrowdingTaskMode[];
  /** MCQ letter count for central_letter_id / delayed_letter (default 4) */
  letterOptionCount?: 4;
  /** Card count for odd_letter_out (default 4) */
  cardGridSize?: 4;
}

export interface VtStimulusVernierConfig {
  /** Line segment height in degrees (reserved; sizing uses vision level at runtime) */
  lineHeightDeg?: number;
  /** Task mode — defaults to alignment_2afc (legacy behavior) */
  taskMode?: VtVernierTaskMode;
  /**
   * Rotate task modes per stage (stageIndex % length).
   * Boss stages pick a random mode from this list.
   */
  taskModesPerSession?: VtVernierTaskMode[];
  /** Distractor offset ratio for greater_offset_2afc (default 0.5) */
  offsetRatio?: number;
}

export interface VtStimulusStereopsisConfig {
  /** Task mode — defaults to shape_id */
  taskMode?: VtStereopsisTaskMode;
  /**
   * Rotate task modes per stage (stageIndex % length).
   * Boss stages pick a random mode from this list.
   */
  taskModesPerSession?: VtStereopsisTaskMode[];
  /** MCQ shape count for shape_id (default: all shapes in pool, max 8) */
  shapeOptionCount?: number;
  /** Panel count for float_position (default 5) */
  positionCount?: 5;
}

export interface VtSettings {
  modalities: VtWorld[];
  trialsPerStage: number;
  stagesPerSession: number;
  staircase: {
    stepSize: number;
    stepHalveAfterReversals: number;
    minReversals: number;
    maxTrials: number;
  };
  stimulus: {
    gabor?: VtStimulusGaborConfig;
    vernier?: VtStimulusVernierConfig;
    crowding?: VtStimulusCrowdingConfig;
    stereopsis?: VtStimulusStereopsisConfig;
  };
  gamification?: {
    theme: 'space';
    enableSound: boolean;
  };
}

// ---------- Engine hook ----------

export type VtGameScreen =
  | 'world-map'
  | 'stage-intro'
  | 'trial'
  | 'stage-result'
  | 'session-complete';

/**
 * Flat JSON persisted as exerciseState (matches BE validator: currentWorld, stageIndex, staircaseState).
 * Session fields are at the top level; engine overlay fields restore screen + in-flight trial.
 */
export interface VtPauseSnapshot extends VtSessionState {
  snapshotVersion?: 1;
  vtScreen?: VtGameScreen;
  currentTrial?: VtTrial | null;
  isPendingResponse?: boolean;
  stimulusVisible?: boolean;
  lastStageResult?: VtStageResult | null;
  crowdingStageConfig?: VtCrowdingStageConfig | null;
  isBossStage?: boolean;
}

export interface VtEngineState {
  screen: VtGameScreen;
  session: VtSessionState;
  settings: VtSettings;
  isPendingResponse: boolean;
  currentTrial: VtTrial | null;
  lastStageResult: VtStageResult | null;
  /** Whether the stimulus is currently visible (ISI vs. shown) */
  stimulusVisible: boolean;
}

export const DEFAULT_VT_SETTINGS: VtSettings = {
  modalities: ['gabor'],
  trialsPerStage: 10,
  stagesPerSession: 5,
  staircase: {
    stepSize: 0.08,
    stepHalveAfterReversals: 2,
    minReversals: 6,
    maxTrials: 20,
  },
  stimulus: {
    gabor: { sfCpD: 3, orientation: 'vertical', sigmaDeg: 0.5 },
  },
  gamification: { theme: 'space', enableSound: true },
};
