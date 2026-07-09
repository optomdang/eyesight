/**
 * Exercise Assignment Service
 * Handles CRUD operations for ExerciseAssignment records.
 * Extracted from exercise.service.js for better separation of concerns.
 */

const httpStatus = require('http-status');
const { Op } = require('sequelize');
const moment = require('moment');
const { ExerciseAssignment, ExerciseConfig, Patient, User, Exercise, ExerciseSession } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { sequelize } = require('../../config/db');
const { standardQuery, withTransaction } = require('../../utils/patterns');
const { getCurrentCycleDateRange } = require('../../utils/common');
const { provisionExerciseSessions } = require('../../utils/sessionProvisionUtils');
const auditLogService = require('../system/auditLog.service');
const treatmentPackageService = require('./treatmentPackage.service');

/**
 * Calculate compliance percentage for an assignment
 * % tuân thủ = sessionsCompleted / expectedSessionsToDate * 100
 * expectedSessionsToDate = number of frequency periods elapsed since assignedAt
 */
const calculateCompliancePercentage = (sessionsCompleted, assignedAt, frequency) => {
  if (!assignedAt || !frequency) return null;

  const start = moment(assignedAt);
  const now = moment();

  let expected = 0;
  switch (frequency) {
    case 'daily':
      expected = now.diff(start, 'days') + 1;
      break;
    case 'weekly':
      expected = now.diff(start, 'weeks') + 1;
      break;
    case 'bi-weekly':
      expected = Math.floor(now.diff(start, 'days') / 14) + 1;
      break;
    case 'monthly':
      expected = now.diff(start, 'months') + 1;
      break;
    default:
      return null;
  }

  if (expected <= 0) return 100;
  return Math.min(Math.round(((sessionsCompleted || 0) / expected) * 100), 100);
};

/**
 * Assign exercise config to multiple patients
 */
