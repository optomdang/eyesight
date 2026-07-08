const Joi = require('joi');

// Validation schema for exercise notification settings
// Simplified for compliance reminder configuration (per-config)
const notificationSchema = Joi.object().keys({
  enabled: Joi.boolean().default(true),
  templateId: Joi.number().integer().allow(null).optional(),
  methods: Joi.array().items(Joi.string().valid('email', 'zalo', 'sms')).default(['email']),
  maxReminders: Joi.number().integer().min(1).max(10).default(3), // Max number of reminders per overdue assignment
  reminderInterval: Joi.number().integer().min(1).max(168).default(24), // Hours between reminders (1-168 hours = 1 hour to 7 days)
});

const GABOR_TASK_MODES = [
  'location_2afc',
  'orientation_id',
  'orientation_match',
  'odd_one_out',
  'sf_discrimination',
  'delayed_match',
];

const VERNIER_TASK_MODES = [
  'alignment_2afc',
  'offset_direction_mcq',
  'greater_offset_2afc',
  'odd_line_out',
  'delayed_direction',
];

const CROWDING_TASK_MODES = [
  'location_2afc',
  'central_letter_id',
  'letter_match_2afc',
  'odd_letter_out',
  'delayed_letter',
  'flanker_same_different',
];

const STEREOPSIS_TASK_MODES = ['shape_id', 'float_position', 'digit_id'];

const vtSettingsSchema = Joi.object()
  .keys({
    modalities: Joi.array()
      .items(Joi.string().valid('gabor', 'vernier', 'crowding', 'stereopsis'))
      .optional(),
    trialsPerStage: Joi.number().integer().min(1).max(999).optional(),
    stagesPerSession: Joi.number().integer().min(2).max(20).optional(),
    staircase: Joi.object()
      .keys({
        stepSize: Joi.number().optional(),
        stepHalveAfterReversals: Joi.number().integer().optional(),
        minReversals: Joi.number().integer().optional(),
        maxTrials: Joi.number().integer().optional(),
      })
      .optional(),
    stimulus: Joi.object()
      .keys({
        gabor: Joi.object()
          .keys({
            sfCpD: Joi.number().optional(),
            orientation: Joi.string().valid('vertical', 'horizontal').optional(),
            sigmaDeg: Joi.number().optional(),
            taskMode: Joi.string().valid(...GABOR_TASK_MODES).optional(),
            taskModesPerSession: Joi.array()
              .items(Joi.string().valid(...GABOR_TASK_MODES))
              .optional(),
            orientationCount: Joi.number().valid(2, 4).optional(),
            cardGridSize: Joi.number().valid(4, 6).optional(),
          })
          .optional(),
        vernier: Joi.object()
          .keys({
            lineHeightDeg: Joi.number().optional(),
            taskMode: Joi.string().valid(...VERNIER_TASK_MODES).optional(),
            taskModesPerSession: Joi.array()
              .items(Joi.string().valid(...VERNIER_TASK_MODES))
              .optional(),
            offsetRatio: Joi.number().min(0.1).max(1).optional(),
          })
          .optional(),
        crowding: Joi.object()
          .keys({
            flankerCount: Joi.number().integer().min(1).max(3).optional(),
            letterSet: Joi.string().optional(),
            taskMode: Joi.string().valid(...CROWDING_TASK_MODES).optional(),
            taskModesPerSession: Joi.array()
              .items(Joi.string().valid(...CROWDING_TASK_MODES))
              .optional(),
            letterOptionCount: Joi.number().valid(4).optional(),
            cardGridSize: Joi.number().valid(4).optional(),
          })
          .optional(),
        stereopsis: Joi.object()
          .keys({
            taskMode: Joi.string().valid(...STEREOPSIS_TASK_MODES).optional(),
            taskModesPerSession: Joi.array()
              .items(Joi.string().valid(...STEREOPSIS_TASK_MODES))
              .optional(),
            shapeOptionCount: Joi.number().integer().min(3).max(8).optional(),
            positionCount: Joi.number().valid(5).optional(),
          })
          .optional(),
      })
      .optional(),
    gamification: Joi.object()
      .keys({
        theme: Joi.string().valid('space').optional(),
        enableSound: Joi.boolean().optional(),
      })
      .optional(),
  })
  .optional();

