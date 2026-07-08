const moment = require('moment');
const cron = require('node-cron');
const { Op } = require('sequelize');
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const emailService = require('../email.service');
const zaloService = require('../zalo.service');
const { User, Patient, ExerciseConfig, Exercise } = require('../../models');
const { notificationService, notificationTemplateService } = require('..');
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
 * Schedule exercise reminder notification
 * @param {number} patientId - Patient ID
 * @param {number} exerciseConfigId - Exercise config ID
 * @param {Date} reminderTime - When to send reminder
 * @returns {Promise}
 */
const scheduleExerciseReminder = async (patientId, exerciseConfigId, reminderTime) => {
  try {
    // Get exercise config with notification settings
    const exerciseConfig = await ExerciseConfig.findByPk(exerciseConfigId, {
      include: [
        {
          model: Exercise,
          as: 'exercise',
          attributes: ['name', 'description'],
        },
      ],
    });

    if (!exerciseConfig) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Cấu hình bài tập không tồn tại');
    }

    // Check if notifications are enabled
    if (!exerciseConfig.notificationSettings || !exerciseConfig.notificationSettings.enabled) {
      return {
        success: false,
        message: 'Notifications are disabled for this exercise config',
      };
    }

    // Get patient information with user data
    const patient = await Patient.findByPk(patientId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['email', 'name', 'phoneNumber'],
        },
      ],
    });

    if (!patient || !patient.user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
    }

    // Create notification record (channel: 'web' để hiển thị trên portal bệnh nhân)
    await notificationService.createNotification({
      code: `EXERCISE_REMINDER_${exerciseConfigId}_${patientId}_${Date.now()}`,
      type: 'info',
      category: 'exercise',
      title: 'Nhắc nhở thực hiện bài tập',
      message: `Bạn có bài tập "${
        exerciseConfig.exercise ? exerciseConfig.exercise.name : 'Bài tập thị lực'
      }" cần thực hiện`,
      senderId: 'SYSTEM',
      receiverId: patient.userId,
      scheduledAt: reminderTime,
      channel: 'web',
      sent: false,
      centerId: patient.centerId,
    });

    logger.info('Exercise reminder scheduled', {
      patientId,
      exerciseConfigId,
      reminderTime,
    });

    return {
      success: true,
      message: 'Exercise reminder scheduled successfully',
      reminderTime,
    };
  } catch (error) {
    logger.error('Failed to schedule exercise reminder', {
      error: error.message,
      patientId,
      exerciseConfigId,
    });
    throw error;
  }
};

/**
 * Send compliance reminder for overdue assignment (using templates)
 * @param {Object} data - Reminder data
 * @param {Object} data.assignment - Exercise assignment
 * @param {Object} data.patient - Patient info
 * @param {Object} data.exerciseConfig - Exercise config
 * @param {Object} data.assignedBy - Doctor who assigned
 * @returns {Promise}
 */
