const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { notificationService, auditLogService } = require('../../services');

const filterKeys = [
  'code',
  'type',
  'category',
  'title',
  'message',
  'sender',
  'receiverId',
  'isRead',
  'priority',
  'centerId',
  'scheduledAt',
  'sent',
];

const createNotification = catchAsync(async (req, res) => {
  // Force centerId from authenticated user
  req.body.centerId = req.user.centerId;
  const notification = await notificationService.createNotification(req.body);
  res.status(httpStatus.CREATED).send(notification);
});

const getNotifications = catchAsync(async (req, res) => {
  const filter = pick(req.query, filterKeys);
  // Force centerId from authenticated user
  filter.centerId = req.user.centerId;
  const options = pick(req.query, ['sortBy', 'order', 'limit', 'page']);
  const result = await notificationService.queryNotifications(filter, options);
  res.send(result);
});

const getNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.getNotificationById(req.params.notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Thông báo không tồn tại');
  }
  // Verify centerId ownership
  if (notification.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền truy cập thông báo này');
  }
  res.send(notification);
});

const updateNotification = catchAsync(async (req, res) => {
  // Verify centerId ownership before update
  const notification = await notificationService.getNotificationById(req.params.notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Thông báo không tồn tại');
  }
  if (notification.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền cập nhật thông báo này');
  }
  // Prevent centerId modification
  delete req.body.centerId;
  const updated = await notificationService.updateNotificationById(req.params.notificationId, req.body);
  res.send(updated);
});

const deleteNotification = catchAsync(async (req, res) => {
  // Verify centerId ownership before delete
  const notification = await notificationService.getNotificationById(req.params.notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Thông báo không tồn tại');
  }
  if (notification.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền xóa thông báo này');
  }
  await notificationService.deleteNotificationById(req.params.notificationId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteNotifications = catchAsync(async (req, res) => {
  req.body.centerId = req.user.centerId;
  await notificationService.deleteNotificationByIds(req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendManualNotification = catchAsync(async (req, res) => {
  const { patientIds } = req.body;

  // Delegate ALL logic to service layer
  const result =
    patientIds && Array.isArray(patientIds)
      ? await notificationService.sendManualNotificationBulk(req.body, req.user, {
          requestContext: auditLogService.buildRequestContext(req),
        })
      : await notificationService.sendManualNotificationSingle(req.body, req.user, {
          requestContext: auditLogService.buildRequestContext(req),
        });

  res.status(httpStatus.OK).send(result);
});

module.exports = {
  sendManualNotification,
  createNotification,
  getNotifications,
  getNotification,
  updateNotification,
  deleteNotification,
  deleteNotifications,
};
