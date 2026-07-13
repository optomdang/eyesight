const httpStatus = require('http-status');
const { Op } = require('sequelize');
const ApiError = require('../../utils/ApiError');
const {
  TreatmentPackage,
  PatientTreatmentPackage,
  ExerciseAssignment,
  ExerciseConfig,
} = require('../../models');
const { sanitizePagination, buildSortBy, buildPagination } = require('../../utils/query');
const { removeAccents, escapeRegExp } = require('../../utils/common');
const auditLogService = require('../system/auditLog.service');

const normalizeConfigIds = (ids) => {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days));
  return result;
};

const computeImprovementPercent = async (packageId, configIds, centerId) => {
  if (!configIds.length) return 0;

  const activePatients = await PatientTreatmentPackage.findAll({
    where: {
      treatmentPackageId: packageId,
      deleted: false,
      status: 'active',
      expiresAt: { [Op.gt]: new Date() },
    },
    attributes: ['patientId'],
  });
  const patientIds = activePatients.map((row) => row.patientId);
  if (!patientIds.length) return 0;

  const assignments = await ExerciseAssignment.findAll({
    where: {
      patientId: { [Op.in]: patientIds },
      centerId,
      exerciseConfigId: { [Op.in]: configIds },
      deleted: false,
    },
    attributes: ['sessionsCompleted'],
  });
  if (!assignments.length) return 0;

  const total = assignments.reduce(
    (sum, assignment) => sum + Math.min(100, (assignment.sessionsCompleted || 0) * 8),
    0
  );
  return Math.round(total / assignments.length);
};

const enrichPackageRow = async (pkg) => {
  const json = pkg.toJSON ? pkg.toJSON() : pkg;
  const configIds = normalizeConfigIds(json.exerciseConfigIds);
  const userCount = await PatientTreatmentPackage.count({
    where: {
      treatmentPackageId: json.id,
      deleted: false,
      status: 'active',
      expiresAt: { [Op.gt]: new Date() },
    },
  });
  const improvementPercent = await computeImprovementPercent(json.id, configIds, json.centerId);

  return {
    ...json,
    exerciseCount: configIds.length,
    userCount,
    improvementPercent,
  };
};

const validateConfigIdsBelongToCenter = async (configIds, centerId) => {
  if (!configIds.length) return;
  const count = await ExerciseConfig.count({
    where: { id: { [Op.in]: configIds }, centerId, deleted: false },
  });
  if (count !== configIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Một hoặc nhiều chế độ tập luyện không hợp lệ');
  }
};

const isSystemPackage = (pkg) => pkg?.packageType === 'system';

const canUserMutateTreatmentPackage = (pkg, user) => {
  if (!user) return false;
  if (user.userType === 'admin') return true;
  if (isSystemPackage(pkg)) return false;
  return user.userType === 'doctor';
};

/**
 * When admin removes configs from a package, drop matching exercise assignments
 * for patients currently on that package. New configs are NOT auto-assigned.
 */
const removePatientAssignmentsForDroppedConfigs = async ({
  treatmentPackageId,
  centerId,
  removedConfigIds,
  actorUserId,
}) => {
  if (!removedConfigIds.length) return { removedAssignments: 0 };

  const activePatients = await PatientTreatmentPackage.findAll({
    where: {
      treatmentPackageId,
      centerId,
      deleted: false,
      status: 'active',
      expiresAt: { [Op.gt]: new Date() },
    },
    attributes: ['patientId'],
  });
  const patientIds = activePatients.map((row) => row.patientId);
  if (!patientIds.length) return { removedAssignments: 0 };

  const assignments = await ExerciseAssignment.findAll({
    where: {
      patientId: { [Op.in]: patientIds },
      centerId,
      exerciseConfigId: { [Op.in]: removedConfigIds },
    },
  });

  await Promise.all(
    assignments.map(async (assignment) => {
      const snapshot = assignment.get({ plain: true });
      await assignment.destroy();
      await auditLogService.logEntityAuditEvent({
        action: 'exerciseAssignment.delete',
        entityType: 'exerciseAssignment',
        entityId: snapshot.id,
        centerId: snapshot.centerId,
        actorUserId: actorUserId || null,
        metadata: {
          patientId: snapshot.patientId,
          exerciseConfigId: snapshot.exerciseConfigId,
          reason: 'treatment_package_config_removed',
          treatmentPackageId,
        },
      });
    })
  );

  return { removedAssignments: assignments.length };
};