const sendComplianceReminder = async ({ assignment, patient, exerciseConfig, assignedBy }) => {
  try {
    if (!(patient && patient.user)) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Dữ liệu người dùng bệnh nhân không tìm thấy');
    }

    const templateVariables = {
      patientName: patient.user.name,
      patientCode: patient.code || '',
      doctorName: assignedBy?.name || 'Bác sĩ',
      centerName: patient.center?.name || '',
      exerciseName: (exerciseConfig && exerciseConfig.exercise && exerciseConfig.exercise.name) || 'Bài tập thị lực',
      frequency:
        frequencyNames[exerciseConfig && exerciseConfig.frequency] ||
        (exerciseConfig && exerciseConfig.frequency) ||
        'Hàng ngày',
      sessionsCompleted: assignment.sessionsCompleted || 0,
      targetSessions: (exerciseConfig && exerciseConfig.executionCount) || 'không giới hạn',
      daysPastDue: assignment.nextDueDate
        ? Math.ceil((new Date() - new Date(assignment.nextDueDate)) / (1000 * 60 * 60 * 24))
        : 0,
      lastSessionAt: assignment.lastSessionAt ? moment(assignment.lastSessionAt).format('DD/MM/YYYY') : 'Chưa có',
    };

    const results = {
      email: null,
      zalo: null,
    };

    // Get template from config
    const templateId = exerciseConfig?.notificationSettings?.templateId;
    if (!templateId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Không có template được cấu hình cho thông báo tuân thủ bài tập');
    }

    const template = await notificationTemplateService.getNotificationTemplateById(templateId);
    if (!template) {
      throw new ApiError(httpStatus.NOT_FOUND, `Không tìm thấy template: ${templateId}`);
    }

    const validation = template.validateVariables(templateVariables);
    if (!validation.isValid) {
      logger.warn('Missing template variables for compliance reminder', {
        missingVariables: validation.missingVariables,
        assignmentId: assignment.id,
      });
      throw new ApiError(httpStatus.BAD_REQUEST, `Thiếu biến: ${validation.missingVariables.join(', ')}`);
    }

    const rendered = template.renderTemplate(templateVariables);

    // Send email
    if (patient.user.email) {
      try {
        await emailService.sendEmail(patient.user.email, rendered.subject, '', rendered.content);

        // LOG TO NOTIFICATIONS TABLE
        await notificationService.createNotification({
          code: `EXERCISE_COMPLIANCE_${assignment.id}_email_${Date.now()}`,
          type: 'warning',
          category: 'exercise',
          title: 'Exercise Compliance Reminder',
          message: rendered.content,
          senderId: 'SYSTEM',
          receiverId: patient.userId,
          referenceId: assignment.id.toString(), // ← ASSIGNMENT ID
          channel: 'email',
          sent: true,
          sentAt: new Date(),
          centerId: patient.centerId,
        });

        results.email = 'sent';
        logger.info('Compliance reminder email sent', {
          assignmentId: assignment.id,
          patientId: patient.id,
          email: patient.user.email,
        });
      } catch (error) {
        results.email = 'failed';
        logger.error('Failed to send compliance reminder email', {
          error: error.message,
          assignmentId: assignment.id,
        });
      }
    }

    // Send Zalo
    if (patient.zaloUserId) {
      try {
        await zaloService.sendZaloText(patient.zaloUserId, rendered.content);

        // LOG TO NOTIFICATIONS TABLE
        await notificationService.createNotification({
          code: `EXERCISE_COMPLIANCE_${assignment.id}_zalo_${Date.now()}`,
          type: 'warning',
          category: 'exercise',
          title: 'Exercise Compliance Reminder',
          message: rendered.content,
          senderId: 'SYSTEM',
          receiverId: patient.userId,
          referenceId: assignment.id.toString(), // ← ASSIGNMENT ID
          channel: 'zalo',
          sent: true,
          sentAt: new Date(),
          centerId: patient.centerId,
        });

        results.zalo = 'sent';
        logger.info('Compliance reminder Zalo sent', {
          assignmentId: assignment.id,
          patientId: patient.id,
          zaloUserId: patient.zaloUserId,
        });
      } catch (error) {
        results.zalo = 'failed';
        logger.error('Failed to send compliance reminder Zalo', {
          error: error.message,
          assignmentId: assignment.id,
        });
      }
    }

    return results;
  } catch (error) {
    logger.error('Failed to send compliance reminder', {
      error: error.message,
      assignmentId: assignment?.id,
    });
    throw error;
  }
};

/**
 * Send exercise reminder notification (using templates)
 * @param {Object} notificationData - Notification data
 * @param {Object} exerciseConfig - Exercise configuration
 * @returns {Promise}
 */
