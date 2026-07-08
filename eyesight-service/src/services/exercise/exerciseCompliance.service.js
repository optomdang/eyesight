/**
 * Exercise Compliance Service
 * Handles frequency-based compliance tracking and notifications
 */

const { Op } = require('sequelize');
const httpStatus = require('http-status');
const moment = require('moment');
const ApiError = require('../../utils/ApiError');
const { ExerciseAssignment, ExerciseConfig, Patient, User, Exercise, Notification } = require('../../models');
const auditLogService = require('../system/auditLog.service');
const { exerciseNotificationService } = require('../index');
const logger = require('../../config/logger');
const { buildInTreatmentWhereClause } = require('../../utils/treatmentUtils');
const { recordSessionCompletion } = require('./exerciseSessionCompletion.service');

/**
 * Calculate next due date based on frequency
 */
const calculateNextDueDate = (frequency, lastSessionDate = null) => {
  const baseDate = lastSessionDate || new Date();
  const nextDue = moment(baseDate);

  switch (frequency) {
    case 'daily':
      nextDue.add(1, 'day');
      break;
    case 'weekly':
      nextDue.add(7, 'days');
      break;
    case 'bi-weekly':
      nextDue.add(14, 'days');
      break;
    case 'monthly':
      nextDue.add(1, 'month');
      break;
    default:
      nextDue.add(7, 'days');
  }

  return nextDue.toDate();
};

/**
 * Update compliance status for an assignment
 */
const updateComplianceStatus = async (assignmentId) => {
  const assignment = await ExerciseAssignment.findByPk(assignmentId, {
    include: [
      {
        model: ExerciseConfig,
        as: 'exerciseConfig',
        include: [{ model: Exercise, as: 'exercise' }],
      },
    ],
  });

  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao không tồn tại');
  }

  const config = assignment.exerciseConfig;
  if (!config || !config.frequency) {
    return assignment; // Skip if no frequency specified
  }

  const now = new Date();
  let newStatus = 'on_track';
  let { nextDueDate } = assignment;

  // Calculate next due date if not set
  if (!nextDueDate) {
    nextDueDate = calculateNextDueDate(config.frequency, assignment.lastSessionAt);
  }

  // Determine compliance status
  if (assignment.status === 'paused') {
    newStatus = 'paused';
  } else if (assignment.status === 'completed') {
    newStatus = 'completed';
  } else if (now > nextDueDate) {
    newStatus = 'overdue';
  } else {
    newStatus = 'on_track';
  }

  // Update assignment
  await assignment.update({
    complianceStatus: newStatus,
    nextDueDate,
  });

  return assignment;
};

/**
 * Record session completion and update compliance
 * Delegated to exerciseSessionCompletion.service to avoid circular dependency.
 */

/**
 * Get overdue assignments for notifications
 */
const getOverdueAssignments = async (centerIds = null) => {
  const whereClause = {
    status: 'active',
    complianceStatus: ['on_track', 'overdue'],
    nextDueDate: {
      [Op.lt]: new Date(),
    },
  };

  if (centerIds) {
    whereClause.centerId = Array.isArray(centerIds) ? { [Op.in]: centerIds } : centerIds;
  }

  const assignments = await ExerciseAssignment.findAll({
    where: whereClause,
    include: [
      {
        model: Patient,
        as: 'patient',
        required: true,
        where: {
          deleted: false,
          ...buildInTreatmentWhereClause(),
        },
        include: [{ model: User, as: 'user' }],
      },
      {
        model: ExerciseConfig,
        as: 'exerciseConfig',
        include: [{ model: Exercise, as: 'exercise' }],
      },
      {
        model: User,
        as: 'assignedByUser',
      },
    ],
    order: [['nextDueDate', 'ASC']],
  });

  return assignments;
};

/**
 * Check and update compliance for all active assignments
 */
