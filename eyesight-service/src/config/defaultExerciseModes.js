/**
 * System-default training modes ("chế độ tập luyện") provisioned for every new center.
 * configType is always `admin` — only center admins may create/update/delete these.
 * Doctors may list/view/assign them but not mutate.
 */

const ORIGINAL_COLOR_SCHEME = {
  preset: 'original',
  textColor: '#776E65',
  backgroundColor: '#F9F6F2',
};

const BASE_STAIRCASE = {
  stepSize: 0.08,
  maxTrials: 20,
  minReversals: 6,
  stepHalveAfterReversals: 2,
};

const SPACE_GAME = {
  theme: 'space',
  enableSound: true,
};

const GABOR_STIMULUS = {
  sfCpD: 3,
  sigmaDeg: 0.5,
  taskMode: 'location_2afc',
  orientation: 'vertical',
  taskModesPerSession: [
    'location_2afc',
    'orientation_id',
    'orientation_match',
    'odd_one_out',
    'sf_discrimination',
    'delayed_match',
  ],
};

const VERNIER_STIMULUS = {
  taskMode: 'alignment_2afc',
  taskModesPerSession: [
    'alignment_2afc',
    'offset_direction_mcq',
    'greater_offset_2afc',
    'odd_line_out',
    'delayed_direction',
  ],
};

const CROWDING_STIMULUS = {
  taskMode: 'location_2afc',
  taskModesPerSession: [
    'location_2afc',
    'central_letter_id',
    'letter_match_2afc',
    'odd_letter_out',
    'delayed_letter',
    'flanker_same_different',
  ],
};

const STEREOPSIS_STIMULUS = {
  taskMode: 'shape_id',
  taskModesPerSession: ['shape_id', 'float_position', 'digit_id'],
};

/** Base exercises each center must own before mode configs can be created. */
const DEFAULT_CENTER_EXERCISES = [
  {
    code: '2048',
    name: 'Game 2048',
    exerciseType: '2048',
    description: 'Bài tập game 2048 — mặc định hệ thống',
  },
  {
    code: 'far-acuity',
    name: 'Bài tập với BTL',
    exerciseType: 'far-acuity',
    description: 'Bài tập thị lực / tương phản (ODETS) — mặc định hệ thống',
  },
  {
    code: 'vt-gabor',
    name: 'Bài tập Gabor',
    exerciseType: 'vt-gabor',
    description: 'Vision therapy — Gabor — mặc định hệ thống',
  },
  {
    code: 'vt-vernier',
    name: 'Bài tập Vernier',
    exerciseType: 'vt-vernier',
    description: 'Vision therapy — Vernier — mặc định hệ thống',
  },
  {
    code: 'vt-crowding',
    name: 'Bài tập Crowding',
    exerciseType: 'vt-crowding',
    description: 'Vision therapy — Crowding — mặc định hệ thống',
  },
  {
    code: 'vt-stereopsis',
    name: 'Bài tập Stereopsis',
    exerciseType: 'vt-stereopsis',
    description: 'Vision therapy — Stereopsis — mặc định hệ thống',
  },
];

/**
 * @typedef {Object} DefaultExerciseMode
 * @property {string} exerciseCode - Matches DEFAULT_CENTER_EXERCISES.code
 * @property {string} name - Unique config name within exercise+center
 * @property {string} visionType
 * @property {string} eye
 * @property {number} distance
 * @property {number} duration
 * @property {string} frequency
 * @property {number} executionCount
 * @property {number} inactivityThreshold
 * @property {boolean} levelOverride
 * @property {string} difficultyBaselineSource
 * @property {object} colorScheme
 * @property {object|null} [vtSettings]
 */

