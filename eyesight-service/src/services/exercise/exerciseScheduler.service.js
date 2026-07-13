/**
 * Exercise Scheduler Service
 * Automated compliance checking, session creation, and reminder notifications
 */

const cron = require('node-cron');
const logger = require('../../config/logger');
const { exerciseComplianceService } = require('../index');
const { ExerciseAssignment, ExerciseSession, Patient } = require('../../models');
const { generateCode, getCurrentCycleDateRange } = require('../../utils/common');
const { promiseAllInBatches } = require('../../utils/promiseUtils');
const { buildInTreatmentWhereClause } = require('../../utils/treatmentUtils');
const { executeAndLogJob } = require('../system/scheduleHistory.service');
const { closeStaleIncompleteResults } = require('./exerciseStaleResult.service');
const { syncSessionSnapshotFromAssignment } = require('./assignmentSessionSync.service');

/**
 * Close incomplete results that crossed the day boundary - runs daily at 00:05
 * Business rule: a paused result that crosses midnight is auto-closed with its saved metrics
 * (treated the same as pressing "Kết thúc").
 */
const scheduleStaleResultCleanup = () => {
  cron.schedule('5 0 * * *', async () => {
    await executeAndLogJob('exercise.staleResult.autoClose', async () => {
      logger.info('Starting stale incomplete result auto-close job');
      const result = await closeStaleIncompleteResults();
      logger.info('Stale result cleanup finished', result);
      return result;
    });
  });

  logger.info('Stale result cleanup scheduler started - runs daily at 00:05');
};

/**
 * Check compliance and send reminders - runs every hour
 * Notification settings are loaded per-config from ExerciseConfig.notificationSettings
 */
const scheduleComplianceCheck = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    await executeAndLogJob('exercise.compliance.updateStatuses', async () => {
      logger.info('Starting scheduled compliance check');

      // Update all compliance statuses
      const updateResults = await exerciseComplianceService.updateAllComplianceStatuses();
      logger.info('Compliance status update completed', {
        updated: updateResults.updated,
        overdue: updateResults.overdue,
        onTrack: updateResults.onTrack,
        errors: updateResults.errors.length,
      });

      // Send reminders for overdue assignments
      const reminderResults = await exerciseComplianceService.sendComplianceReminders(null, {
        dryRun: false,
      });

      logger.info('Compliance reminders sent', {
        sent: reminderResults.sent,
        skipped: reminderResults.skipped,
        errors: reminderResults.errors.length,
      });

      return { updateResults, reminderResults };
    });
  });

  logger.info('Compliance scheduler started - checking every hour');
};

/**
 * Daily compliance summary - runs at 11 PM local time (end of day)
 * Generates end-of-day summary reports
 */