const updateAllComplianceStatuses = async (centerIds = null) => {
  const whereClause = {
    status: 'active',
  };

  if (centerIds) {
    whereClause.centerId = Array.isArray(centerIds) ? { [Op.in]: centerIds } : centerIds;
  }

  const assignments = await ExerciseAssignment.findAll({
    where: whereClause,
    include: [
      {
        model: Patient,
        as: 'patient',
        required: true,
        attributes: ['id'],
        where: {
          deleted: false,
          ...buildInTreatmentWhereClause(),
        },
      },
      {
        model: ExerciseConfig,
        as: 'exerciseConfig',
        include: [{ model: Exercise, as: 'exercise' }],
      },
    ],
  });

  const results = await Promise.allSettled(
    assignments.map(async (assignment) => {
      const updated = await updateComplianceStatus(assignment.id);
      return { updated, assignmentId: assignment.id };
    })
  );

  const successResults = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const errorResults = results.filter((r) => r.status === 'rejected');

  return {
    updated: successResults.length,
    overdue: successResults.filter((r) => r.updated.complianceStatus === 'overdue').length,
    onTrack: successResults.filter((r) => r.updated.complianceStatus === 'on_track').length,
    errors: errorResults.map((r) => ({
      assignmentId: r.reason?.assignmentId,
      error: r.reason?.message || 'Unknown error',
    })),
  };
};

/**
 * Send reminder notifications for overdue assignments
 * Uses notification settings from ExerciseConfig (database config)
 */
const sendComplianceReminders = async (centerIds = null, options = {}) => {
  const { dryRun = false } = options;

  const overdueAssignments = await getOverdueAssignments(centerIds);
  const now = new Date();

  const today = new Date().toISOString().split('T')[0]; // "2025-11-12"

  const sendResults = await Promise.allSettled(
    overdueAssignments.map(async (assignment) => {
      // Get notification settings from ExerciseConfig (database config)
      const config = assignment.exerciseConfig || {};
      const notificationSettings = config.notificationSettings || {};

      // Use config from database, with fallback defaults
      const maxNotifications = notificationSettings.maxReminders ?? 3;
      const notificationEnabled = notificationSettings.enabled !== false;

      // Skip if notifications disabled for this config
      if (!notificationEnabled) {
        logger.debug(`Notification disabled for config ${config.id}`);
        return { skipped: true, reason: 'disabled' };
      }

      // ANTI-SPAM CHECK: Already sent compliance reminder for this assignment today?
      const existingNotification = await Notification.findOne({
        where: {
          receiverId: assignment.patient.userId,
          category: 'exercise',
          referenceId: assignment.id.toString(),
          sent: true,
          sentAt: {
            [Op.gte]: new Date(`${today} 00:00:00`),
            [Op.lt]: new Date(`${today} 23:59:59`),
          },
        },
      });

      if (existingNotification) {
        logger.info(`Already sent compliance reminder today, skipping`, {
          assignmentId: assignment.id,
          patientId: assignment.patient.id,
          sentAt: existingNotification.sentAt,
        });
        return { skipped: true, reason: 'already_sent' };
      }

      // Check max notification count
      if (assignment.notificationCount >= maxNotifications) {
        logger.debug(`Max notifications reached for assignment ${assignment.id}`);
        return { skipped: true, reason: 'max_reached' };
      }

      if (!dryRun) {
        // Send notification
        await exerciseNotificationService.sendComplianceReminder({
          assignment,
          patient: assignment.patient,
          exerciseConfig: assignment.exerciseConfig,
          assignedBy: assignment.assignedByUser,
        });

        // Update notification tracking
        await assignment.update({
          lastNotificationAt: now,
          notificationCount: assignment.notificationCount + 1,
          complianceStatus: 'overdue',
        });
      }

      logger.info(`Compliance reminder sent for assignment ${assignment.id}`, {
        configId: config.id,
        maxNotifications,
      });
      return { sent: true };
    })
  );

  const successResults = sendResults.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const sentCount = successResults.filter((r) => r.sent).length;
  const skippedCount = successResults.filter((r) => r.skipped).length;

  return {
    sent: sentCount,
    skipped: skippedCount,
    errors: sendResults
      .filter((r) => r.status === 'rejected')
      .map((r) => ({
        assignmentId: r.reason?.assignmentId || 'unknown',
        error: r.reason?.message || 'Unknown error',
      })),
  };
};

