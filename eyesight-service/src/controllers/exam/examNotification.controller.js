const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const examNotificationService = require('../../services/exam/examNotification.service');
const { examSessionService } = require('../../services');

/**
 * Schedule exam reminder notification
 */
const scheduleExamReminder = catchAsync(async (req, res) => {
  const { patientId, examSessionId, reminderTime } = req.body;

  const examSession = await examSessionService.getExamSessionById(examSessionId);
  if (!examSession) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phiên kiểm tra không tồn tại');
  }

  const result = await examNotificationService.scheduleExamReminder(patientId, examSession, new Date(reminderTime));

  res.status(httpStatus.CREATED).send(result);
});

/**
 * Send exam start notification
 */
const sendExamStartNotification = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const result = await examNotificationService.sendExamStartNotification(parseInt(sessionId, 10));

  res.status(httpStatus.OK).send({
    message: 'Exam start notification sent',
    result,
  });
});

/**
 * Send exam completion notification
 */
const sendExamCompleteNotification = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const result = await examNotificationService.sendExamCompleteNotification(parseInt(sessionId, 10));

  res.status(httpStatus.OK).send({
    message: 'Exam completion notification sent',
    result,
  });
});

/**
 * Process scheduled notifications manually
 */
const processScheduledNotifications = catchAsync(async (req, res) => {
  await examNotificationService.processScheduledNotifications();

  res.status(httpStatus.OK).send({
    message: 'Scheduled notifications processed',
  });
});

module.exports = {
  scheduleExamReminder,
  sendExamStartNotification,
  sendExamCompleteNotification,
  processScheduledNotifications,
};
