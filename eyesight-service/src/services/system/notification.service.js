const httpStatus = require('http-status');
const { Notification, User } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { buildPagination, sanitizePagination, buildSortBy } = require('../../utils/query');
const logger = require('../../config/logger');
const notificationTemplateService = require('./notificationTemplate.service');
const auditLogService = require('./auditLog.service');
const emailService = require('../email.service');
const zaloService = require('../zalo.service');
const patientService = require('../clinic/patient.service');
const fcmService = require('../common/fcm.service');

/**
 * Create a notification
 * @param {Object} notificationBody
 * @returns {Promise<Notification>}
 */
const createNotification = async (notificationBody) => {
  if (await Notification.isDuplicateCode(notificationBody.code, notificationBody.centerId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã thông báo đã tồn tại');
  }

  // Set createdBy = updatedBy for new records
  notificationBody.createdBy = notificationBody.updatedBy;

  const notification = await Notification.create(notificationBody);

  await auditLogService.logEntityAuditEvent({
    action: 'notification.create',
    entityType: 'notification',
    entityId: notification.id,
    centerId: notification.centerId,
    actorUserId: notificationBody.updatedBy || null,
    metadata: {
      category: notification.category,
      channel: notification.channel,
      receiverId: notification.receiverId,
    },
  });

  return notification;
};

/**
 * Query for notifications
 * @param {Object} originalFilter - Filter conditions
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {string} [options.order] - Sort order (ASC|DESC)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<{rows: Notification[], count: number, limit: number, page: number, totalPages: number}>}
 */
const queryNotifications = async (originalFilter, options) => {
  const filter = { ...originalFilter, deleted: false };
  const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
  const order = buildSortBy(options.sortBy, ['createdAt', 'status', 'channel', 'receiver.name']);

  const { count, rows } = await Notification.findAndCountAll({
    where: filter,
    include: [
      {
        model: User,
        as: 'receiver',
        attributes: ['id', 'name', 'email', 'phoneNumber'],
        required: false,
      },
    ],
    limit,
    offset,
    order,
  });

  return {
    rows,
    ...buildPagination(count, limit, page),
  };
};

/**
 * Get notification by id
 * @param {number} id
 * @returns {Promise<Notification>}
 */
const getNotificationById = async (id) => {
  return Notification.findByPk(id, {
    include: [
      {
        model: User,
        as: 'receiver',
        attributes: ['id', 'name', 'email', 'phoneNumber'],
        required: false,
      },
    ],
  });
};

/**
 * Get notification by code
 * @param {string} code
 * @returns {Promise<Notification>}
 */
const getNotificationByCode = async (code) => {
  return Notification.findOne({ where: { code } });
};

/**
 * Update notification by id
 * @param {number} notificationId
 * @param {Object} updateBody
 * @returns {Promise<Notification>}
 */
const updateNotificationById = async (notificationId, updateBody) => {
  const notification = await getNotificationById(notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Thông báo không tồn tại');
  }
  if (updateBody.code && (await Notification.isDuplicateCode(updateBody.code, notification.centerId, notificationId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã thông báo đã tồn tại');
  }
  Object.assign(notification, updateBody);
  await notification.save();

  await auditLogService.logEntityAuditEvent({
    action: 'notification.update',
    entityType: 'notification',
    entityId: notification.id,
    centerId: notification.centerId,
    actorUserId: updateBody.updatedBy || null,
    metadata: {
      updatedFields: Object.keys(updateBody || {}),
      receiverId: notification.receiverId,
    },
  });

  return notification;
};

/**
 * Delete notification by id (hard delete)
 * @param {number} notificationId
 * @returns {Promise<Notification>}
 */
const deleteNotificationById = async (notificationId, deleteBody = {}) => {
  const notification = await getNotificationById(notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Thông báo không tồn tại');
  }
  await notification.destroy();

  await auditLogService.logEntityAuditEvent({
    action: 'notification.delete',
    entityType: 'notification',
    entityId: notification.id,
    centerId: notification.centerId,
    actorUserId: deleteBody.updatedBy || null,
    metadata: {
      receiverId: notification.receiverId,
      category: notification.category,
    },
  });

  return notification;
};

/**
 * Delete notifications by ids (hard delete)
 * @param {number[]} notificationIds
 * @returns {Promise<number>}
 */
const deleteNotificationByIds = async (deleteBody) => {
  const { Op } = require('sequelize');
  const ids = Array.isArray(deleteBody) ? deleteBody : deleteBody?.ids;
  const where = { id: { [Op.in]: ids } };
  // If called from user context, scope delete to the requesting user only
  if (deleteBody?.receiverId) where.receiverId = deleteBody.receiverId;
  if (deleteBody?.centerId) where.centerId = deleteBody.centerId;
  const affectedCount = await Notification.destroy({ where });

  await auditLogService.logEntityAuditEvent({
    action: 'notification.bulkDelete',
    entityType: 'notification',
    centerId: deleteBody?.centerId ?? null,
    actorUserId: deleteBody?.updatedBy || null,
    metadata: {
      ids,
      affectedCount,
    },
  });

  return affectedCount;
};

/**
 * Get notification summary by user
 * @param {Object} user - User object
 * @param {Object} options - Query options
 * @param {string} [options.channel] - Notification channel filter
 * @returns {Promise<{totalNotifications: number, unreadNotifications: number, readNotifications: number}>}
 */
const getNotificationSummaryByUser = async (user, options = {}) => {
  const { channel } = options;
  const baseWhere = {
    receiverId: user.id,
    centerId: user.centerId,
  };

  const totalWhere = { ...baseWhere };
  const unreadWhere = { ...baseWhere, isRead: false };

  if (channel) {
    totalWhere.channel = channel;
    unreadWhere.channel = channel;
  }

  const totalNotifications = await Notification.count({ where: totalWhere });
  const unreadNotifications = await Notification.count({ where: unreadWhere });

  return {
    totalNotifications,
    unreadNotifications,
    readNotifications: totalNotifications - unreadNotifications,
  };
};

/**
 * Helper function to render template variables in any string
 * @param {string} text - Text with template variables
 * @param {Object} variables - Variables to replace
 * @returns {string} Rendered text
 */
const renderVariables = (text, variables) => {
  if (!text) return text;
  let rendered = text;
  Object.keys(variables).forEach((key) => {
    // eslint-disable-next-line security/detect-non-literal-regexp -- Dynamic key replacement is required for template rendering
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    const value = variables[key] || '';
    rendered = rendered.replace(placeholder, value);
  });
  return rendered;
};

/**
 * Send manual notification to a single patient
 * @param {Object} requestBody - Request body containing notification details
 * @param {Object} user - Authenticated user
 * @returns {Promise<Object>} Result with notification and send status
 */
const sendManualNotificationSingle = async (requestBody, user, { requestContext = {} } = {}) => {
  const { patientId, templateId, channel, subject, content } = requestBody;
  const { centerId, id: senderId } = user;

  // Validate that either template or manual content is provided
  if (!templateId && !content) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phải cung cấp mẫu thông báo hoặc nội dung thủ công');
  }

  // Load patient ONCE with all needed associations
  const patient = await patientService.getPatientById(patientId, [
    { association: 'user' },
    { association: 'center' },
    {
      association: 'doctor',
      required: false,
      include: [{ association: 'user', attributes: ['name'] }],
    },
  ]);

  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }

  if (patient.centerId !== centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bệnh nhân không thuộc trung tâm của bạn');
  }

  let finalSubject;
  let finalContent;
  let category = 'system';

  // Prepare template variables
  const templateVariables = {
    patientName: patient.user?.name || patient.fullName || '',
    patientCode: patient.code || '',
    doctorName: patient.doctor?.user?.name || '',
    centerName: patient.center?.name || '',
  };

  // If template is provided, use it as base
  if (templateId) {
    const template = await notificationTemplateService.getNotificationTemplateById(templateId);
    if (!template) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Template không tồn tại');
    }

    if (!template.isActive) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Template đã bị vô hiệu hóa');
    }

    category = template.category;
    const rendered = template.renderTemplate(templateVariables);

    finalSubject = renderVariables(subject || template.subject, templateVariables) || rendered.subject || template.name;
    finalContent = renderVariables(content || template.content, templateVariables) || rendered.content;
  } else {
    // No template - render variables in manual content
    finalSubject = renderVariables(subject, templateVariables);
    finalContent = renderVariables(content, templateVariables);
  }

  // Prepare recipient based on channel
  let recipient;

  switch (channel) {
    case 'email':
      recipient = patient.user?.email;
      if (!recipient) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Bệnh nhân không có email');
      }
      break;
    case 'zalo':
      recipient = patient.user?.zaloUserId || patient.user?.zaloPhoneNumber;
      if (!recipient) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Bệnh nhân không có Zalo ID/số điện thoại');
      }
      break;
    case 'sms':
      recipient = patient.user?.phoneNumber;
      if (!recipient) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Bệnh nhân không có số điện thoại');
      }
      break;
    case 'web':
      recipient = patient.userId;
      break;
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, 'Kênh gửi không hợp lệ');
  }

  // Send notification based on channel
  let sendResult;
  let sent = false;
  let sendError = null;

  try {
    if (channel === 'email') {
      sendResult = await emailService.sendEmail(recipient, finalSubject, finalContent);
      sent = true;
    } else if (channel === 'zalo') {
      sendResult = await zaloService.sendZaloMessage(recipient, finalContent);
      sent = true;
    } else if (channel === 'sms') {
      throw new ApiError(httpStatus.NOT_IMPLEMENTED, 'Chức năng gửi SMS đang được phát triển');
    } else if (channel === 'web') {
      sent = true;
    }
  } catch (error) {
    logger.error('Error sending manual notification:', error);
    sendError = error.message || 'Không thể gửi thông báo';

    if (error instanceof ApiError && error.statusCode === httpStatus.NOT_IMPLEMENTED) {
      throw error;
    }
  }

  // Create notification record
  const notification = await createNotification({
    code: `MANUAL_${Date.now()}`,
    type: 'info',
    category,
    title: finalSubject || 'Thông báo thủ công',
    message: finalContent,
    senderId: senderId.toString(),
    receiverId: patient.userId,
    isRead: false,
    priority: 'normal',
    channel,
    sent,
    sentAt: sent ? new Date() : null,
    errorMessage: sendError,
    centerId,
  });

  // If channel is web and user has FCM token, send push notification
  if (channel === 'web' && patient.user?.fcmRegistrationToken) {
    try {
      const payload = {
        title: notification.title,
        body: notification.message,
        data: { notificationId: String(notification.id) },
      };
      await fcmService.sendNotificationToClient(patient.user.fcmRegistrationToken, payload);

      if (!sent) {
        await updateNotificationById(notification.id, { sent: true, sentAt: new Date() });
      }
    } catch (err) {
      logger.error('Failed to push via FCM:', err);
      await updateNotificationById(notification.id, {
        errorMessage: (notification.errorMessage ? `${notification.errorMessage}; ` : '') + err.message,
      });
    }
  }

  const result = {
    success: sent,
    sent,
    notification,
    result: sendResult,
    error: sendError,
  };

  await auditLogService.logEntityAuditEvent({
    user,
    requestContext,
    action: 'notification.manualSend',
    entityType: 'notification',
    entityId: notification.id,
    centerId,
    metadata: {
      patientId,
      mode: 'single',
      channel,
      sent,
    },
  });

  return result;
};