const assignConfigToPatients = async (exerciseConfigId, patientIds, assignmentData, centerId) => {
  // Verify config exists and belongs to center
  const config = await ExerciseConfig.findByPk(exerciseConfigId);

  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cấu hình bài tập không tồn tại');
  }

  if (centerId && config.centerId !== centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền thao tác với cấu hình bài tập này');
  }

  const uniquePatientIds = [...new Set((patientIds || []).map(Number).filter(Boolean))];

  // Verify all selected patients exist and belong to center
  if (uniquePatientIds.length > 0) {
    const patients = await Patient.findAll({
      where: {
        id: uniquePatientIds,
        deleted: false,
      },
    });

    if (patients.length !== uniquePatientIds.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Một hoặc nhiều bệnh nhân không tồn tại');
    }
  }

  // Validate vision level if provided
  if (assignmentData.visionLevel) {
    const maxLevels = {
      far: 20,
      near: 6,
      contrast: 16,
    };

    const configVisionType = config.visionType;
    if (configVisionType) {
      const maxLevel = maxLevels[configVisionType];
      if (assignmentData.visionLevel < 1 || assignmentData.visionLevel > maxLevel) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Mức độ thị lực cho ${configVisionType} phải từ 1 đến ${maxLevel}, nhận được: ${assignmentData.visionLevel}`
        );
      }
    } else {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Cấu hình phải có loại thị lực để thiết lập mức độ thị lực riêng cho bệnh nhân'
      );
    }
  }

  const existingAssignments = await ExerciseAssignment.findAll({
    where: {
      exerciseConfigId,
      centerId: config.centerId,
    },
  });

  const existingAssignmentsByPatientId = new Map(
    existingAssignments.map((assignment) => [assignment.patientId, assignment])
  );
  const patientIdsToCreate = uniquePatientIds.filter((patientId) => !existingAssignmentsByPatientId.has(patientId));
  const assignmentsToRemove = existingAssignments.filter((assignment) => !uniquePatientIds.includes(assignment.patientId));

  for (const patientId of patientIdsToCreate) {
    const allowed = await treatmentPackageService.isExerciseConfigAccessibleForPatient(
      patientId,
      exerciseConfigId
    );
    if (!allowed) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Chế độ tập luyện không thuộc gói điều trị của bệnh nhân'
      );
    }
  }

  // Prepare assignment data
  const assignmentsToCreate = patientIdsToCreate.map((patientId) => ({
    patientId,
    exerciseConfigId,
    centerId: config.centerId,
    assignedBy: assignmentData.assignedBy,
    assignedAt: new Date(),
    status: 'active',
    priority: assignmentData.priority || 'normal',
    notes: assignmentData.notes,
    sessionsCompleted: 0,
    // Patient-specific vision configuration overrides
    // visionLevel only stored when levelOverride is explicitly true
    visionLevel: assignmentData.levelOverride ? assignmentData.visionLevel : null,
    levelOverride: assignmentData.levelOverride || false,
    trainingEye: assignmentData.trainingEye || null,
  }));

  const assignments = await withTransaction(async (transaction) => {
    if (assignmentsToRemove.length > 0) {
      await ExerciseAssignment.destroy({
        where: {
          id: assignmentsToRemove.map((assignment) => assignment.id),
        },
        transaction,
      });
    }

    if (assignmentsToCreate.length === 0) {
      return [];
    }

    return ExerciseAssignment.bulkCreate(assignmentsToCreate, {
      transaction,
      returning: true,
    });
  });

  // Auto-provision today's sessions for ALL assignments (async, non-blocking).
  // Always create first session immediately so patients can start practicing.
  // Run after transaction commit to avoid rollback on provisioning failure.
  setImmediate(async () => {
    await Promise.all(
      assignments.map(async (assignment) => {
        const fullAssignment = await ExerciseAssignment.findByPk(assignment.id, {
          include: [{ model: ExerciseConfig, as: 'exerciseConfig' }],
        });
        if (fullAssignment) {
          await provisionExerciseSessions(fullAssignment);
        }
      })
    );
  });

  await auditLogService.logEntityAuditEvent({
    action: 'exerciseAssignment.assign',
    entityType: 'exerciseAssignment',
    centerId: config.centerId,
    actorUserId: assignmentData.assignedBy || null,
    metadata: {
      exerciseConfigId,
      patientIds: uniquePatientIds,
      assignmentIds: assignments.map((assignment) => assignment.id),
      removedAssignmentIds: assignmentsToRemove.map((assignment) => assignment.id),
      removedPatientIds: assignmentsToRemove.map((assignment) => assignment.patientId),
      createdCount: assignments.length,
      removedCount: assignmentsToRemove.length,
      totalSelected: uniquePatientIds.length,
      visionLevel: assignmentData.visionLevel ?? null,
      levelOverride: Boolean(assignmentData.levelOverride),
    },
  });

  return assignments;
};

/**
 * Get all assignments for a specific config
 */
const getConfigAssignments = async (exerciseConfigId, centerId, filter = {}, options = {}) => {
  const fullFilter = {
    exerciseConfigId,
    ...(centerId ? { centerId } : {}),
    ...filter,
  };

  const includeConfig = [
    {
      model: Patient,
      as: 'patient',
      attributes: ['id'],
      where: { deleted: false },
    },
    {
      model: User,
      as: 'assignedByUser',
      attributes: ['id', 'name', 'email'],
    },
  ];

  const result = await standardQuery(ExerciseAssignment, fullFilter, options, includeConfig);

  const missingAssignedByUserIds = Array.from(
    new Set(
      result.rows
        .filter((assignment) => assignment.assignedBy && !assignment.assignedByUser)
        .map((assignment) => assignment.assignedBy)
    )
  );

  if (missingAssignedByUserIds.length > 0) {
    const assignedByUsers = await User.findAll({
      where: {
        id: {
          [Op.in]: missingAssignedByUserIds,
        },
      },
      attributes: ['id', 'name', 'email'],
    });

    const assignedByUserMap = new Map(assignedByUsers.map((user) => [user.id, user]));

    result.rows.forEach((assignment) => {
      if (!assignment.assignedByUser && assignment.assignedBy) {
        assignment.dataValues.assignedByUser = assignedByUserMap.get(assignment.assignedBy) || null;
      }
    });
  }

  return result;
};

/**
 * Get all assigned configs for a specific patient
 * Includes currentSession for portal display
 */
const getPatientAssignments = async (filter = {}, options = {}) => {
  const { include = [] } = options;
  const { exerciseId, ...assignmentFilter } = filter;

  const exerciseConfigInclude = {
    model: ExerciseConfig,
    as: 'exerciseConfig',
    include: [
      {
        model: Exercise,
        as: 'exercise',
        attributes: ['id', 'name', 'code', 'exerciseType'],
      },
    ],
    ...(exerciseId != null && exerciseId !== ''
      ? { where: { exerciseId: Number(exerciseId) }, required: true }
      : {}),
  };

  const defaultInclude = [
    exerciseConfigInclude,
    {
      model: User,
      as: 'assignedByUser',
      attributes: ['id', 'name', 'email'],
    },
  ];

  const includeConfig = [...defaultInclude, ...include];

  const result = await standardQuery(ExerciseAssignment, assignmentFilter, options, includeConfig);

  // Attach session for the current frequency cycle (not stale past sessions)
  if (result && result.rows) {
    for (const assignment of result.rows) {
      const frequency = assignment.exerciseConfig?.frequency || 'daily';
      // eslint-disable-next-line no-await-in-loop
      await provisionExerciseSessions(assignment);

      const { start: cycleStart, end: cycleEnd } = getCurrentCycleDateRange(frequency, new Date());
      // eslint-disable-next-line no-await-in-loop
      const currentSession = await ExerciseSession.findOne({
        where: {
          exerciseAssignmentId: assignment.id,
          startedAt: { [Op.gte]: cycleStart, [Op.lte]: cycleEnd },
        },
        order: [['createdAt', 'DESC']],
        attributes: [
          'id',
          'code',
          'status',
          'startedAt',
          'completedAt',
          'executionsCompleted',
          'validExecutions',
          'totalScore',
          'averageScore',
          'bestScore',
          'validityPercentage',
          'executionCount',
        ],
      });

      assignment.dataValues.currentSession = currentSession;

      // Compute compliance percentage: sessionsCompleted / expectedSessionsToDate * 100
      // expectedSessionsToDate = number of periods elapsed since assignedAt based on frequency
      assignment.dataValues.compliancePercentage = calculateCompliancePercentage(
        assignment.sessionsCompleted,
        assignment.assignedAt,
        assignment.exerciseConfig && assignment.exerciseConfig.frequency
      );
    }
  }

  return result;
};

/**
 * Get patient exercise sessions with filters
 * Used for patient portal to show active/pending sessions
 *
 * @param {Object} filter - Filter conditions (patientId required, status optional)
 * @param {Object} options - Query options (pagination, sorting)
 * @returns {Promise<Object>} Paginated sessions with assignment details
 */
const getPatientSessions = async (filter = {}, options = {}) => {
  const { patientId, status } = filter;

  if (!patientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Patient ID is required');
  }

  // Build where clause for sessions
  const sessionWhere = {};
  if (status) {
    // Support both single status and array of statuses
    sessionWhere.status = Array.isArray(status) ? { [Op.in]: status } : status;
  }

  // Get sessions with assignment details
  const result = await standardQuery(ExerciseSession, sessionWhere, options, [
    {
      model: ExerciseAssignment,
      as: 'exerciseAssignment',
      where: { patientId, status: 'active' }, // Only active assignments
      required: true,
      include: [
        {
          model: ExerciseConfig,
          as: 'exerciseConfig',
          include: [
            {
              model: Exercise,
              as: 'exercise',
              attributes: ['id', 'name', 'code', 'exerciseType'],
            },
          ],
        },
        {
          model: User,
          as: 'assignedByUser',
          attributes: ['id', 'name', 'email'],
        },
      ],
    },
  ]);

  return result;
};

/**
 * Update assignment status and details
 */
const updateAssignment = async (assignmentId, updateData) => {
  const assignment = await ExerciseAssignment.findByPk(assignmentId);

  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao không tồn tại');
  }

  // Clear visionLevel when levelOverride is false
  if ('levelOverride' in updateData && !updateData.levelOverride) {
    updateData.visionLevel = null;
  }

  const updatedAssignment = await assignment.update(updateData);

  await auditLogService.logEntityAuditEvent({
    action: 'exerciseAssignment.update',
    entityType: 'exerciseAssignment',
    entityId: updatedAssignment.id,
    centerId: updatedAssignment.centerId,
    actorUserId: updateData.updatedBy || null,
    metadata: {
      patientId: updatedAssignment.patientId,
      exerciseConfigId: updatedAssignment.exerciseConfigId,
      changedFields: Object.keys(updateData),
      nextStatus: updatedAssignment.status,
    },
  });

  return updatedAssignment;
};

/**
 * Remove assignment (unassign config from patient)
 */
const removeAssignment = async (assignmentId, deleteBody = {}) => {
  const assignment = await ExerciseAssignment.findByPk(assignmentId);

  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao không tồn tại');
  }

  const assignmentSnapshot = assignment.get({ plain: true });
  await assignment.destroy();

  await auditLogService.logEntityAuditEvent({
    action: 'exerciseAssignment.delete',
    entityType: 'exerciseAssignment',
    entityId: assignmentSnapshot.id,
    centerId: assignmentSnapshot.centerId,
    actorUserId: deleteBody.updatedBy || null,
    metadata: {
      patientId: assignmentSnapshot.patientId,
      exerciseConfigId: assignmentSnapshot.exerciseConfigId,
      status: assignmentSnapshot.status,
    },
  });
};

/**
 * Record session completion
 */
const recordSession = async (patientId, assignmentId, sessionData) => {
  const { exerciseComplianceService } = require('../index');

  const assignment = await ExerciseAssignment.findByPk(assignmentId);

  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao đang hoạt động không tồn tại');
  }

  // Use compliance service to handle session recording and compliance updates
  const updatedAssignment = await exerciseComplianceService.recordSessionCompletion(assignmentId, sessionData);

  return updatedAssignment;
};

/**
 * Get assignment statistics grouped by status
 */
const getAssignmentStats = async (centerId, filter = {}) => {
  const stats = await ExerciseAssignment.findAll({
    where: {
      centerId,
      ...filter,
    },
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['status'],
    raw: true,
  });

  return stats.reduce((acc, stat) => {
    acc[stat.status] = parseInt(stat.count);
    return acc;
  }, {});
};

/**
 * Get assignment by ID with full details
 */
const getAssignmentById = async (assignmentId) => {
  const assignment = await ExerciseAssignment.findByPk(assignmentId, {
    include: [
      {
        model: ExerciseConfig,
        as: 'exerciseConfig',
        include: [
          {
            model: Exercise,
            as: 'exercise',
          },
        ],
      },
      {
        model: Patient,
        as: 'patient',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email'],
          },
        ],
      },
    ],
  });

  return assignment;
};

module.exports = {
  assignConfigToPatients,
  getConfigAssignments,
  getPatientAssignments,
  getPatientSessions,
  updateAssignment,
  removeAssignment,
  recordSession,
  getAssignmentStats,
  getAssignmentById,
};
