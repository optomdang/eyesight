const {
  examSchedulerService,
  examNotificationService,
  exerciseSchedulerService,
  exerciseNotificationService,
  exerciseComplianceService,
} = require('..');
const auditLogService = require('./auditLog.service');
const { executeAndLogJob } = require('./scheduleHistory.service');

const JOBS = {
  'exam.createSessions': {
    description: 'Create due ExamSession records (pre-created sessions pattern)',
    run: () => examSchedulerService.createScheduledExamSessions(),
  },
  'exam.sendReminders': {
    description: 'Send exam reminder notifications for today (sessions-based)',
    run: () => examNotificationService.sendExamReminders(),
  },
  'exercise.createSessions': {
    description: 'Create due ExerciseSession records (pre-created sessions pattern)',
    run: () => exerciseSchedulerService.createScheduledSessions(),
  },
  'exercise.processNotifications': {
    description: 'Process scheduled exercise notifications (due Notification records)',
    run: () => exerciseNotificationService.processScheduledExerciseNotifications(),
  },
  'exercise.compliance.updateStatuses': {
    description: 'Recalculate complianceStatus/nextDueDate for active assignments',
    run: () => exerciseComplianceService.updateAllComplianceStatuses(),
  },
  'exercise.compliance.sendReminders': {
    description: 'Send compliance reminders for overdue assignments (anti-spam protected)',
    run: () => exerciseComplianceService.sendComplianceReminders(null, { dryRun: false }),
  },
};

const listJobs = () => Object.entries(JOBS).map(([code, meta]) => ({ code, description: meta.description }));

const runJobs = async (jobCode, { user = null, centerId = null, requestContext = {} } = {}) => {
  const requestedCodes = jobCode && jobCode !== 'all' ? [jobCode] : Object.keys(JOBS);

  // Run each job with executeAndLogJob wrapper
  const settled = await Promise.all(
    requestedCodes.map(async (code) => {
      const job = JOBS[code];
      if (!job) {
        return { code, ok: false, error: 'Unknown jobCode' };
      }

      try {
        const result = await executeAndLogJob(code, job.run, { triggeredBy: 'manual' });
        return { code, ok: true, data: result.result };
      } catch (error) {
        return {
          code,
          ok: false,
          error: error && error.message ? error.message : 'Job failed',
        };
      }
    })
  );

  const result = {
    jobCode: jobCode || 'all',
    ranAt: new Date().toISOString(),
    results: settled,
  };

  await auditLogService.logEntityAuditEvent({
    user,
    requestContext,
    action: 'system.job.run',
    entityType: 'job',
    entityId: jobCode || 'all',
    centerId,
    metadata: {
      jobCode: jobCode || 'all',
      requestedCodes,
      successCount: settled.filter((entry) => entry.ok).length,
      failedCount: settled.filter((entry) => !entry.ok).length,
    },
  });

  return result;
};

const getScheduleHistory = async (filter = {}, options = {}) => {
  const { buildPagination, sanitizePagination, buildSortBy } = require('../../utils/query');
  const { limit, page, offset } = sanitizePagination(options.limit || 50, options.page, 100);
  const order = buildSortBy(options.sortBy || 'ranAt:DESC', ['ranAt', 'status', 'jobCode']);

  const where = {};
  if (filter.jobCode) where.jobCode = filter.jobCode;
  if (filter.status) where.status = filter.status;
  if (filter.userId) where.userId = filter.userId;
  if (filter.triggeredBy) where.triggeredBy = filter.triggeredBy;

  const ScheduleHistory = require('../../models/system/scheduleHistory.model');
  const { rows, count } = await ScheduleHistory.findAndCountAll({
    where,
    limit,
    offset,
    order,
    include: filter.includeUser
      ? [
          {
            model: require('../../models/authentication/user.model'),
            as: 'user',
            attributes: ['id', 'email', 'name'],
          },
        ]
      : [],
  });

  return {
    rows,
    ...buildPagination(count, limit, page),
  };
};

module.exports = { listJobs, runJobs, getScheduleHistory };