const sendExerciseReminder = async (notificationData, exerciseConfig) => {
  try {
    const { receiverId } = notificationData;

    // Get patient with user data
    const patient = await Patient.findOne({
      where: { userId: receiverId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['email', 'name', 'phoneNumber'],
        },
      ],
    });

    if (!patient || !patient.user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
    }

    const templateVariables = {
      patientName: patient.user.name,
      patientCode: patient.code || '',
      doctorName: patient.doctor?.user?.name || '',
      centerName: patient.center?.name || '',
      exerciseName: exerciseConfig && exerciseConfig.exercise ? exerciseConfig.exercise.name : 'Bài tập thị lực',
      exerciseDescription: exerciseConfig && exerciseConfig.exercise ? exerciseConfig.exercise.description : '',
      frequency: frequencyNames[exerciseConfig?.frequency] || exerciseConfig?.frequency || 'Hàng ngày',
      sessionsCompleted: 0, // Not available in this context
      targetSessions: exerciseConfig?.executionCount || 'không giới hạn',
      daysPastDue: 0, // Not applicable for reminders
      lastSessionAt: '', // Not available in this context
      reminderTime: moment().format('DD/MM/YYYY HH:mm'),
      customMessage:
        exerciseConfig && exerciseConfig.notificationSettings ? exerciseConfig.notificationSettings.customMessage : null,
    };

    const results = {
      email: null,
      zalo: null,
    };

    // Get template from config
    const templateId = exerciseConfig?.notificationSettings?.templateId;
    if (!templateId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Không có template được cấu hình cho nhắc nhở bài tập');
    }

    const template = await notificationTemplateService.getNotificationTemplateById(templateId);
    if (!template) {
      throw new ApiError(httpStatus.NOT_FOUND, `Không tìm thấy template: ${templateId}`);
    }

    const validation = template.validateVariables(templateVariables);
    if (!validation.isValid) {
      logger.warn('Missing template variables for exercise reminder', {
        missingVariables: validation.missingVariables,
        patientId: patient.id,
      });
      throw new ApiError(httpStatus.BAD_REQUEST, `Thiếu biến: ${validation.missingVariables.join(', ')}`);
    }

    const rendered = template.renderTemplate(templateVariables);

    const notificationMethods =
      exerciseConfig && exerciseConfig.notificationSettings && exerciseConfig.notificationSettings.methods
        ? exerciseConfig.notificationSettings.methods
        : ['email'];

    // Send email
    if (notificationMethods.includes('email') && patient.user.email) {
      try {
        await emailService.sendEmail(patient.user.email, rendered.subject, '', rendered.content);
        results.email = 'sent';
        logger.info('Exercise reminder email sent', {
          patientId: patient.id,
          email: patient.user.email,
        });
      } catch (error) {
        results.email = 'failed';
        logger.error('Failed to send exercise reminder email', {
          error: error.message,
          patientId: patient.id,
        });
      }
    }

    // Send Zalo
    if (notificationMethods.includes('zalo') && patient.zaloUserId) {
      try {
        await zaloService.sendZaloText(patient.zaloUserId, rendered.content);
        results.zalo = 'sent';
        logger.info('Exercise reminder Zalo sent', {
          patientId: patient.id,
          zaloUserId: patient.zaloUserId,
        });
      } catch (error) {
        results.zalo = 'failed';
        logger.error('Failed to send exercise reminder Zalo', {
          error: error.message,
          patientId: patient.id,
        });
      }
    }

    // Update notification as sent
    await notificationService.updateNotificationById(notificationData.id, {
      sent: true,
      updatedBy: 1, // System user
    });

    return results;
  } catch (error) {
    logger.error('Failed to send exercise reminder', {
      error: error.message,
      notificationData,
    });
    throw error;
  }
};

/**
 * Process scheduled exercise notifications
 * @returns {Promise}
 */