/** @type {DefaultExerciseMode[]} */
const DEFAULT_EXERCISE_MODES = [
  // ── 2048 ──────────────────────────────────────────────────────────────
  {
    exerciseCode: '2048',
    name: '2048 (D-Max)',
    visionType: 'far',
    eye: 'both',
    distance: 3,
    duration: 5,
    frequency: 'daily',
    executionCount: 2,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'latest_achieved',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: null,
  },
  {
    exerciseCode: '2048',
    name: '2048 - N',
    visionType: 'near',
    eye: 'both',
    distance: 0.5,
    duration: 5,
    frequency: 'daily',
    executionCount: 2,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'latest_achieved',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: null,
  },
  {
    exerciseCode: '2048',
    name: '2048 -NC',
    visionType: 'contrast',
    eye: 'both',
    distance: 0.5,
    duration: 5,
    frequency: 'daily',
    executionCount: 2,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'latest_achieved',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: null,
  },
  {
    exerciseCode: '2048',
    name: '2048 (DC-Max)',
    visionType: 'contrast',
    eye: 'both',
    distance: 3,
    duration: 5,
    frequency: 'daily',
    executionCount: 2,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'latest_achieved',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: null,
  },

  // ── Far acuity / ODETS ────────────────────────────────────────────────
  {
    exerciseCode: 'far-acuity',
    name: 'ODETS - (D-Max)',
    visionType: 'far',
    eye: 'both',
    distance: 3,
    duration: 30,
    frequency: 'daily',
    executionCount: 2,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'latest_achieved',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: null,
  },
  {
    exerciseCode: 'far-acuity',
    name: 'ODETS - (DC-Max)',
    visionType: 'contrast',
    eye: 'both',
    distance: 3,
    duration: 30,
    frequency: 'daily',
    executionCount: 2,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'latest_achieved',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: null,
  },
  {
    exerciseCode: 'far-acuity',
    name: 'ODETS - N',
    visionType: 'near',
    eye: 'both',
    distance: 0.5,
    duration: 30,
    frequency: 'daily',
    executionCount: 2,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'latest_achieved',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: null,
  },
  {
    exerciseCode: 'far-acuity',
    name: 'ODETS - NC',
    visionType: 'contrast',
    eye: 'both',
    distance: 0.5,
    duration: 30,
    frequency: 'daily',
    executionCount: 2,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'latest_achieved',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: null,
  },

  // ── Gabor ─────────────────────────────────────────────────────────────
  {
    exerciseCode: 'vt-gabor',
    name: 'Gabor - N',
    visionType: 'near',
    eye: 'both',
    distance: 0.5,
    duration: 15,
    frequency: 'daily',
    executionCount: 2,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'latest_achieved',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: {
      modalities: ['gabor'],
      trialsPerStage: 20,
      stagesPerSession: 5,
      staircase: { ...BASE_STAIRCASE },
      gamification: { ...SPACE_GAME },
      stimulus: {
        gabor: { ...GABOR_STIMULUS },
        vernier: {},
        crowding: {},
        stereopsis: {},
      },
    },
  },
  {
    exerciseCode: 'vt-gabor',
    name: 'Gabor - (D-Max)',
    visionType: 'far',
    eye: 'both',
    distance: 3,
    duration: 15,
    frequency: 'daily',
    executionCount: 2,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'latest_achieved',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: {
      modalities: ['gabor'],
      trialsPerStage: 20,
      stagesPerSession: 5,
      staircase: { ...BASE_STAIRCASE },
      gamification: { ...SPACE_GAME },
      stimulus: {
        gabor: { ...GABOR_STIMULUS },
        vernier: {},
        crowding: {},
        stereopsis: {},
      },
    },
  },

  // ── Vernier ───────────────────────────────────────────────────────────
  {
    exerciseCode: 'vt-vernier',
    name: 'Vernier - N',
    visionType: 'near',
    eye: 'both',
    distance: 0.5,
    duration: 5,
    frequency: 'daily',
    executionCount: 4,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'current_exam',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: {
      modalities: ['vernier'],
      trialsPerStage: 20,
      stagesPerSession: 5,
      staircase: { ...BASE_STAIRCASE },
      gamification: { ...SPACE_GAME },
      stimulus: {
        gabor: { sfCpD: 3, sigmaDeg: 0.5, orientation: 'vertical' },
        vernier: { ...VERNIER_STIMULUS },
        crowding: {},
        stereopsis: {},
      },
    },
  },
  {
    exerciseCode: 'vt-vernier',
    name: 'Vernier - (D-Max)',
    visionType: 'far',
    eye: 'both',
    distance: 3,
    duration: 5,
    frequency: 'daily',
    executionCount: 4,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'current_exam',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: {
      modalities: ['vernier'],
      trialsPerStage: 20,
      stagesPerSession: 5,
      staircase: { ...BASE_STAIRCASE },
      gamification: { ...SPACE_GAME },
      stimulus: {
        gabor: { sfCpD: 3, sigmaDeg: 0.5, orientation: 'vertical' },
        vernier: { ...VERNIER_STIMULUS },
        crowding: {},
        stereopsis: {},
      },
    },
  },

  // ── Crowding ──────────────────────────────────────────────────────────
  {
    exerciseCode: 'vt-crowding',
    name: 'Crowding - (D-Max)',
    visionType: 'far',
    eye: 'both',
    distance: 3,
    duration: 5,
    frequency: 'daily',
    executionCount: 4,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'current_exam',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: {
      modalities: ['crowding'],
      trialsPerStage: 20,
      stagesPerSession: 5,
      staircase: { ...BASE_STAIRCASE },
      gamification: { ...SPACE_GAME },
      stimulus: {
        gabor: { sfCpD: 3, sigmaDeg: 0.5, orientation: 'vertical' },
        vernier: { ...VERNIER_STIMULUS },
        crowding: { ...CROWDING_STIMULUS },
        stereopsis: {},
      },
    },
  },
  {
    exerciseCode: 'vt-crowding',
    name: 'Crowding - N',
    visionType: 'near',
    eye: 'both',
    distance: 0.5,
    duration: 5,
    frequency: 'daily',
    executionCount: 4,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'current_exam',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: {
      modalities: ['crowding'],
      trialsPerStage: 20,
      stagesPerSession: 5,
      staircase: { ...BASE_STAIRCASE },
      gamification: { ...SPACE_GAME },
      stimulus: {
        gabor: { sfCpD: 3, sigmaDeg: 0.5, orientation: 'vertical' },
        vernier: { ...VERNIER_STIMULUS },
        crowding: { ...CROWDING_STIMULUS },
        stereopsis: {},
      },
    },
  },

  // ── Stereopsis ────────────────────────────────────────────────────────
  {
    exerciseCode: 'vt-stereopsis',
    name: 'Stereopsis',
    visionType: 'near',
    eye: 'both',
    distance: 0.5,
    duration: 5,
    frequency: 'daily',
    executionCount: 2,
    inactivityThreshold: 30,
    levelOverride: false,
    difficultyBaselineSource: 'current_exam',
    colorScheme: { ...ORIGINAL_COLOR_SCHEME },
    vtSettings: {
      modalities: ['stereopsis'],
      trialsPerStage: 10,
      stagesPerSession: 5,
      staircase: { ...BASE_STAIRCASE },
      gamification: { ...SPACE_GAME },
      stimulus: {
        gabor: { sfCpD: 3, sigmaDeg: 0.5, orientation: 'vertical' },
        vernier: {},
        crowding: {},
        stereopsis: { ...STEREOPSIS_STIMULUS },
      },
    },
  },
];

module.exports = {
  DEFAULT_CENTER_EXERCISES,
  DEFAULT_EXERCISE_MODES,
  ORIGINAL_COLOR_SCHEME,
};