const scheduleDailyComplianceSummary = () => {
  // Run every day at 23:00 local time
  cron.schedule('0 23 * * *', async () => {
    try {
      logger.info('Generating daily compliance summary');

      const summary = await exerciseComplianceService.getComplianceSummary();
      const overdueAssignments = await exerciseComplianceService.getOverdueAssignments();

      logger.info('Daily compliance summary', {
        totalAssignments: summary.totalAssignments,
        complianceRate: summary.complianceRate,
        overdueCount: overdueAssignments.length,
        breakdown: summary.complianceBreakdown,
      });
    } catch (error) {
      logger.error('Failed to generate daily compliance summary', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  logger.info('Daily compliance summary scheduler started - runs at 8:00 AM');
};

/**
 * Critical overdue alerts - runs every 4 hours
 */
const scheduleCriticalOverdueAlerts = () => {
  // Run every 4 hours at minute 0
  cron.schedule('0 */4 * * *', async () => {
    try {
      logger.info('Checking for critical overdue assignments');

      const overdueAssignments = await exerciseComplianceService.getOverdueAssignments();

      // Find critically overdue assignments (7+ days overdue)
      const criticalOverdue = overdueAssignments.filter((assignment) => {
        const daysPastDue = assignment.nextDueDate
          ? Math.ceil((new Date() - new Date(assignment.nextDueDate)) / (1000 * 60 * 60 * 24))
          : 0;
        return daysPastDue >= 7;
      });

      if (criticalOverdue.length > 0) {
        logger.warn('Critical overdue assignments found', {
          count: criticalOverdue.length,
          assignments: criticalOverdue.map((a) => ({
            id: a.id,
            patientId: a.patientId,
            daysPastDue: Math.ceil((new Date() - new Date(a.nextDueDate)) / (1000 * 60 * 60 * 24)),
          })),
        });
      }
    } catch (error) {
      logger.error('Failed to check critical overdue assignments', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  logger.info('Critical overdue alerts scheduler started - checking every 4 hours');
};

/**
 * Create sessions for all active assignments
 */
const createScheduledSessions = async () => {
  try {
    logger.info('Starting scheduled session creation...');

    const activeAssignments = await ExerciseAssignment.findAll({
      where: {
        status: 'active',
      },
      include: [
        'exerciseConfig',
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
      ],
    });

    const sessionCounts = await promiseAllInBatches(
      activeAssignments,
      (assignment) => createSessionsForAssignment(assignment),
      10
    );
    const createdCount = sessionCounts.reduce((sum, count) => sum + count, 0);

    logger.info(`Created ${createdCount} new sessions for ${activeAssignments.length} assignments`);
    return { createdCount, assignmentCount: activeAssignments.length };
  } catch (error) {
    logger.error('Error creating scheduled sessions:', error);
    throw error;
  }
};

/**
 * Create a session for specific date if it doesn't exist
 */
const createSessionIfNotExists = async (assignment, sessionDate) => {
  try {
    // Create-or-skip (idempotent). Requires unique constraint on (exerciseAssignmentId, startedAt)
    const sessionCode = generateCode('SS');
    const [session, created] = await ExerciseSession.findOrCreate({
      where: {
        exerciseAssignmentId: assignment.id,
        startedAt: sessionDate,
      },
      defaults: {
        code: sessionCode,
        patientId: assignment.patientId,
        status: 'incomplete',
        centerId: assignment.centerId,
        createdBy: assignment.assignedBy,
        // Snapshot "số giao" lúc tạo buổi (P2 — khóa lịch sử, không đổi khi config sửa sau)
        executionCount: assignment.exerciseConfig?.executionCount ?? null,
        executionDuration: assignment.exerciseConfig?.duration ?? null,
      },
    });

    if (!created) {
      await syncSessionSnapshotFromAssignment(session, assignment);
      return false;
    }

    logger.info(`Created session for assignment ${assignment.id} on ${sessionDate.toDateString()}`);
    return true;
  } catch (error) {
    logger.error(`Error creating session for assignment ${assignment.id}:`, error);
    return false;
  }
};

/**
 * Schedule session creation - runs daily at midnight local time
 * Creates sessions with local timezone for consistent frontend display
 */
const scheduleSessionCreation = () => {
  // Run at 00:00 local time (server timezone UTC+7)
  cron.schedule('0 0 * * *', async () => {
    await executeAndLogJob('exercise.createSessions', async () => {
      logger.info('Starting daily session creation at midnight local time...');
      const result = await createScheduledSessions();
      logger.info('Daily session creation completed', result);
      return result;
    });
  });

  logger.info('Session creation scheduler started - runs daily at midnight (0:00)');
};

/**
 * Create daily sessions for today only
 */
const createDailySessions = async (assignment, startDate) => {
  let sessionsCreated = 0;

  // Only create 1 session for today
  const sessionCreated = await createSessionIfNotExists(assignment, startDate);
  if (sessionCreated) sessionsCreated += 1;

  return sessionsCreated;
};

/**
 * Create weekly sessions for this week only
 */
const createWeeklySessions = async (assignment, startDate) => {
  let sessionsCreated = 0;

  // Only create 1 session for this week
  const sessionCreated = await createSessionIfNotExists(assignment, startDate);
  if (sessionCreated) sessionsCreated += 1;

  return sessionsCreated;
};

/**
 * Create monthly sessions for this month only
 */
const createMonthlySessions = async (assignment, startDate) => {
  let sessionsCreated = 0;
  // Only create 1 session for this month
  const sessionCreated = await createSessionIfNotExists(assignment, startDate);
  if (sessionCreated) sessionsCreated += 1;

  return sessionsCreated;
};

/**
 * Create sessions for a specific assignment based on its frequency
 */
const createSessionsForAssignment = async (assignment) => {
  const { exerciseConfig } = assignment;
  const frequency = exerciseConfig?.frequency;

  if (!frequency) {
    logger.warn(`Assignment ${assignment.id} has no frequency config`);
    return 0;
  }

  let sessionsCreated = 0;
  const { start: cycleStart } = getCurrentCycleDateRange(frequency, new Date());

  switch (frequency) {
    case 'daily':
      sessionsCreated = await createDailySessions(assignment, cycleStart);
      break;
    case 'weekly':
      sessionsCreated = await createWeeklySessions(assignment, cycleStart);
      break;
    case 'monthly':
      sessionsCreated = await createMonthlySessions(assignment, cycleStart);
      break;
    default:
      logger.warn(`Unknown frequency: ${frequency} for assignment ${assignment.id}`);
  }

  return sessionsCreated;
};

/**
 * Start all exercise schedulers
 */
const startExerciseSchedulers = () => {
  // Compliance schedulers
  scheduleComplianceCheck();
  scheduleDailyComplianceSummary();
  scheduleCriticalOverdueAlerts();

  // Session creation scheduler
  scheduleSessionCreation();

  // Stale result cleanup - auto-close day-crossing paused results
  scheduleStaleResultCleanup();

  logger.info('All exercise schedulers started successfully');
};

module.exports = {
  scheduleComplianceCheck,
  scheduleDailyComplianceSummary,
  scheduleCriticalOverdueAlerts,
  scheduleSessionCreation,
  scheduleStaleResultCleanup,
  startExerciseSchedulers,
  createScheduledSessions,
  createSessionsForAssignment,
};
