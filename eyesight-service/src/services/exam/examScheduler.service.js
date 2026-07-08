/**
 * Exam Scheduler Service
 * Auto-creates ExamSession records daily (MATCHING Exercise pattern)
 * This enables simplified notification logic: query sessions instead of complex calculations
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../../config/logger');
const { ExamAssignment, ExamSession, Patient } = require('../../models');
const { generateCode, getCurrentCycleDateRange } = require('../../utils/common');
const { promiseAllInBatches } = require('../../utils/promiseUtils');
const { buildInTreatmentWhereClause } = require('../../utils/treatmentUtils');
const { executeAndLogJob } = require('../system/scheduleHistory.service');

/**
 * Create ExamSession for a specific date if it doesn't exist
 * MATCHING Exercise pattern: createSessionIfNotExists
 */
const createSessionIfNotExists = async (config, sessionDate) => {
  try {
    // Derive cycle boundaries from the assignment's frequency.
    // Using the cycle range (not an exact date) makes this function idempotent regardless
    // of whether it is called by the nightly cron (with cycleStart) or by provisionExamSession
    // (with new Date()). Both reference points resolve to the same cycle boundaries.
    const { start: cycleStart, end: cycleEnd } = getCurrentCycleDateRange(config.frequency, sessionDate);

    // Check if a session already exists anywhere within the current cycle.
    // This prevents duplicate sessions that would otherwise be created when
    // provisionExamSession (called with new Date()) runs after the cron already
    // created a session at cycleStart.
    const existingSession = await ExamSession.findOne({
      where: {
        patientId: config.patientId,
        examType: config.examType,
        scheduledDate: {
          [Op.gte]: cycleStart,
          [Op.lte]: cycleEnd,
        },
        deleted: false,
      },
    });

    if (existingSession) {
      return false; // Session already exists for this cycle
    }

    // Always create with cycleStart so every session has a canonical, predictable date.
    const sessionCode = generateCode('ES'); // ES = Exam Session

    try {
      await ExamSession.create({
        code: sessionCode,
        patientId: config.patientId,
        examType: config.examType,
        scheduledDate: cycleStart,
        status: 'incomplete',
        centerId: config.centerId,
        createdBy: 1, // SYSTEM user
      });

      const { recalculatePatientComplianceByType } = require('../clinic/compliance.service');
      await recalculatePatientComplianceByType(config.patientId, config.examType);
    } catch (error) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        return false;
      }
      throw error;
    }

    logger.info(`Created exam session`, {
      patientId: config.patientId,
      examType: config.examType,
      scheduledDate: cycleStart.toISOString(),
    });

    return true;
  } catch (error) {
    logger.error(`Error creating exam session for patient ${config.patientId}:`, error);
    return false;
  }
};

/**
 * Create sessions for an ExamAssignment config based on frequency
 * MATCHING Exercise pattern: createSessionsForAssignment
 */
const createSessionsForConfig = async (config) => {
  try {
    // Calendar-cycle scheduling: create at start of current cycle (day/week/month/quarter/year)
    const { start: cycleStart } = getCurrentCycleDateRange(config.frequency, new Date());
    const created = await createSessionIfNotExists(config, cycleStart);
    return created ? 1 : 0;
  } catch (error) {
    logger.error(`Error creating sessions for config ${config.id}:`, error);
    return 0;
  }
};

/**
 * Create exam sessions for all enabled ExamAssignment configurations
 * MATCHING Exercise pattern: createScheduledSessions
 */
const createScheduledExamSessions = async () => {
  try {
    logger.info('Starting scheduled exam session creation...');

    // Get all enabled exam configurations
    const configs = await ExamAssignment.findAll({
      where: { isEnabled: true },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'code'],
          required: true,
          where: {
            deleted: false,
            ...buildInTreatmentWhereClause(),
          },
        },
      ],
    });

    logger.info(`Found ${configs.length} enabled exam configurations`);

    // Process in batches to avoid overwhelming connection pool
    const sessionCounts = await promiseAllInBatches(configs, (config) => createSessionsForConfig(config), 10);
    const createdCount = sessionCounts.reduce((sum, count) => sum + count, 0);

    logger.info(`Created ${createdCount} new exam sessions for ${configs.length} configurations`);
    return { createdCount, configCount: configs.length };
  } catch (error) {
    logger.error('Error in createScheduledExamSessions:', error);
    throw error;
  }
};

/**
 * Start exam session scheduler - runs daily at midnight local time
 * Matches Exercise scheduler for consistent session creation
 */
const startExamScheduler = () => {
  // Run daily at 00:00 local time (server timezone UTC+7)
  cron.schedule('0 0 * * *', async () => {
    await executeAndLogJob('exam.createSessions', async () => {
      logger.info('Running scheduled exam session creation at midnight local time...');
      return await createScheduledExamSessions();
    });
  });

  logger.info('Exam scheduler started - runs daily at 00:00 local time');
};

module.exports = {
  createSessionIfNotExists,
  createSessionsForConfig,
  createScheduledExamSessions,
  startExamScheduler,
};
