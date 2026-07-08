const Joi = require('joi');
const {
  standardId,
  standardString,
  standardQueryParams,
  standardTenantFields,
  standardEnums,
  getEntityValidation,
  deleteEntityValidation,
  bulkDeleteValidation,
} = require('../../utils/validation');

// Send manual notification - supports both single and multiple patients
const sendManualNotification = {
  body: Joi.object()
    .keys({
      patientId: Joi.number().integer().positive(),
      patientIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).messages({
        'array.min': 'Phải chọn ít nhất 1 bệnh nhân',
        'array.max': 'Không thể gửi cho quá 100 bệnh nhân cùng lúc',
      }),
      templateId: Joi.number().integer().positive().optional(),
      channel: Joi.string().valid('email', 'zalo', 'sms', 'web').required(),
      subject: standardString.optional,
      content: standardString.optional,
      centerId: Joi.number().integer().positive().optional(), // Will be injected by middleware
      updatedBy: Joi.number().integer().positive().optional(), // Will be injected by middleware
    })
    .xor('patientId', 'patientIds') // Must have exactly one, not both
    .or('templateId', 'content') // At least one must be provided
    .messages({
      'object.missing': 'Phải cung cấp templateId hoặc content',
      'object.xor': 'Phải cung cấp patientId hoặc patientIds, không được cả hai',
    }),
};

// Create notification - all mandatory fields required
const createNotification = {
  body: Joi.object().keys({
    code: standardString.code,
    type: Joi.string().valid('info', 'warning', 'error', 'success').default('info'),
    category: Joi.string().valid('appointment', 'inventory', 'common').required(),
    title: standardString.required,
    message: standardString.required,
    sender: standardString.required,
    receiverId: standardId,
    isRead: Joi.boolean().default(false),
    priority: standardEnums.priority.default('normal'),
    url: Joi.string().uri().optional(),
    scheduledAt: Joi.date().iso().optional(),
    sent: Joi.boolean().default(false),
    centerId: standardTenantFields.centerId,
    updatedBy: standardTenantFields.updatedBy,
  }),
};

// Query notifications - standard pagination and filtering
const getNotifications = {
  query: Joi.object().keys({
    ...standardQueryParams,
    code: Joi.string().optional(),
    type: Joi.string().valid('info', 'warning', 'error', 'success').optional(),
    category: Joi.string().valid('appointment', 'inventory', 'common').optional(),
    title: Joi.string().optional(),
    message: Joi.string().optional(),
    sender: Joi.string().optional(),
    receiverId: Joi.number().integer().positive().optional(),
    isRead: Joi.boolean().optional(),
    priority: standardEnums.priority.optional(),
    sent: Joi.boolean().optional(),
    centerId: Joi.number().integer().positive().optional(),
  }),
};

// Get single entity - standard ID validation
const getNotification = getEntityValidation('notification');

// Update notification - all fields optional except ID and centerId
const updateNotification = {
  params: Joi.object().keys({
    notificationId: standardId,
  }),
  body: Joi.object()
    .keys({
      id: standardId,
      code: standardString.code,
      type: Joi.string().valid('info', 'warning', 'error', 'success').optional(),
      category: Joi.string().valid('appointment', 'inventory', 'common').optional(),
      title: standardString.required,
      message: standardString.required,
      sender: standardString.required,
      receiverId: standardId,
      isRead: Joi.boolean().optional(),
      priority: standardEnums.priority.optional(),
      url: Joi.string().uri().optional(),
      scheduledAt: Joi.date().iso().optional(),
      sent: Joi.boolean().optional(),
      centerId: standardTenantFields.centerId,
      updatedBy: standardTenantFields.updatedBy,
    })
    .min(1),
};

// Delete single entity - standard ID validation
const deleteNotification = deleteEntityValidation('notification');

// Bulk delete - standard { ids: [] } body
const deleteNotifications = bulkDeleteValidation();

module.exports = {
  sendManualNotification,
  createNotification,
  getNotifications,
  getNotification,
  updateNotification,
  deleteNotification,
  deleteNotifications,
};
