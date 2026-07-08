/**
 * Session Provisioning Utilities
 * Shared logic for auto-creating exam/exercise sessions when assignments are created
 * or when patient status transitions to active (resume, activate, extend)
 */

const { Op } = require('sequelize');
const logger = require('../config/logger');
const { Patient, ExamAssignment, ExerciseAssignment, ExamSession, ExerciseSession } = require('../models');
const { isInTreatmentWindow } = require('./treatmentUtils');

/**
 * Check if patient is eligible for session provisioning
 * Returns true if patient is currently in treatment window
 * @param {number} patientId
 * @returns {Promise<boolean>}
 */
const shouldProvisionForPatient = async (patientId) => {
  const patient = await Patient.findByPk(patientId, {
    attributes: ['id', 'treatmentStatus', 'activeFrom', 'activeTo', 'deleted'],
  });

  if (!patient || patient.deleted) {
    return false;
  }

  return isInTreatmentWindow(patient, new Date());
};

/**
 * Check if patient already has sessions created for today
 * Used to prevent duplicate session creation
 * @param {number} patientId
 * @returns {Promise<boolean>}
 */
const hasSessionsToday = async (patientId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const examWhere = {
    patientId,
    scheduledDate: { [Op.gte]: today, [Op.lt]: tomorrow },
  };

  if (ExamSession.rawAttributes?.deleted) {
    examWhere.deleted = false;
  }

  const exerciseWhere = {
    patientId,
    startedAt: { [Op.gte]: today, [Op.lt]: tomorrow },
  };

  if (ExerciseSession.rawAttributes?.deleted) {
    exerciseWhere.deleted = false;
  }

  const [examCount, exerciseCount] = await Promise.all([
    ExamSession.count({ where: examWhere }),
    ExerciseSession.count({ where: exerciseWhere }),
  ]);

  return examCount > 0 || exerciseCount > 0;
};

/**
 * Provision a single exam session for a config
 * @param {Object} examConfig - ExamAssignment instance
 * @returns {Promise<boolean>} - True if session created, false if skipped
 */
const provisionExamSession = async (examConfig) => {
  try {
    // Dynamically import to avoid circular dependency
    const examSchedulerService = require('../services/exam/examScheduler.service');

    const created = await examSchedulerService.createSessionIfNotExists(examConfig, new Date());

    if (created) {
      logger.info(`Auto-provisioned exam session`, {
        patientId: examConfig.patientId,
        examType: examConfig.examType,
        configId: examConfig.id,
      });
    }

    return created;
  } catch (error) {
    logger.error(`Failed to provision exam session`, {
      error: error.message,
      patientId: examConfig.patientId,
      configId: examConfig.id,
    });
    // Don't throw - provisioning failure shouldn't fail assignment creation
    return false;
  }
};

/**
 * Provision exercise sessions for an assignment
 * @param {Object} assignment - ExerciseAssignment instance
 * @returns {Promise<number>} - Number of sessions created
 */
const provisionExerciseSessions = async (assignment) => {
  try {
    // Dynamically import to avoid circular dependency
    const exerciseSchedulerService = require('../services/exercise/exerciseScheduler.service');

    const created = await exerciseSchedulerService.createSessionsForAssignment(assignment);

    if (created > 0) {
      logger.info(`Auto-provisioned exercise sessions`, {
        patientId: assignment.patientId,
        assignmentId: assignment.id,
        sessionsCreated: created,
      });
    }

    return created;
  } catch (error) {
    logger.error(`Failed to provision exercise sessions`, {
      error: error.message,
      patientId: assignment.patientId,
      assignmentId: assignment.id,
    });
    // Don't throw - provisioning failure shouldn't fail assignment creation
    return 0;
  }
};

/**
 * Provision all sessions for a patient's existing assignments
 * Used when patient status transitions from inactive to active
 * @param {number} patientId
 * @returns {Promise<{examSessions: number, exerciseSessions: number}>}
 */
const provisionAllSessionsForPatient = async (patientId) => {
  try {
    // Get all active assignments
    const [examConfigs, exerciseAssignments] = await Promise.all([
      ExamAssignment.findAll({
        where: { patientId, isEnabled: true },
      }),
      ExerciseAssignment.findAll({
        where: { patientId, status: 'active' },
        include: ['exerciseConfig'],
      }),
    ]);

    if (examConfigs.length === 0 && exerciseAssignments.length === 0) {
      logger.info(`Patient ${patientId} has no active assignments, skipping provision`);
      return { examSessions: 0, exerciseSessions: 0 };
    }

    logger.info(`Provisioning sessions for patient ${patientId}`, {
      examConfigs: examConfigs.length,
      exerciseAssignments: exerciseAssignments.length,
    });

    // Provision sessions for all assignments in parallel
    // provisionExamSession and provisionExerciseSessions already handle duplicates internally
    const [examResults, exerciseResults] = await Promise.all([
      Promise.all(examConfigs.map((config) => provisionExamSession(config))),
      Promise.all(exerciseAssignments.map((assignment) => provisionExerciseSessions(assignment))),
    ]);

    const examSessionsCreated = examResults.filter(Boolean).length;
    const exerciseSessionsCreated = exerciseResults.reduce((sum, count) => sum + count, 0);

    logger.info(`Provisioned sessions for patient after status change`, {
      patientId,
      examSessionsCreated,
      exerciseSessionsCreated,
    });

    return {
      examSessions: examSessionsCreated,
      exerciseSessions: exerciseSessionsCreated,
    };
  } catch (error) {
    logger.error(`Failed to provision sessions for patient`, {
      error: error.message,
      stack: error.stack,
      patientId,
    });
    // Don't throw - patient update should succeed even if provisioning fails
    return { examSessions: 0, exerciseSessions: 0 };
  }
};

module.exports = {
  shouldProvisionForPatient,
  hasSessionsToday,
  provisionExamSession,
  provisionExerciseSessions,
  provisionAllSessionsForPatient,
};
