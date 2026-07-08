const { Op } = require('sequelize');
const cron = require('node-cron');
const moment = require('moment');
const { ExamAssignment, Patient, ExamSession, Notification } = require('../../models');
const { notificationTemplateService, emailService, zaloService } = require('../index');
const logger = require('../../config/logger');
const { User, Center } = require('../../models');
const { buildInTreatmentWhereClause } = require('../../utils/treatmentUtils');
const { executeAndLogJob } = require('../system/scheduleHistory.service');

// Frequency translation mapping
const frequencyNames = {
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
  yearly: 'Hàng năm',
};

/**
 * Get exam sessions due for notifications today
 * SIMPLIFIED: Just query ExamSession instead of complex calculations
 * @param {number|Array} centerId - Center ID(s) to filter by (optional)
 * @param {string} examType - Exam type to filter by (optional)
 */
const getExamSessionsDueForNotification = async (centerId, examType) => {
  const today = moment().startOf('day').toDate();
  const tomorrow = moment().add(1, 'day').startOf('day').toDate();

  // Build where clause
  const whereSession = {
    status: 'incomplete',
    scheduledDate: {
      [Op.gte]: today,
      [Op.lt]: tomorrow,
    },
  };

  if (centerId) {
    if (Array.isArray(centerId)) {
      whereSession.centerId = { [Op.in]: centerId.filter((id) => typeof id === 'number' && !Number.isNaN(id)) };
    } else if (typeof centerId === 'number' && !Number.isNaN(centerId)) {
      whereSession.centerId = centerId;
    }
  }

  if (examType) {
    whereSession.examType = examType;
  }

  try {
    // SIMPLE QUERY: Get sessions scheduled for today
    const sessions = await ExamSession.findAll({
      where: whereSession,
      include: [
        {
          model: Patient,
          as: 'patient',
          required: true,
          attributes: ['id', 'code', 'userId', 'centerId', 'doctorId', 'treatmentStatus', 'activeFrom', 'activeTo'],
          where: {
            deleted: false,
            ...buildInTreatmentWhereClause(new Date()),
          },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phoneNumber', 'zaloUserId'],
            },
            {
              model: Center,
              as: 'center',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    // Get ExamAssignment configs for notification settings
    // Use Promise.all to avoid sequential DB queries holding connections
    const patientIds = sessions.map((s) => s.patientId);
    const examTypes = [...new Set(sessions.map((s) => s.examType))];

    // Fetch all configs in one query
    const allConfigs = await ExamAssignment.findAll({
      where: {
        patientId: { [Op.in]: patientIds },
        examType: { [Op.in]: examTypes },
        isEnabled: true,
      },
    });

    // Build lookup map for fast access
    const configMap = new Map();
    allConfigs.forEach((config) => {
      const key = `${config.patientId}_${config.examType}`;
      configMap.set(key, config);
    });

    // Map sessions to configs
    const sessionsWithConfig = sessions
      .map((session) => {
        const key = `${session.patientId}_${session.examType}`;
        const config = configMap.get(key);

        if (config && config.notificationSettings?.enabled) {
          return {
            session,
            patient: session.patient,
            config,
            notificationSettings: config.notificationSettings,
          };
        }
        return null;
      })
      .filter(Boolean);

    return sessionsWithConfig;
  } catch (error) {
    logger.error('Error in getExamSessionsDueForNotification:', error);
    throw error;
  }
};

/**
 * Send exam reminder notifications using templates
 * WITH ANTI-SPAM: Check Notifications table before sending
 */
const sendExamReminders = async (centerId, examType, dryRun = false) => {
  const sessionsDue = await getExamSessionsDueForNotification(centerId, examType);
  const today = new Date().toISOString().split('T')[0]; // "2025-11-12"

  const examTypeNames = {
    far: 'Far Vision',
    near: 'Near Vision',
    contrast: 'Contrast Sensitivity',
    stereopsis: 'Stereopsis',
  };

  const results = [];
  for (const item of sessionsDue) {
    const { session, patient, notificationSettings } = item;

    // ANTI-SPAM CHECK: Already sent notification for this session today?
    // eslint-disable-next-line no-await-in-loop
    const existingNotification = await Notification.findOne({
      where: {
        receiverId: patient.userId,
        category: 'exam',
        referenceId: session.id.toString(),
        sent: true,
        sentAt: {
          [Op.gte]: new Date(`${today} 00:00:00`),
          [Op.lt]: new Date(`${today} 23:59:59`),
        },
      },
    });

    if (existingNotification) {
      logger.info(`Already sent notification for exam session, skipping`, {
        sessionId: session.id,
        patientId: patient.id,
        examType: session.examType,
        sentAt: existingNotification.sentAt,
      });
      return { skipped: true };
    }

    // Prepare template variables
    const templateVariables = {
      patientName: patient.user?.name || '',
      patientCode: patient.code || '',
      doctorName: patient.doctor?.user?.name || '',
      centerName: patient.center?.name || '',
      examType: examTypeNames[session.examType] || session.examType,
      examDate: new Date(session.scheduledDate).toLocaleDateString('vi-VN'),
      frequency: frequencyNames[item.config?.frequency] || item.config?.frequency || '',
    };

    // Get template
    const templateId = notificationSettings?.templateId;
    if (!templateId) {
      logger.warn('No template configured for exam reminder', {
        sessionId: session.id,
        patientId: patient.id,
      });
      return { skipped: true };
    }

    // eslint-disable-next-line no-await-in-loop
    const template = await notificationTemplateService.getNotificationTemplateById(templateId);
    if (!template) {
      return { error: { sessionId: session.id, error: `Template not found: ${templateId}` } };
    }

    // Render template
    const rendered = template.renderTemplate(templateVariables);
    const methods = notificationSettings.methods || ['email'];

    // Send via each channel
    const methodResults = [];
    for (const method of methods) {
      try {
        if (!dryRun) {
          if (method === 'email' && patient.user?.email) {
            // eslint-disable-next-line no-await-in-loop
            await emailService.sendEmail(patient.user.email, rendered.subject, '', rendered.content);
          } else if (method === 'zalo' && patient.user?.zaloUserId) {
            // eslint-disable-next-line no-await-in-loop
            await zaloService.sendZaloText(patient.user.zaloUserId, rendered.content);
          }

          // LOG TO NOTIFICATIONS TABLE (ANTI-SPAM RECORD)
          // eslint-disable-next-line no-await-in-loop
          await Notification.create({
            code: `EXAM_REMINDER_${session.id}_${method}_${Date.now()}`,
            type: 'info',
            category: 'exam',
            title: `Exam Reminder - ${session.examType}`,
            message: rendered.content,
            senderId: 'SYSTEM',
            receiverId: patient.userId,
            referenceId: session.id.toString(), // ← SESSION ID (FK)
            channel: method,
            sent: true,
            sentAt: new Date(),
            centerId: patient.centerId,
          });

          logger.info(`Exam notification sent`, {
            sessionId: session.id,
            patientId: patient.id,
            examType: session.examType,
            method,
          });
          methodResults.push({ sent: true });
        } else {
          methodResults.push({ sent: false });
        }
      } catch (error) {
        logger.error(`Failed to send exam notification`, {
          error: error.message,
          sessionId: session.id,
          method,
        });
        methodResults.push({ error: { sessionId: session.id, method, error: error.message } });
      }
    }

    results.push({ methodResults });
  }

  const sentCount = results.flatMap((r) => r.methodResults || []).filter((mr) => mr.sent).length;
  const skippedCount = results.filter((r) => r.skipped).length;
  const allErrors = results
    .filter((r) => r.error)
    .map((r) => r.error)
    .concat(
      results
        .flatMap((r) => r.methodResults || [])
        .filter((mr) => mr.error)
        .map((mr) => mr.error)
    );

  return {
    totalSessions: sessionsDue.length,
    sent: sentCount,
    skipped: skippedCount,
    errors: allErrors.length > 0 ? allErrors : undefined,
  };
};

/**
 * Get notification preview for patient
 */
const getNotificationPreview = async (patientId, examType) => {
  // Get next scheduled exam session
  const session = await ExamSession.findOne({
    where: {
      patientId,
      examType,
      status: 'incomplete',
      scheduledDate: { [Op.gte]: new Date() },
    },
    order: [['scheduledDate', 'ASC']],
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'code', 'userId', 'centerId'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phoneNumber'],
          },
          {
            model: Center,
            as: 'center',
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
  });

  if (!session) {
    return null;
  }

  // Get config for notification settings
  const config = await ExamAssignment.findOne({
    where: { patientId, examType, isEnabled: true },
  });

  if (!config || !config.notificationSettings?.enabled) {
    return null;
  }

  const examTypeNames = {
    far: 'Far Vision',
    near: 'Near Vision',
    contrast: 'Contrast Sensitivity',
    stereopsis: 'Stereopsis',
  };

  // Build template variables
  const templateVariables = {
    patientName: session.patient?.user?.name || 'Valued Patient',
    patientCode: session.patient?.code || '',
    centerName: session.patient?.center?.name || '',
    examType: examTypeNames[examType] || examType,
    examDate: new Date(session.scheduledDate).toLocaleDateString('vi-VN'),
    frequency: frequencyNames[config?.frequency] || config?.frequency || '',
  };

  // Get template and render
  const templateId = config.notificationSettings?.templateId;
  let preview = null;

  if (templateId) {
    const template = await notificationTemplateService.getNotificationTemplateById(templateId);
    if (template) {
      preview = template.renderTemplate(templateVariables);
    }
  }

  return {
    patientId,
    examType,
    scheduledDate: session.scheduledDate,
    sessionId: session.id,
    notificationSettings: config.notificationSettings,
    preview,
  };
};

/**
 * Start notification scheduler - runs daily at 9 AM to check and send exam reminders
 * @param {Object} options - Scheduler options
 * @param {string} options.schedule - Cron schedule pattern (default: '0 9 * * *')
 * @param {boolean} options.runImmediately - Run once immediately (default: false)
 */
const startNotificationScheduler = (options = {}) => {
  const { schedule = '0 9 * * *', runImmediately = false } = options;

  // Notification task function
  const runNotificationTask = async () => {
    await executeAndLogJob('exam.sendReminders', async () => {
      logger.info('Starting exam notification check...');
      const results = await sendExamReminders();
      logger.info(`Exam notifications completed`, {
        totalSessions: results.totalSessions,
        sent: results.sent,
        skipped: results.skipped,
        errors: results.errors?.length || 0,
      });
      return results;
    });
  };

  // Run immediately if requested
  if (runImmediately) {
    logger.info('Running notification check immediately...');
    runNotificationTask();
  }

  // Set up scheduled task
  const schedulerTask = cron.schedule(schedule, runNotificationTask, {
    scheduled: false, // Don't start immediately
    timezone: 'Asia/Ho_Chi_Minh',
  });

  // Start the scheduler
  schedulerTask.start();
  logger.info(`Exam notification scheduler started - will run with schedule: ${schedule}`);

  return schedulerTask;
};

/**
 * Stop notification scheduler
 */
const stopNotificationScheduler = (schedulerTask) => {
  if (schedulerTask) {
    schedulerTask.stop();
    logger.info('Exam notification scheduler stopped');
  }
};

module.exports = {
  getExamSessionsDueForNotification,
  sendExamReminders,
  getNotificationPreview,
  startNotificationScheduler,
  stopNotificationScheduler,
};