const createExerciseConfig = {
  body: Joi.object().keys({
    exerciseId: Joi.number().integer().required(),
    patientId: Joi.number().integer().allow(null).optional(),
    name: Joi.string().required(),
    configType: Joi.string().valid('admin', 'doctor').required(),
    eye: Joi.string().valid('right', 'left', 'both').optional(),
    distance: Joi.number().precision(2).min(0.1).max(10).optional(),
    duration: Joi.number().min(0.5).max(180).optional(), // Allow 0.5 minutes (30 seconds) minimum
    frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').optional(),
    executionCount: Joi.number().integer().min(1).max(10).optional(),
    fontSize: Joi.number().integer().min(8).max(110).optional(),
    contrast: Joi.number().integer().min(0).max(100).optional(),
    colorScheme: Joi.alternatives()
      .try(
        Joi.string().valid('standard', 'high-contrast', 'redgreen', 'bluewhite'),
        Joi.object().keys({
          preset: Joi.string().optional(),
          textColor: Joi.string()
            .pattern(/^#[0-9A-Fa-f]{6}$/)
            .optional(),
          backgroundColor: Joi.string()
            .pattern(/^#[0-9A-Fa-f]{6}$/)
            .optional(),
        })
      )
      .optional(),
    // Vision Type only (no level or override in config creation)
    visionType: Joi.string().valid('far', 'near', 'contrast', 'stereopsis').optional(),
    levelOverride: Joi.boolean().optional(),
    visionLevel: Joi.when('levelOverride', {
      is: true,
      then: Joi.number().integer().min(1).max(20).required(),
      otherwise: Joi.number().integer().min(1).max(20).allow(null).optional(),
    }),
    configReferentId: Joi.number().integer().allow(null).optional(),
    levels: Joi.object().optional(),
    passConditions: Joi.object().optional(),
    autoAdjustmentRules: Joi.object().allow(null).optional(),
    autoAdjustLevel: Joi.boolean().optional(),
    inactivityThreshold: Joi.number().integer().min(5).max(300).allow(null).optional(),
    difficultyBaselineSource: Joi.string().valid('current_exam', 'latest_achieved').optional(),
    notificationSettings: notificationSchema.optional(),
    vtSettings: vtSettingsSchema,
    centerId: Joi.number().integer().optional(),
    createdBy: Joi.number().integer().optional(),
    updatedBy: Joi.number().integer().optional(),
  }),
};

const getExerciseConfigByExerciseId = {
  params: Joi.object().keys({
    exerciseId: Joi.number().integer().required(),
  }),
};

const updateExerciseConfig = {
  params: Joi.object().keys({
    exerciseId: Joi.number().integer().required(),
  }),
  body: Joi.object()
    .keys({
      exerciseId: Joi.number().integer().optional(),
      patientId: Joi.number().integer().allow(null).optional(),
      levels: Joi.object().optional(),
      passConditions: Joi.object().optional(),
      autoAdjustmentRules: Joi.object().allow(null).optional(),
      autoAdjustLevel: Joi.boolean().optional(),
      inactivityThreshold: Joi.number().integer().min(5).max(300).allow(null).optional(),
      difficultyBaselineSource: Joi.string().valid('current_exam', 'latest_achieved').optional(),
      notificationSettings: notificationSchema.optional(),
      vtSettings: vtSettingsSchema,
      centerId: Joi.number().integer().optional(),
      updatedBy: Joi.number().integer().optional(),
    })
    .min(1),
};

const deleteExerciseConfig = {
  params: Joi.object().keys({
    exerciseId: Joi.number().integer().required(),
  }),
};

const getExerciseConfigById = {
  params: Joi.object().keys({
    configId: Joi.number().integer().required(),
  }),
};

const updateExerciseConfigById = {
  params: Joi.object().keys({
    configId: Joi.number().integer().required(),
  }),
  body: Joi.object()
    .keys({
      id: Joi.number().integer(),
      name: Joi.string().optional(),
      configType: Joi.string().valid('admin', 'doctor').optional(),
      exerciseId: Joi.number().integer().optional(),
      patientId: Joi.number().integer().allow(null).optional(),
      eye: Joi.string().valid('right', 'left', 'both').optional(),
      distance: Joi.number().precision(2).min(0.1).max(10).optional(),
      duration: Joi.number().min(0.5).max(180).optional(), // Allow 0.5 minutes (30 seconds) minimum
      frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').optional(),
      executionCount: Joi.number().integer().min(1).max(10).optional(),
      fontSize: Joi.number().integer().min(8).max(110).optional(),
      contrast: Joi.number().integer().min(0).max(100).optional(),
      colorScheme: Joi.alternatives()
        .try(
          Joi.string().valid('standard', 'high-contrast', 'redgreen', 'bluewhite'),
          Joi.object().keys({
            preset: Joi.string().optional(),
            textColor: Joi.string()
              .pattern(/^#[0-9A-Fa-f]{6}$/)
              .optional(),
            backgroundColor: Joi.string()
              .pattern(/^#[0-9A-Fa-f]{6}$/)
              .optional(),
          })
        )
        .optional(),
      visionType: Joi.string().valid('far', 'near', 'contrast', 'stereopsis').optional(),
      visionLevel: Joi.when('visionType', {
        is: 'far',
        then: Joi.number().integer().min(1).max(20).allow(null).optional(),
        otherwise: Joi.when('visionType', {
          is: 'near',
          then: Joi.number().integer().min(1).max(6).allow(null).optional(),
          otherwise: Joi.when('visionType', {
            is: 'contrast',
            then: Joi.number().integer().min(1).max(16).allow(null).optional(),
            otherwise: Joi.number().integer().min(1).max(20).allow(null).optional(),
          }),
        }),
      }),
      levelOverride: Joi.boolean().optional(),
      configReferentId: Joi.number().integer().allow(null).optional(),
      levels: Joi.object().optional(),
      passConditions: Joi.object().optional(),
      autoAdjustmentRules: Joi.object().allow(null).optional(),
      autoAdjustLevel: Joi.boolean().optional(),
      inactivityThreshold: Joi.number().integer().min(5).max(300).allow(null).optional(),
      difficultyBaselineSource: Joi.string().valid('current_exam', 'latest_achieved').optional(),
      notificationSettings: notificationSchema.optional(),
      vtSettings: vtSettingsSchema,
      centerId: Joi.number().integer().optional(),
      updatedBy: Joi.number().integer().optional(),
    })
    .min(1),
};

const deleteExerciseConfigById = {
  params: Joi.object().keys({
    configId: Joi.number().integer().required(),
  }),
};

const deleteExerciseConfigs = {
  body: Joi.object().keys({
    ids: Joi.array().items(Joi.number().integer().positive().required()).min(1).required(),
    centerId: Joi.number().integer().positive().optional(),
    updatedBy: Joi.number().integer().positive().optional(),
  }),
};

const getExerciseConfigs = {
  query: Joi.object().keys({
    exerciseId: Joi.number().integer().optional(), // Optional for filtering
    configType: Joi.string().valid('admin', 'doctor'),
    name: Joi.string(),
    patientId: Joi.number().integer(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const assignTemplateToPatient = {
  params: Joi.object().keys({
    exerciseId: Joi.number().integer().required(),
    patientId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    templateId: Joi.number().integer().required(),
    centerId: Joi.number().integer().required(),
    createdBy: Joi.number().integer().required(),
    updatedBy: Joi.number().integer().required(),
    // Allow customization
    levels: Joi.object().optional(),
    passConditions: Joi.object().optional(),
    autoAdjustmentRules: Joi.object().allow(null).optional(),
      autoAdjustLevel: Joi.boolean().optional(),
      inactivityThreshold: Joi.number().integer().min(5).max(300).allow(null).optional(),
      notificationSettings: notificationSchema.optional(),
  }),
};

const assignConfigToPatients = {
  params: Joi.object().keys({
    // exerciseId: Joi.number().integer().required(),
    configId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    patientIds: Joi.array().items(Joi.number().integer()).min(1).required(),
    notes: Joi.string().optional(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
    templateId: Joi.number().integer().allow(null).optional(),
    // Patient-specific vision configuration overrides
    visionLevel: Joi.number().integer().min(1).max(20).optional(),
    levelOverride: Joi.boolean().optional(),
  }),
};

const saveColorSchemePreset = {
  body: Joi.object().keys({
    preset: Joi.string().valid('redBlue', 'redGreen', 'whiteBlack').required(),
    textColor: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .required(),
    backgroundColor: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .required(),
  }),
};

module.exports = {
  createExerciseConfig,
  getExerciseConfigByExerciseId,
  updateExerciseConfig,
  deleteExerciseConfig,
  getExerciseConfigById,
  updateExerciseConfigById,
  deleteExerciseConfigById,
  deleteExerciseConfigs,
  getExerciseConfigs,
  assignTemplateToPatient,
  assignConfigToPatients,
  saveColorSchemePreset,
};
