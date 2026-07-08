/**
 * Seed / ensure system-default exercises + training modes for a center.
 * Idempotent: skips exercises/modes that already exist (by code or exerciseType + mode name).
 */

const { Op } = require('sequelize');
const httpStatus = require('http-status');
const { Exercise, ExerciseConfig, Center } = require('../../models');
const {
  DEFAULT_CENTER_EXERCISES,
  DEFAULT_EXERCISE_MODES,
} = require('../../config/defaultExerciseModes');
const exerciseService = require('../exercise/exercise.service');
// Lazy-require exerciseConfig.service inside helpers to avoid circular
// dependency (exerciseConfig.service also syncs catalog on list).

const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: false,
  methods: [],
  maxReminders: 3,
  reminderInterval: 24,
};

/**
 * Ensure base exercises for the catalog exist on this center.
 * Prefers stable catalog `code`; falls back to any existing row with same exerciseType
 * (centers created before catalog used generated codes).
 *
 * @returns {Promise<Record<string, import('../models').Exercise>>} map catalogCode → Exercise
 */
const ensureDefaultCenterExercises = async (centerId, updatedBy, transaction = null) => {
  const byCatalogCode = {};

  for (const def of DEFAULT_CENTER_EXERCISES) {
    // Sequential: same txn connection must not run parallel inserts.
    // eslint-disable-next-line no-await-in-loop
    let exercise = await Exercise.findOne({
      where: { centerId, code: def.code, deleted: false },
      transaction,
    });

    if (!exercise) {
      // eslint-disable-next-line no-await-in-loop
      exercise = await Exercise.findOne({
        where: { centerId, exerciseType: def.exerciseType, deleted: false },
        order: [['id', 'ASC']],
        transaction,
      });
    }

    if (!exercise) {
      try {
        // eslint-disable-next-line no-await-in-loop
        exercise = await exerciseService.createExercise(
          {
            name: def.name,
            code: def.code,
            description: def.description,
            exerciseType: def.exerciseType,
            status: 'active',
            centerId,
            createdBy: updatedBy,
            updatedBy,
          },
          transaction
        );
      } catch (error) {
        if (error.statusCode === httpStatus.BAD_REQUEST && String(error.message).includes('đã tồn tại')) {
          // eslint-disable-next-line no-await-in-loop
          exercise = await Exercise.findOne({
            where: { centerId, code: def.code, deleted: false },
            transaction,
          });
        } else {
          throw error;
        }
      }
    }

    if (exercise) {
      byCatalogCode[def.code] = exercise;
    }
  }

  return byCatalogCode;
};

/**
 * Ensure all DEFAULT_EXERCISE_MODES exist as admin configs on this center.
 * @returns {Promise<{ created: number, skipped: number }>}
 */
const ensureDefaultExerciseModes = async (centerId, updatedBy, transaction = null) => {
  const exercisesByCode = await ensureDefaultCenterExercises(centerId, updatedBy, transaction);
  let created = 0;
  let skipped = 0;

  for (const mode of DEFAULT_EXERCISE_MODES) {
    const exercise = exercisesByCode[mode.exerciseCode];
    if (!exercise) {
      skipped += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const existing = await ExerciseConfig.findOne({
      where: {
        centerId,
        exerciseId: exercise.id,
        name: mode.name,
        deleted: false,
        configType: { [Op.in]: ['admin', 'system'] },
      },
      transaction,
    });

    if (existing) {
      skipped += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    // eslint-disable-next-line global-require
    const exerciseConfigService = require('../exercise/exerciseConfig.service');
    // eslint-disable-next-line no-await-in-loop
    await exerciseConfigService.createExerciseConfig(
      {
        exerciseId: exercise.id,
        configType: 'admin',
        name: mode.name,
        visionType: mode.visionType,
        eye: mode.eye,
        distance: mode.distance,
        duration: mode.duration,
        frequency: mode.frequency,
        executionCount: mode.executionCount,
        inactivityThreshold: mode.inactivityThreshold,
        levelOverride: mode.levelOverride,
        visionLevel: null,
        difficultyBaselineSource: mode.difficultyBaselineSource,
        colorScheme: mode.colorScheme,
        vtSettings: mode.vtSettings,
        fontSize: 16,
        contrast: 100,
        notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
        centerId,
        createdBy: updatedBy,
        updatedBy,
      },
      transaction
    );
    created += 1;
  }

  return { created, skipped };
};

/**
 * Backfill catalog modes for every active center (idempotent).
 * Safe to run on every API boot when DEFAULT_EXERCISE_MODES grows — only creates
 * missing modes; never deletes or overwrites customized existing rows.
 *
 * @returns {Promise<{ centers: number, created: number, skipped: number, summary: object[] }>}
 */
const backfillDefaultExerciseModesForAllCenters = async (actorUserId = null) => {
  const centers = await Center.findAll({
    where: { deleted: false },
    attributes: ['id', 'code', 'name'],
    order: [['id', 'ASC']],
  });

  const summary = [];
  let created = 0;
  let skipped = 0;

  for (const center of centers) {
    // eslint-disable-next-line no-await-in-loop
    const result = await ensureDefaultExerciseModes(center.id, actorUserId);
    created += result.created;
    skipped += result.skipped;
    summary.push({
      centerId: center.id,
      code: center.code,
      name: center.name,
      ...result,
    });
  }

  return { centers: centers.length, created, skipped, summary };
};

module.exports = {
  ensureDefaultCenterExercises,
  ensureDefaultExerciseModes,
  backfillDefaultExerciseModesForAllCenters,
  DEFAULT_NOTIFICATION_SETTINGS,
};