const processScheduledExerciseNotifications = async () => {
  try {
    const currentTime = new Date();

    // Find exercise notifications that need to be sent
    const pendingNotifications = await notificationService.queryNotifications(
      {
        sent: false,
        category: 'exercise',
        scheduledAt: {
          [Op.lte]: currentTime,
        },
      },
      { limit: 100, page: 1 }
    );

    logger.info(`Processing ${pendingNotifications.rows.length} scheduled exercise notifications`);

    const processNotification = async (notification) => {
      try {
        if (notification.code.startsWith('EXERCISE_REMINDER_')) {
          // Extract exercise config ID from notification code
          const codeparts = notification.code.split('_');
          const exerciseConfigId = parseInt(codeparts[2], 10);

          const exerciseConfig = await ExerciseConfig.findByPk(exerciseConfigId, {
            include: [
              {
                model: Exercise,
                as: 'exercise',
                attributes: ['name', 'description'],
              },
            ],
          });

          if (exerciseConfig) {
            await sendExerciseReminder(notification, exerciseConfig);
          }
        }
      } catch (error) {
        logger.error('Failed to process exercise notification', {
          notificationId: notification.id,
          error: error.message,
        });
      }
    };

    await Promise.all(pendingNotifications.rows.map(processNotification));
  } catch (error) {
    logger.error('Failed to process scheduled exercise notifications', {
      error: error.message,
    });
  }
};

/**
 * Auto-schedule exercise reminders based on config
 * @param {number} patientId - Patient ID
 * @param {number} exerciseConfigId - Exercise config ID
 * @returns {Promise}
 */
const autoScheduleExerciseReminders = async (patientId, exerciseConfigId) => {
  try {
    const exerciseConfig = await ExerciseConfig.findByPk(exerciseConfigId);

    if (!exerciseConfig || !exerciseConfig.notificationSettings || !exerciseConfig.notificationSettings.enabled) {
      return {
        success: false,
        message: 'Auto-scheduling disabled for this exercise',
      };
    }

    const settings = exerciseConfig.notificationSettings;
    const { reminderFrequency, reminderTime, reminderDaysInterval, maxReminders } = settings;

    const reminders = [];
    const now = new Date();

    // Calculate reminder times based on frequency
    const reminderPromises = [];
    for (let i = 0; i < maxReminders; i += 1) {
      const reminderDate = moment(now);

      if (reminderFrequency === 'daily') {
        reminderDate.add(i * reminderDaysInterval, 'days');
      } else if (reminderFrequency === 'weekly') {
        reminderDate.add(i * 7, 'days');
      } else if (reminderFrequency === 'monthly') {
        reminderDate.add(i, 'months');
      }

      // Set the specific time
      const [hours, minutes] = reminderTime.split(':');
      reminderDate.hours(parseInt(hours, 10)).minutes(parseInt(minutes, 10)).seconds(0).milliseconds(0);

      // Only schedule future reminders
      if (reminderDate.toDate() > now) {
        reminderPromises.push(
          scheduleExerciseReminder(patientId, exerciseConfigId, reminderDate.toDate()).then((result) => ({
            scheduledAt: reminderDate.toDate(),
            success: result.success,
          }))
        );
      }
    }

    // Wait for all reminders to be scheduled
    const scheduledReminders = await Promise.all(reminderPromises);
    reminders.push(...scheduledReminders);

    return {
      success: true,
      message: `Scheduled ${reminders.length} exercise reminders`,
      reminders,
    };
  } catch (error) {
    logger.error('Failed to auto-schedule exercise reminders', {
      error: error.message,
      patientId,
      exerciseConfigId,
    });
    throw error;
  }
};

/**
 * Start exercise notification scheduler (cron job)
 */
const startExerciseNotificationScheduler = () => {
  // Run every 10 minutes to check for scheduled exercise notifications
  cron.schedule('*/10 * * * *', async () => {
    await executeAndLogJob('exercise.processNotifications', async () => {
      logger.info('Running scheduled exercise notification check');
      return await processScheduledExerciseNotifications();
    });
  });

  logger.info('Exercise notification scheduler started');
};

module.exports = {
  scheduleExerciseReminder,
  sendExerciseReminder,
  sendComplianceReminder,
  processScheduledExerciseNotifications,
  autoScheduleExerciseReminders,
  startExerciseNotificationScheduler,
};
