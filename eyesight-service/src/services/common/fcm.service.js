const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const admin = require('../../utils/firebaseAdmin');

/**
 * Send notification to a single client device
 * @param {string} fcmRegistrationToken - FCM registration token
 * @param {Object} notificationPayload - Notification payload
 * @param {string} notificationPayload.title - Notification title
 * @param {string} notificationPayload.body - Notification body/message
 * @param {Object} [notificationPayload.data] - Additional data payload
 * @returns {Promise<string>} - Message ID
 */
const sendNotificationToClient = async function (fcmRegistrationToken, notificationPayload) {
  if (!fcmRegistrationToken) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Token đăng ký FCM là bắt buộc');
  }

  const message = {
    token: fcmRegistrationToken,
    notification: {
      title: notificationPayload.title || 'Thông báo',
      body: notificationPayload.body || notificationPayload.message || '',
    },
    data: notificationPayload.data || {},
  };

  try {
    const response = await admin.messaging().send(message);
    logger.info('Notification sent successfully to single device', { messageId: response });
    return response;
  } catch (error) {
    logger.error('Error sending notification to client:', error);
    throw error;
  }
};

/**
 * Send notification to multiple client devices
 * @param {string[]} tokens - Array of FCM registration tokens
 * @param {Object} notificationPayload - Notification payload
 * @param {string} notificationPayload.title - Notification title
 * @param {string} notificationPayload.body - Notification body/message
 * @param {Object} [notificationPayload.data] - Additional data payload
 * @returns {Promise<Object>} - Multicast response with success/failure counts
 */
const sendNotificationToMultiClient = async function (tokens, notificationPayload) {
  if (!tokens || tokens.length === 0) {
    logger.warn('No FCM tokens provided for multicast');
    return { successCount: 0, failureCount: 0 };
  }

  const message = {
    tokens,
    notification: {
      title: notificationPayload.title || 'Thông báo',
      body: notificationPayload.body || notificationPayload.message || '',
    },
    data: notificationPayload.data || {},
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info('Notification sent to multiple devices', {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
    return response;
  } catch (error) {
    logger.error('Error sending notification to multiple clients:', error);
    throw error;
  }
};

module.exports = {
  sendNotificationToClient,
  sendNotificationToMultiClient,
};