const removeOutOfPackageAssignmentsForPatient = async ({
  patientId,
  centerId,
  allowedConfigIds,
  actorUserId,
  transaction = null,
}) => {
  const allowed = new Set(normalizeConfigIds(allowedConfigIds));
  if (!allowed.size) return 0;

  const assignments = await ExerciseAssignment.findAll({
    where: { patientId, centerId },
    transaction,
  });
  const toRemove = assignments.filter((assignment) => !allowed.has(Number(assignment.exerciseConfigId)));

  await Promise.all(
    toRemove.map(async (assignment) => {
      const snapshot = assignment.get({ plain: true });
      await assignment.destroy({ transaction });
      await auditLogService.logEntityAuditEvent({
        action: 'exerciseAssignment.delete',
        entityType: 'exerciseAssignment',
        entityId: snapshot.id,
        centerId: snapshot.centerId,
        actorUserId: actorUserId || null,
        metadata: {
          patientId: snapshot.patientId,
          exerciseConfigId: snapshot.exerciseConfigId,
          reason: 'treatment_package_changed',
        },
      });
    })
  );

  return toRemove.length;
};

const createTreatmentPackage = async (body) => {
  const exerciseConfigIds = normalizeConfigIds(body.exerciseConfigIds);
  await validateConfigIdsBelongToCenter(exerciseConfigIds, body.centerId);

  if (await TreatmentPackage.isDuplicateCode(body.code, body.centerId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã gói điều trị đã tồn tại');
  }

  body.createdBy = body.updatedBy;
  body.exerciseConfigIds = exerciseConfigIds;
  body.packageType = body.packageType === 'system' ? 'system' : 'custom';

  const pkg = await TreatmentPackage.create(body);

  await auditLogService.logEntityAuditEvent({
    action: 'treatmentPackage.create',
    entityType: 'treatmentPackage',
    entityId: pkg.id,
    centerId: pkg.centerId,
    actorUserId: body.updatedBy || null,
    metadata: { code: pkg.code, name: pkg.name },
  });

  return enrichPackageRow(pkg);
};

const queryTreatmentPackages = async (originalFilter, options) => {
  if (originalFilter.centerId) {
    try {
      const { ensureDefaultTreatmentPackages } = require('../system/defaultTreatmentPackages.service');
      await ensureDefaultTreatmentPackages(originalFilter.centerId, null);
    } catch (err) {
      // Non-fatal: list must still work if catalog sync fails (e.g. pending migration)
      const logger = require('../../config/logger');
      logger.error('Failed to sync default treatment packages (non-fatal):', err);
    }
  }

  const filter = { ...originalFilter, deleted: false };

  if (filter.name) {
    filter.name = { [Op.iRegexp]: removeAccents(escapeRegExp(filter.name)) };
  }
  if (filter.code) {
    filter.code = { [Op.iRegexp]: removeAccents(escapeRegExp(filter.code)) };
  }

  const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
  const order = buildSortBy(options.sortBy, ['name', 'code', 'createdAt', 'durationDays'], options.order);

  const { count, rows } = await TreatmentPackage.findAndCountAll({
    where: filter,
    limit,
    offset,
    order,
  });

  const enrichedRows = await Promise.all(rows.map((row) => enrichPackageRow(row)));

  return {
    rows: enrichedRows,
    ...buildPagination(count, limit, page),
  };
};

const getTreatmentPackageById = async (id) => {
  const pkg = await TreatmentPackage.findOne({ where: { id, deleted: false } });
  if (!pkg) return null;
  return enrichPackageRow(pkg);
};

const updateTreatmentPackageById = async (packageId, updateBody) => {
  const pkg = await TreatmentPackage.findOne({ where: { id: packageId, deleted: false } });
  if (!pkg) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy gói điều trị');
  }

  const previousConfigIds = normalizeConfigIds(pkg.exerciseConfigIds);

  if (updateBody.code && updateBody.code !== pkg.code) {
    if (await TreatmentPackage.isDuplicateCode(updateBody.code, pkg.centerId, packageId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Mã gói điều trị đã tồn tại');
    }
  }

  if (isSystemPackage(pkg)) {
    delete updateBody.packageType;
    delete updateBody.code;
  }

  if (updateBody.exerciseConfigIds) {
    updateBody.exerciseConfigIds = normalizeConfigIds(updateBody.exerciseConfigIds);
    await validateConfigIdsBelongToCenter(updateBody.exerciseConfigIds, pkg.centerId);
  }

  Object.assign(pkg, updateBody);
  await pkg.save();

  const nextConfigIds = normalizeConfigIds(pkg.exerciseConfigIds);
  const removedConfigIds = previousConfigIds.filter((id) => !nextConfigIds.includes(id));
  const addedConfigIds = nextConfigIds.filter((id) => !previousConfigIds.includes(id));

  let syncResult = { removedAssignments: 0 };
  if (removedConfigIds.length) {
    syncResult = await removePatientAssignmentsForDroppedConfigs({
      treatmentPackageId: pkg.id,
      centerId: pkg.centerId,
      removedConfigIds,
      actorUserId: updateBody.updatedBy || null,
    });
  }

  await auditLogService.logEntityAuditEvent({
    action: 'treatmentPackage.update',
    entityType: 'treatmentPackage',
    entityId: pkg.id,
    centerId: pkg.centerId,
    actorUserId: updateBody.updatedBy || null,
    metadata: {
      code: pkg.code,
      name: pkg.name,
      removedConfigIds,
      addedConfigIds,
      removedAssignments: syncResult.removedAssignments,
      addedConfigsRequireDoctorAssignment: addedConfigIds.length > 0,
    },
  });

  return enrichPackageRow(pkg);
};

const deleteTreatmentPackageById = async (packageId, body) => {
  const pkg = await TreatmentPackage.findOne({ where: { id: packageId, deleted: false } });
  if (!pkg) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy gói điều trị');
  }

  pkg.deleted = true;
  pkg.updatedBy = body.updatedBy;
  await pkg.save();

  await PatientTreatmentPackage.update(
    { status: 'cancelled', deleted: true },
    { where: { treatmentPackageId: packageId, deleted: false } }
  );
};

