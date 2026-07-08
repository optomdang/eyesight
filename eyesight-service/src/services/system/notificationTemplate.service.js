const httpStatus = require('http-status');
const { NotificationTemplate } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { buildPagination, sanitizePagination, buildSortBy } = require('../../utils/query');
const auditLogService = require('./auditLog.service');

/**
 * Create a notification template
 * @param {Object} templateBody
 * @returns {Promise<NotificationTemplate>}
 */
const createNotificationTemplate = async (templateBody) => {
  // Check if template with same code already exists
  const existingTemplate = await NotificationTemplate.findOne({
    where: { code: templateBody.code },
  });

  if (existingTemplate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã template đã tồn tại');
  }

  // Set createdBy = updatedBy for new records
  templateBody.createdBy = templateBody.updatedBy;

  const template = await NotificationTemplate.create(templateBody);

  await auditLogService.logEntityAuditEvent({
    action: 'notificationTemplate.create',
    entityType: 'notificationTemplate',
    entityId: template.id,
    centerId: template.centerId,
    actorUserId: templateBody.updatedBy || null,
    metadata: {
      code: template.code,
      category: template.category,
      channel: template.channel,
    },
  });

  return template;
};

/**
 * Query for notification templates
 * @param {Object} filter - Filter options
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryNotificationTemplates = async (filter, options) => {
  const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
  const order = buildSortBy(options.sortBy, ['createdAt', 'code', 'category']);

  const { count, rows } = await NotificationTemplate.findAndCountAll({
    where: filter,
    limit,
    offset,
    order,
    include: [
      { association: 'center', required: false },
      { association: 'creator', required: false },
      { association: 'updater', required: false },
    ],
  });

  return {
    rows,
    ...buildPagination(count, limit, page),
  };
};

/**
 * Get notification template by id
 * @param {ObjectId} id
 * @returns {Promise<NotificationTemplate>}
 */
const getNotificationTemplateById = async (id) => {
  return NotificationTemplate.findByPk(id, {
    include: [{ association: 'center' }, { association: 'creator' }, { association: 'updater' }],
  });
};

/**
 * Get notification template by code
 * @param {string} code
 * @param {number} centerId
 * @returns {Promise<NotificationTemplate>}
 */
const getNotificationTemplateByCode = async (code, centerId = null) => {
  return NotificationTemplate.getByCode(code, centerId);
};

/**
 * Update notification template by id
 * @param {ObjectId} templateId
 * @param {Object} updateBody
 * @returns {Promise<NotificationTemplate>}
 */
const updateNotificationTemplateById = async (templateId, updateBody) => {
  const template = await getNotificationTemplateById(templateId);
  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Template thông báo không tồn tại');
  }

  // Check if updating code and it conflicts with existing
  if (updateBody.code && updateBody.code !== template.code) {
    const existingTemplate = await NotificationTemplate.findOne({
      where: { code: updateBody.code },
    });
    if (existingTemplate) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Mã template đã tồn tại');
    }
  }

  Object.assign(template, updateBody);
  await template.save();

  await auditLogService.logEntityAuditEvent({
    action: 'notificationTemplate.update',
    entityType: 'notificationTemplate',
    entityId: template.id,
    centerId: template.centerId,
    actorUserId: updateBody.updatedBy || null,
    metadata: {
      code: template.code,
      updatedFields: Object.keys(updateBody || {}),
    },
  });

  return template;
};

/**
 * Delete notification template by id
 * @param {ObjectId} templateId
 * @returns {Promise<NotificationTemplate>}
 */
const deleteNotificationTemplateById = async (templateId, deleteBody = {}) => {
  const template = await getNotificationTemplateById(templateId);
  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Template thông báo không tồn tại');
  }
  await template.destroy();

  await auditLogService.logEntityAuditEvent({
    action: 'notificationTemplate.delete',
    entityType: 'notificationTemplate',
    entityId: template.id,
    centerId: template.centerId,
    actorUserId: deleteBody.updatedBy || null,
    metadata: {
      code: template.code,
    },
  });

  return template;
};

/**
 * Delete multiple notification templates by ids
 * @param {Array} templateIds
 * @returns {Promise}
 */
const deleteNotificationTemplatesByIds = async (deleteBody) => {
  const ids = Array.isArray(deleteBody) ? deleteBody : deleteBody?.ids;
  const affectedCount = await NotificationTemplate.destroy({
    where: {
      id: ids,
    },
  });

  await auditLogService.logEntityAuditEvent({
    action: 'notificationTemplate.bulkDelete',
    entityType: 'notificationTemplate',
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
 * Render template with variables
 * @param {number} templateId
 * @param {Object} variables
 * @returns {Promise<Object>}
 */
const renderTemplate = async (templateId, variables = {}) => {
  const template = await getNotificationTemplateById(templateId);
  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Template thông báo không tồn tại');
  }

  const validation = template.validateVariables(variables);
  if (!validation.isValid) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Thiếu biến bắt buộc: ${validation.missingVariables.join(', ')}`);
  }

  return template.renderTemplate(variables);
};

/**
 * Preview template with sample data
 * @param {number} templateId
 * @returns {Promise<Object>}
 */
const previewTemplate = async (templateId) => {
  const template = await getNotificationTemplateById(templateId);
  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Template thông báo không tồn tại');
  }

  // Generate sample data based on template variables
  const sampleData = {};
  const variables = template.variables || [];

  variables.forEach((variable) => {
    switch (variable) {
      case 'patientName':
        sampleData[variable] = 'Nguyễn Văn A';
        break;
      case 'examCode':
        sampleData[variable] = 'EX2024001';
        break;
      case 'examDate':
        sampleData[variable] = '15/08/2024';
        break;
      case 'examTime':
        sampleData[variable] = '09:00';
        break;
      case 'clinicName':
        sampleData[variable] = 'Phòng khám Mắt ABC';
        break;
      case 'doctorName':
        sampleData[variable] = 'BS. Nguyễn Thị B';
        break;
      case 'exerciseName':
        sampleData[variable] = 'Bài tập nhìn xa gần';
        break;
      case 'exerciseDescription':
        sampleData[variable] = 'Thực hiện bài tập nhìn xa gần 10 phút mỗi ngày';
        break;
      case 'reminderTime':
        sampleData[variable] = '18:00 hàng ngày';
        break;
      case 'customMessage':
        sampleData[variable] = 'Đây là tin nhắn tùy chỉnh từ bác sĩ';
        break;
      case 'results':
        sampleData[variable] = 'Kết quả tốt';
        break;
      default:
        sampleData[variable] = `Sample ${variable}`;
    }
  });

  return {
    template: {
      id: template.id,
      code: template.code,
      name: template.name,
      category: template.category,
    },
    sampleData,
    preview: template.renderTemplate(sampleData),
  };
};

module.exports = {
  createNotificationTemplate,
  queryNotificationTemplates,
  getNotificationTemplateById,
  getNotificationTemplateByCode,
  updateNotificationTemplateById,
  deleteNotificationTemplateById,
  deleteNotificationTemplatesByIds,
  renderTemplate,
  previewTemplate,
};