/**
 * Get compliance summary for dashboard
 */
const getComplianceSummary = async (centerIds = null, dateRange = null) => {
  const whereClause = {
    status: ['active', 'completed'],
  };

  if (centerIds) {
    whereClause.centerId = Array.isArray(centerIds) ? { [Op.in]: centerIds } : centerIds;
  }

  if (dateRange) {
    if (dateRange.startDate) {
      whereClause.assignedAt = { [Op.gte]: new Date(dateRange.startDate) };
    }
    if (dateRange.endDate) {
      whereClause.assignedAt = {
        ...whereClause.assignedAt,
        [Op.lte]: new Date(dateRange.endDate),
      };
    }
  }

  const [totalAssignments, onTrackCount, overdueCount, pausedCount, completedCount] = await Promise.all([
    ExerciseAssignment.count({ where: whereClause }),
    ExerciseAssignment.count({ where: { ...whereClause, complianceStatus: 'on_track' } }),
    ExerciseAssignment.count({ where: { ...whereClause, complianceStatus: 'overdue' } }),
    ExerciseAssignment.count({ where: { ...whereClause, complianceStatus: 'paused' } }),
    ExerciseAssignment.count({ where: { ...whereClause, complianceStatus: 'completed' } }),
  ]);

  return {
    totalAssignments,
    complianceBreakdown: {
      onTrack: onTrackCount,
      overdue: overdueCount,
      paused: pausedCount,
      completed: completedCount,
    },
    complianceRate: totalAssignments > 0 ? (((onTrackCount + completedCount) / totalAssignments) * 100).toFixed(2) : 0,
  };
};

/**
 * Pause assignment and update compliance
 */
const pauseAssignment = async (assignmentId, pauseData = {}) => {
  const assignment = await ExerciseAssignment.findByPk(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao không tồn tại');
  }

  const previousStatus = assignment.status;

  await assignment.update({
    status: 'paused',
    complianceStatus: 'paused',
    notes: pauseData.reason || assignment.notes,
    nextDueDate: null, // Clear due date while paused
  });

  await auditLogService.logEntityAuditEvent({
    action: 'exerciseAssignment.pause',
    entityType: 'exerciseAssignment',
    entityId: assignment.id,
    centerId: assignment.centerId,
    actorUserId: pauseData.updatedBy || null,
    metadata: {
      patientId: assignment.patientId,
      exerciseConfigId: assignment.exerciseConfigId,
      previousStatus,
      nextStatus: assignment.status,
      reason: pauseData.reason || null,
    },
  });

  return assignment;
};

/**
 * Resume paused assignment
 */
const resumeAssignment = async (assignmentId, resumeData = {}) => {
  const assignment = await ExerciseAssignment.findByPk(assignmentId, {
    include: [
      {
        model: ExerciseConfig,
        as: 'exerciseConfig',
      },
    ],
  });

  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao không tồn tại');
  }

  const previousStatus = assignment.status;
  const config = assignment.exerciseConfig;
  let nextDueDate = null;

  if (config && config.frequency) {
    nextDueDate = calculateNextDueDate(config.frequency, assignment.lastSessionAt);
  }

  await assignment.update({
    status: 'active',
    complianceStatus: 'on_track',
    nextDueDate,
    notificationCount: 0, // Reset notification count when resuming
  });

  await auditLogService.logEntityAuditEvent({
    action: 'exerciseAssignment.resume',
    entityType: 'exerciseAssignment',
    entityId: assignment.id,
    centerId: assignment.centerId,
    actorUserId: resumeData.updatedBy || null,
    metadata: {
      patientId: assignment.patientId,
      exerciseConfigId: assignment.exerciseConfigId,
      previousStatus,
      nextStatus: assignment.status,
      nextDueDate,
    },
  });

  return assignment;
};

module.exports = {
  calculateNextDueDate,
  updateComplianceStatus,
  recordSessionCompletion,
  getOverdueAssignments,
  updateAllComplianceStatuses,
  sendComplianceReminders,
  getComplianceSummary,
  pauseAssignment,
  resumeAssignment,
};