const deleteTreatmentPackageByIds = async (body) => {
  const ids = body.ids || [];
  await Promise.all(ids.map((id) => deleteTreatmentPackageById(id, body)));
};

const assignPackageToPatient = async ({
  patientId,
  treatmentPackageId,
  centerId,
  assignedBy,
  transaction = null,
}) => {
  const pkg = await TreatmentPackage.findOne({
    where: { id: treatmentPackageId, centerId, deleted: false },
    transaction,
  });
  if (!pkg) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy gói điều trị');
  }

  const assignedAt = new Date();
  const expiresAt = addDays(assignedAt, pkg.durationDays);

  await PatientTreatmentPackage.update(
    { status: 'cancelled', deleted: true },
    { where: { patientId, centerId, deleted: false, status: 'active' }, transaction }
  );

  const assignment = await PatientTreatmentPackage.create(
    {
      patientId,
      treatmentPackageId,
      centerId,
      assignedAt,
      expiresAt,
      assignedBy,
      status: 'active',
    },
    { transaction }
  );

  await removeOutOfPackageAssignmentsForPatient({
    patientId,
    centerId,
    allowedConfigIds: pkg.exerciseConfigIds,
    actorUserId: assignedBy,
    transaction,
  });

  return assignment;
};

const getActivePatientPackage = async (patientId) => {
  const now = new Date();
  const row = await PatientTreatmentPackage.findOne({
    where: {
      patientId,
      deleted: false,
      status: 'active',
      expiresAt: { [Op.gt]: now },
    },
    include: [{ model: TreatmentPackage, as: 'treatmentPackage', where: { deleted: false }, required: true }],
    order: [['assignedAt', 'DESC']],
  });

  if (!row) return null;

  return {
    assignment: row,
    treatmentPackage: row.treatmentPackage,
    isExpired: false,
    expiresAt: row.expiresAt,
    allowedConfigIds: normalizeConfigIds(row.treatmentPackage.exerciseConfigIds),
  };
};