/**
 * Send manual notification to multiple patients (bulk)
 * @param {Object} requestBody - Request body containing notification details
 * @param {Object} user - Authenticated user
 * @returns {Promise<Object>} Result with success/failed counts and details
 */
const sendManualNotificationBulk = async (requestBody, user, { requestContext = {} } = {}) => {
  const { patientIds, templateId, channel, subject, content } = requestBody;
  const { centerId, id: senderId } = user;

  // Validate that either template or manual content is provided
  if (!templateId && !content) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phải cung cấp mẫu thông báo hoặc nội dung thủ công');
  }

  // Load template once if provided
  let template = null;
  if (templateId) {
    template = await notificationTemplateService.getNotificationTemplateById(templateId);
    if (!template) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Template không tồn tại');
    }
    if (!template.isActive) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Template đã bị vô hiệu hóa');
    }
  }

  // Process each patient - using sequential processing for reliability
  // eslint-disable-next-line no-restricted-syntax
  const results = {
    total: patientIds.length,
    success: 0,
    failed: 0,
    details: [],
  };

  // eslint-disable-next-line no-restricted-syntax
  for (const patientId of patientIds) {
    const result = {
      patientId,
      success: false,
      error: null,
      notificationId: null,
    };

    try {
      // Load patient with associations
      // eslint-disable-next-line no-await-in-loop
      const patient = await patientService.getPatientById(patientId, [
        { association: 'user' },
        { association: 'center' },
        {
          association: 'doctor',
          required: false,
          include: [{ association: 'user', attributes: ['name'] }],
        },
      ]);

      if (!patient) {
        result.error = 'Bệnh nhân không tồn tại';
        results.failed += 1;
        results.details.push(result);
        continue;
      }

      if (patient.centerId !== centerId) {
        result.error = 'Bệnh nhân không thuộc trung tâm của bạn';
        results.failed += 1;
        results.details.push(result);
        continue;
      }

      // Prepare template variables
      const templateVariables = {
        patientName: patient.user?.name || patient.fullName || '',
        patientCode: patient.code || '',
        doctorName: patient.doctor?.user?.name || '',
        centerName: patient.center?.name || '',
      };

      // Render content
      let finalSubject;
      let finalContent;
      let category = 'system';

      if (template) {
        category = template.category;
        const rendered = template.renderTemplate(templateVariables);
        finalSubject = renderVariables(subject || template.subject, templateVariables) || rendered.subject || template.name;
        finalContent = renderVariables(content || template.content, templateVariables) || rendered.content;
      } else {
        finalSubject = renderVariables(subject, templateVariables);
        finalContent = renderVariables(content, templateVariables);
      }

      // Validate recipient based on channel
      let recipient;
      switch (channel) {
        case 'email':
          recipient = patient.user?.email;
          if (!recipient) {
            result.error = 'Bệnh nhân không có email';
            results.failed += 1;
            results.details.push(result);
            continue;
          }
          break;
        case 'zalo':
          recipient = patient.user?.zaloUserId || patient.user?.zaloPhoneNumber;
          if (!recipient) {
            result.error = 'Bệnh nhân không có Zalo ID/số điện thoại';
            results.failed += 1;
            results.details.push(result);
            continue;
          }
          break;
        case 'sms':
          recipient = patient.user?.phoneNumber;
          if (!recipient) {
            result.error = 'Bệnh nhân không có số điện thoại';
            results.failed += 1;
            results.details.push(result);
            continue;
          }
          break;
        case 'web':
          recipient = patient.userId;
          break;
        default:
          result.error = 'Kênh gửi không hợp lệ';
          results.failed += 1;
          results.details.push(result);
          continue;
      }

      // Send notification
      let sent = false;
      let sendError = null;

      try {
        if (channel === 'email') {
          // eslint-disable-next-line no-await-in-loop
          await emailService.sendEmail(recipient, finalSubject, finalContent);
          sent = true;
        } else if (channel === 'zalo') {
          // eslint-disable-next-line no-await-in-loop
          await zaloService.sendZaloMessage(recipient, finalContent);
          sent = true;
        } else if (channel === 'sms') {
          sendError = 'Chức năng gửi SMS đang được phát triển';
        } else if (channel === 'web') {
          sent = true;
        }
      } catch (error) {
        logger.error(`Error sending notification to patient ${patientId}:`, error);
        sendError = error.message || 'Không thể gửi thông báo';
      }

      // Create notification record
      // eslint-disable-next-line no-await-in-loop
      const notification = await createNotification({
        code: `MANUAL_BULK_${Date.now()}_${patientId}`,
        type: 'info',
        category,
        title: finalSubject || 'Thông báo thủ công',
        message: finalContent,
        senderId: senderId.toString(),
        receiverId: patient.userId,
        isRead: false,
        priority: 'normal',
        channel,
        sent,
        sentAt: sent ? new Date() : null,
        errorMessage: sendError,
        centerId,
      });

      // Try FCM push for web notifications
      if (channel === 'web' && patient.user?.fcmRegistrationToken) {
        try {
          const payload = {
            title: notification.title,
            body: notification.message,
            data: { notificationId: String(notification.id) },
          };
          // eslint-disable-next-line no-await-in-loop
          await fcmService.sendNotificationToClient(patient.user.fcmRegistrationToken, payload);
          if (!sent) {
            // eslint-disable-next-line no-await-in-loop
            await updateNotificationById(notification.id, { sent: true, sentAt: new Date() });
            sent = true;
          }
        } catch (err) {
          logger.error(`Failed to push FCM to patient ${patientId}:`, err);
        }
      }

      result.success = sent;
      result.notificationId = notification.id;
      if (!sent) {
        result.error = sendError;
        results.failed += 1;
      } else {
        results.success += 1;
      }
    } catch (error) {
      logger.error(`Error processing patient ${patientId}:`, error);
      result.error = error.message || 'Có lỗi xảy ra';
      results.failed += 1;
    }

    results.details.push(result);
  }

  await auditLogService.logEntityAuditEvent({
    user,
    requestContext,
    action: 'notification.manualSend',
    entityType: 'notification',
    entityId: 'bulk',
    centerId,
    metadata: {
      patientIds,
      mode: 'bulk',
      channel,
      successCount: results.success,
      failedCount: results.failed,
    },
  });

  return results;
};

/**
 * Mark all notifications as read for a user
 * @param {number} userId - User ID
 * @param {number} centerId - Center ID
 * @returns {Promise<number>} Number of updated records
 */
const markAllNotificationsReadByUser = async (userId, centerId) => {
  const [affectedCount] = await Notification.update(
    { isRead: true },
    { where: { receiverId: userId, centerId, isRead: false } }
  );
  return affectedCount;
};

module.exports = {
  createNotification,
  queryNotifications,
  getNotificationById,
  getNotificationByCode,
  updateNotificationById,
  deleteNotificationById,
  deleteNotificationByIds,
  getNotificationSummaryByUser,
  markAllNotificationsReadByUser,
  sendManualNotificationSingle,
  sendManualNotificationBulk,
};
