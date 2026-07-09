const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { userService, notificationService, patientService, roleService } = require('../../services');

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    'name',
    'email',
    'phoneNumber',
    'search',
    'roleId',
    'userType',
    'centerId',
  ]);
  const options = pick(req.query, ['sortBy', 'order', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getCurrentUser = catchAsync(async (req, res) => {
  const { user } = req;
  res.send(user);
});

const updateCurrentUser = catchAsync(async (req, res) => {
  // Security: User can only update their own profile
  // Prevent updating sensitive fields
  const restrictedFields = [
    'roleId',
    'roleCode',
    'userType',
    'centerId',
    'password',
    'isEmailVerified',
    'active',
    'deleted',
  ];
  restrictedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      delete req.body[field];
    }
  });

  req.body.updatedBy = req.body.updatedBy || req.user.id;
  const user = await userService.updateUserById(req.user.id, req.body);
  res.send(user);
});

const changeAdminCenter = catchAsync(async (req, res) => {
  const isAdmin =
    req.user?.userType === 'admin' || req.user?.role?.code?.toLowerCase() === 'admin';
  if (!req.user || !isAdmin) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền thay đổi trung tâm');
  }

  const { centerId } = req.body;
  if (!centerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'centerId is required');
  }

  // Determine admin roleId in the target center
  const role = await roleService.getRoleByCodeAndCenterId('admin', centerId);
  if (!role) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Vai trò admin không tồn tại cho trung tâm ${centerId}`);
  }

  const updatedUser = await userService.updateUserById(req.user.id, {
    centerId,
    roleId: role.id,
    updatedBy: req.user.id,
  });

  res.send(updatedUser);
});

const getCurrentPatientInfo = catchAsync(async (req, res) => {
  const userId = parseInt(req.user.id, 10);
  if (Number.isNaN(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
  }

  // Get patient record by user ID
  let patient = await patientService.getPatientByUserId(userId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  patient = await patientService.ensurePatientExamResultsCache(patient);

  res.send(patient);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tài khoản không tồn tại');
  }
  res.send(user);
});

const updateUser = catchAsync(async (req, res) => {
  // SECURITY: Verify user belongs to requester's center
  const targetUser = await userService.getUserById(req.params.userId);
  if (!targetUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tài khoản không tồn tại');
  }
  if (targetUser.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền cập nhật tài khoản này');
  }
  if (req.body.patient?.treatmentPackageId !== undefined && req.user.userType !== 'admin') {
    delete req.body.patient.treatmentPackageId;
  }
  const user = await userService.updateUserById(req.params.userId, req.body, {
    actorUserType: req.user.userType,
  });
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteUsers = catchAsync(async (req, res) => {
  await userService.deleteUserByIds(req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const getClinicsFromUser = catchAsync(async (req, res) => {
  const clinics = await userService.getClinicsFromUser(req.params.userId);
  res.send(clinics);
});

const removeClinicFromUser = catchAsync(async (req, res) => {
  await userService.removeClinicFromUser(req.params.userId, req.params.clinicId);
  res.status(httpStatus.NO_CONTENT).send();
});

const storeRegistrationToken = catchAsync(async (req, res) => {
  const { token } = req.body;
  // token is validated by Joi schema (can be string or null)
  await userService.storeRegistrationToken(req.user.id, token);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteRegistrationToken = catchAsync(async (req, res) => {
  // Clear FCM token for current user
  await userService.storeRegistrationToken(req.user.id, null);
  res.status(httpStatus.NO_CONTENT).send();
});

const getNotificationsByUser = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['title', 'category', 'isRead', 'channel']);
  filter.receiverId = req.user.id;
  filter.centerId = req.user.centerId;
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await notificationService.queryNotifications(filter, options);
  res.send(result);
});

const getNotificationSummaryByUser = catchAsync(async (req, res) => {
  const notificationSummary = await notificationService.getNotificationSummaryByUser(req.user);
  res.send(notificationSummary);
});

const getUnreadNotificationCount = catchAsync(async (req, res) => {
  const { channel } = req.query;
  const summary = await notificationService.getNotificationSummaryByUser(req.user, { channel });
  res.send({ count: summary.unreadNotifications || 0 });
});

const sendNotificationToUser = catchAsync(async (req, res) => {
  await notificationService.sendNotificationToUser(req.params.userId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteNotificationsByUser = catchAsync(async (req, res) => {
  // Only allow deleting notifications that belong to the current user
  const ids = Array.isArray(req.body) ? req.body : req.body?.ids;
  if (!ids || ids.length === 0) {
    return res.status(httpStatus.NO_CONTENT).send();
  }
  await notificationService.deleteNotificationByIds({
    ids,
    receiverId: req.user.id, // service will scope the DELETE to this receiverId
    centerId: req.user.centerId,
  });
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteNotificationByUser = catchAsync(async (req, res) => {
  const notification = await notificationService.getNotificationById(req.params.notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Thông báo không tồn tại');
  }
  // Verify ownership
  if (notification.receiverId !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this notification');
  }
  await notificationService.deleteNotificationById(req.params.notificationId);
  res.status(httpStatus.NO_CONTENT).send();
});

const markAllNotificationsRead = catchAsync(async (req, res) => {
  await notificationService.markAllNotificationsReadByUser(req.user.id, req.user.centerId);
  res.status(httpStatus.NO_CONTENT).send();
});

const markNotificationRead = catchAsync(async (req, res) => {
  const notification = await notificationService.getNotificationById(req.params.notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Thông báo không tồn tại');
  }
  // Verify ownership
  if (notification.receiverId !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this notification');
  }
  await notificationService.updateNotificationById(req.params.notificationId, { isRead: true });
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  deleteUsers,
  getClinicsFromUser,
  getCurrentUser,
  updateCurrentUser,
  getCurrentPatientInfo,
  changeAdminCenter,
  removeClinicFromUser,
  storeRegistrationToken,
  deleteRegistrationToken,
  getNotificationsByUser,
  getNotificationSummaryByUser,
  getUnreadNotificationCount,
  deleteNotificationsByUser,
  deleteNotificationByUser,
  markNotificationRead,
  markAllNotificationsRead,
  sendNotificationToUser,
};