const expireStaleAssignments = async (patientId) => {
  await PatientTreatmentPackage.update(
    { status: 'expired' },
    {
      where: {
        patientId,
        deleted: false,
        status: 'active',
        expiresAt: { [Op.lte]: new Date() },
      },
    }
  );
};

/**
 * Walk configReferentId chain (child clone → parent template).
 * Patient-specific configs created from a package mode keep referentId pointing
 * at the catalog template that is listed in exerciseConfigIds.
 */
const resolveConfigReferentChain = async (exerciseConfigId, transaction = null) => {
  const chain = [];
  let currentId = Number(exerciseConfigId);
  const seen = new Set();

  for (let depth = 0; depth < 10 && Number.isInteger(currentId) && currentId > 0 && !seen.has(currentId); depth += 1) {
    seen.add(currentId);
    chain.push(currentId);

    // eslint-disable-next-line no-await-in-loop
    const row = await ExerciseConfig.findByPk(currentId, {
      attributes: ['id', 'configReferentId'],
      transaction,
    });
    if (!row?.configReferentId) break;
    currentId = Number(row.configReferentId);
  }

  return chain;
};

const isConfigAllowedByPackage = async (exerciseConfigId, allowedConfigIds, transaction = null) => {
  const allowed = new Set(normalizeConfigIds(allowedConfigIds));
  if (!allowed.size) return false;

  const chain = await resolveConfigReferentChain(exerciseConfigId, transaction);
  return chain.some((id) => allowed.has(id));
};

const isExerciseConfigAccessibleForPatient = async (patientId, exerciseConfigId) => {
  await expireStaleAssignments(patientId);
  const active = await getActivePatientPackage(patientId);
  if (!active) return true;
  return isConfigAllowedByPackage(exerciseConfigId, active.allowedConfigIds);
};

const filterAssignmentsByTreatmentPackage = async (patientId, assignments) => {
  await expireStaleAssignments(patientId);
  const active = await getActivePatientPackage(patientId);
  if (!active) return assignments;

  const checks = await Promise.all(
    assignments.map(async (assignment) => {
      const configId = assignment.exerciseConfigId ?? assignment.exerciseConfig?.id;
      const allowed = await isConfigAllowedByPackage(configId, active.allowedConfigIds);
      return { assignment, allowed };
    })
  );

  return checks.filter(({ allowed }) => allowed).map(({ assignment }) => assignment);
};

module.exports = {
  createTreatmentPackage,
  queryTreatmentPackages,
  getTreatmentPackageById,
  updateTreatmentPackageById,
  deleteTreatmentPackageById,
  deleteTreatmentPackageByIds,
  assignPackageToPatient,
  getActivePatientPackage,
  isExerciseConfigAccessibleForPatient,
  isConfigAllowedByPackage,
  resolveConfigReferentChain,
  filterAssignmentsByTreatmentPackage,
  normalizeConfigIds,
  canUserMutateTreatmentPackage,
  isSystemPackage,
};
