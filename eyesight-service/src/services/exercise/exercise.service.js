const httpStatus = require('http-status');
const { Exercise } = require('../../models');
const ApiError = require('../../utils/ApiError');
const auditLogService = require('../system/auditLog.service');
const {
  standardQuery,
  standardCreate,
  standardUpdate,
  standardSoftDelete,
  standardBulkSoftDelete,
  standardGetById,
  standardGetByField,
} = require('../../utils/patterns');

// ===== EXERCISE DEFINITIONS =====

const createExercise = async (exerciseBody, transaction = null) => {
  if (await Exercise.isDuplicateCode(exerciseBody.code, exerciseBody.centerId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã bài tập đã tồn tại');
  }

  const exercise = await standardCreate(Exercise, exerciseBody, transaction);

  await auditLogService.logEntityAuditEvent({
    action: 'exercise.create',
    entityType: 'exercise',
    entityId: exercise.id,
    centerId: exercise.centerId,
    actorUserId: exerciseBody.updatedBy || null,
    metadata: {
      code: exercise.code,
      name: exercise.name,
    },
  });

  return exercise;
};

const queryExercises = async (originalFilter, options) => {
  const filter = { ...originalFilter, deleted: false };
  return standardQuery(Exercise, filter, options);
};

const getExerciseById = async (id) => {
  return standardGetById(Exercise, id);
};

const getExerciseByCode = async (code) => {
  return standardGetByField(Exercise, 'code', code);
};

const updateExerciseById = async (exerciseId, updateBody) => {
  const exercise = await standardUpdate(Exercise, exerciseId, updateBody, 'Bài tập');

  await auditLogService.logEntityAuditEvent({
    action: 'exercise.update',
    entityType: 'exercise',
    entityId: exercise.id,
    centerId: exercise.centerId,
    actorUserId: updateBody.updatedBy || null,
    metadata: {
      updatedFields: Object.keys(updateBody || {}),
    },
  });

  return exercise;
};

const deleteExerciseById = async (exerciseId, deleteBody = {}) => {
  const exercise = await standardSoftDelete(Exercise, exerciseId, 'Bài tập');

  await auditLogService.logEntityAuditEvent({
    action: 'exercise.delete',
    entityType: 'exercise',
    entityId: exercise.id,
    centerId: exercise.centerId,
    actorUserId: deleteBody.updatedBy || null,
    metadata: {
      code: exercise.code,
      name: exercise.name,
    },
  });

  return exercise;
};

const deleteExerciseByIds = async (deleteBody) => {
  const ids = Array.isArray(deleteBody) ? deleteBody : deleteBody?.ids;
  const affectedCount = await standardBulkSoftDelete(Exercise, ids);

  await auditLogService.logEntityAuditEvent({
    action: 'exercise.bulkDelete',
    entityType: 'exercise',
    centerId: deleteBody?.centerId ?? null,
    actorUserId: deleteBody?.updatedBy || null,
    metadata: {
      ids,
      affectedCount,
    },
  });

  return affectedCount;
};

// ===== EXPORTS =====

module.exports = {
  createExercise,
  queryExercises,
  getExerciseById,
  getExerciseByCode,
  updateExerciseById,
  deleteExerciseById,
  deleteExerciseByIds,
};
