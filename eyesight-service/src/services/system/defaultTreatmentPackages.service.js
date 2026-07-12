/**
 * Seed / ensure system-default treatment packages for a center.
 * Idempotent: existing rows (by catalog code or display name) are marked system
 * without overwriting exerciseConfigIds the admin already configured.
 */

const { Op } = require('sequelize');
const { ExerciseConfig, Center, TreatmentPackage } = require('../../models');
const { DEFAULT_TREATMENT_PACKAGES } = require('../../config/defaultTreatmentPackages');
const { ensureDefaultExerciseModes } = require('./defaultExerciseModes.service');

/**
 * @param {number} centerId
 * @param {string[]} modeNames
 * @param {import('sequelize').Transaction | null} [transaction]
 * @returns {Promise<number[]>}
 */
const resolveExerciseModeNamesToConfigIds = async (centerId, modeNames, transaction = null) => {
  if (!modeNames.length) return [];

  const configs = await ExerciseConfig.findAll({
    where: {
      centerId,
      name: { [Op.in]: modeNames },
      deleted: false,
      configType: { [Op.in]: ['admin', 'system'] },
    },
    attributes: ['id', 'name'],
    transaction,
  });

  const byName = new Map(configs.map((row) => [row.name, row.id]));
  const missing = modeNames.filter((name) => !byName.has(name));
  if (missing.length) {
    throw new Error(
      `Missing exercise configs for treatment package seed (center ${centerId}): ${missing.join(', ')}`
    );
  }

  return modeNames.map((name) => byName.get(name));
};

/**
 * @param {number} centerId
 * @param {number|null} actorUserId
 * @param {import('sequelize').Transaction | null} [transaction]
 * @returns {Promise<{ created: number, promoted: number, skipped: number }>}
 */
const ensureDefaultTreatmentPackages = async (centerId, actorUserId = null, transaction = null) => {
  await ensureDefaultExerciseModes(centerId, actorUserId, transaction);

  let created = 0;
  let promoted = 0;
  let skipped = 0;

  for (const def of DEFAULT_TREATMENT_PACKAGES) {
    // eslint-disable-next-line no-await-in-loop
    let pkg = await TreatmentPackage.findOne({
      where: { centerId, code: def.code, deleted: false },
      transaction,
    });

    if (!pkg) {
      // eslint-disable-next-line no-await-in-loop
      pkg = await TreatmentPackage.findOne({
        where: { centerId, name: def.name, deleted: false },
        transaction,
      });
    }

    if (pkg) {
      if (pkg.packageType !== 'system') {
        // eslint-disable-next-line no-await-in-loop
        await pkg.update(
          { packageType: 'system', updatedBy: actorUserId },
          { transaction }
        );
        promoted += 1;
      } else {
        skipped += 1;
      }
      // eslint-disable-next-line no-continue
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const exerciseConfigIds = await resolveExerciseModeNamesToConfigIds(
      centerId,
      def.exerciseModeNames,
      transaction
    );

    // eslint-disable-next-line no-await-in-loop
    await TreatmentPackage.create(
      {
        centerId,
        name: def.name,
        code: def.code,
        durationDays: def.durationDays,
        exerciseConfigIds,
        packageType: 'system',
        includesRefundGuarantee: Boolean(def.includesRefundGuarantee),
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      { transaction }
    );
    created += 1;
  }

  return { created, promoted, skipped };
};

/**
 * @returns {Promise<{ centers: number, created: number, promoted: number, skipped: number }>}
 */
const backfillDefaultTreatmentPackagesForAllCenters = async (actorUserId = null) => {
  const centers = await Center.findAll({
    where: { deleted: false },
    attributes: ['id'],
    order: [['id', 'ASC']],
  });

  let created = 0;
  let promoted = 0;
  let skipped = 0;

  for (const center of centers) {
    // eslint-disable-next-line no-await-in-loop
    const result = await ensureDefaultTreatmentPackages(center.id, actorUserId);
    created += result.created;
    promoted += result.promoted;
    skipped += result.skipped;
  }

  return { centers: centers.length, created, promoted, skipped };
};

module.exports = {
  resolveExerciseModeNamesToConfigIds,
  ensureDefaultTreatmentPackages,
  backfillDefaultTreatmentPackagesForAllCenters,
};
