const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { notificationTemplateService } = require('../../services');

const filterKeys = ['code', 'name', 'type', 'category', 'isDefault', 'isActive', 'centerId', 'createdBy'];

const createNotificationTemplate = catchAsync(async (req, res) => {
  // Force centerId from authenticated user
  req.body.centerId = req.user.centerId;
  const template = await notificationTemplateService.createNotificationTemplate(req.body);
  res.status(httpStatus.CREATED).send(template);
});

const getNotificationTemplates = catchAsync(async (req, res) => {
  const filter = pick(req.query, filterKeys);
  // Force centerId from authenticated user
  filter.centerId = req.user.centerId;
  const options = pick(req.query, ['sortBy', 'order', 'limit', 'page']);
  const result = await notificationTemplateService.queryNotificationTemplates(filter, options);
  res.send(result);
});

const getNotificationTemplate = catchAsync(async (req, res) => {
  const template = await notificationTemplateService.getNotificationTemplateById(req.params.templateId);
  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification template not found');
  }
  // Verify centerId ownership
  if (template.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền truy cập template này');
  }
  res.send(template);
});

const updateNotificationTemplate = catchAsync(async (req, res) => {
  // Verify centerId ownership before update
  const template = await notificationTemplateService.getNotificationTemplateById(req.params.templateId);
  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification template not found');
  }
  if (template.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền cập nhật template này');
  }
  // Prevent centerId modification
  delete req.body.centerId;
  const updated = await notificationTemplateService.updateNotificationTemplateById(req.params.templateId, req.body);
  res.send(updated);
});

const deleteNotificationTemplate = catchAsync(async (req, res) => {
  // Verify centerId ownership before delete
  const template = await notificationTemplateService.getNotificationTemplateById(req.params.templateId);
  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification template not found');
  }
  if (template.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền xóa template này');
  }
  await notificationTemplateService.deleteNotificationTemplateById(req.params.templateId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteNotificationTemplates = catchAsync(async (req, res) => {
  req.body.centerId = req.user.centerId;
  await notificationTemplateService.deleteNotificationTemplatesByIds(req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const renderTemplate = catchAsync(async (req, res) => {
  const result = await notificationTemplateService.renderTemplate(req.params.templateId, req.body.variables);
  res.send(result);
});

const previewTemplate = catchAsync(async (req, res) => {
  const preview = await notificationTemplateService.previewTemplate(req.params.templateId);
  res.send(preview);
});

const getTemplateByCode = catchAsync(async (req, res) => {
  const { code } = req.params;
  // Force centerId from authenticated user
  const template = await notificationTemplateService.getNotificationTemplateByCode(code, req.user.centerId);
  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification template not found');
  }
  res.send(template);
});

module.exports = {
  createNotificationTemplate,
  getNotificationTemplates,
  getNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  deleteNotificationTemplates,
  renderTemplate,
  previewTemplate,
  getTemplateByCode,
};
