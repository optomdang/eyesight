const logger = require('../../config/logger');
const { User } = require('../../models');
const fcmService = require('./fcm.service');

/**
 * Send FCM notification to a specific user
 * @param {number} userId - User ID
 * @param {Object} notificationPayload - Notification payload
 * @param {string} notificationPayload.title - Notification title
 * @param {string} notificationPayload.body - Notification body/message
 * @param {Object} [notificationPayload.data] - Additional data payload
 * @returns {Promise<Object>} - Send result
 */
const sendNotificationToUser = async (userId, notificationPayload) => {
  try {
    // Find the user by their ID
    const user = await User.findByPk(userId, {
      attributes: ['id', 'fcmRegistrationToken'],
    });

    if (!user) {
      logger.warn('User not found for FCM notification', { userId });
      return { success: false, error: 'User not found' };
    }

    if (!user.fcmRegistrationToken) {
      logger.warn('User has no FCM token registered', { userId });
      return { success: false, error: 'No FCM token' };
    }

    // Send the notification to the user's device using the stored registration token
    await fcmService.sendNotificationToClient(user.fcmRegistrationToken, notificationPayload);
    logger.info('FCM notification sent successfully to user', { userId });

    return { success: true, userId };
  } catch (error) {
    logger.error('Error sending FCM notification to user', {
      error: error.message,
      userId,
    });
    return { success: false, error: error.message };
  }
};

/**
 * Send FCM notification to multiple users
 * @param {number[]} userIds - Array of user IDs
 * @param {Object} notificationPayload - Notification payload
 * @param {string} notificationPayload.title - Notification title
 * @param {string} notificationPayload.body - Notification body/message
 * @param {Object} [notificationPayload.data] - Additional data payload
 * @returns {Promise<Object>} - Multicast send result
 */
const sendNotificationToMultipleUsers = async (userIds, notificationPayload) => {
  try {
    // Find all users and collect their FCM tokens
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'fcmRegistrationToken'],
    });

    const tokens = users.filter((user) => user.fcmRegistrationToken).map((user) => user.fcmRegistrationToken);

    if (tokens.length === 0) {
      logger.warn('No users with FCM tokens found', { userIds });
      return { success: false, error: 'No FCM tokens found' };
    }

    // Send notification to multiple devices
    const response = await fcmService.sendNotificationToMultiClient(tokens, notificationPayload);
    logger.info('FCM notification sent to multiple users', {
      totalUsers: userIds.length,
      tokensFound: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return {
      success: true,
      totalUsers: userIds.length,
      tokensFound: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    logger.error('Error sending FCM notification to multiple users', {
      error: error.message,
      userIds,
    });
    return { success: false, error: error.message };
  }
};

/**
 * Send FCM notification to all users in a center
 * @param {number} centerId - Center ID
 * @param {Object} notificationPayload - Notification payload
 * @param {string} notificationPayload.title - Notification title
 * @param {string} notificationPayload.body - Notification body/message
 * @param {Object} [notificationPayload.data] - Additional data payload
 * @returns {Promise<Object>} - Multicast send result
 */
const sendNotificationToCenter = async (centerId, notificationPayload) => {
  try {
    // Find all users in the center
    const users = await User.findAll({
      where: { centerId },
      attributes: ['id', 'fcmRegistrationToken'],
    });

    const tokens = users.filter((user) => user.fcmRegistrationToken).map((user) => user.fcmRegistrationToken);

    if (tokens.length === 0) {
      logger.warn('No users with FCM tokens in center', { centerId });
      return { success: false, error: 'No FCM tokens found' };
    }

    // Send notification to multiple devices
    const response = await fcmService.sendNotificationToMultiClient(tokens, notificationPayload);
    logger.info('FCM notification sent to center users', {
      centerId,
      totalUsers: users.length,
      tokensFound: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return {
      success: true,
      centerId,
      totalUsers: users.length,
      tokensFound: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    logger.error('Error sending FCM notification to center', {
      error: error.message,
      centerId,
    });
    return { success: false, error: error.message };
  }
};

/**
 * Send FCM notification to users with specific role/permission
 * @param {number} centerId - Center ID
 * @param {string[]} permissions - Required permissions
 * @param {Object} notificationPayload - Notification payload
 * @returns {Promise<Object>} - Multicast send result
 */
const sendNotificationToUsersWithPermission = async (centerId, permissions, notificationPayload) => {
  try {
    const { Role } = require('../../models');

    // Find users with the specified permissions
    const users = await User.findAll({
      where: { centerId },
      attributes: ['id', 'fcmRegistrationToken', 'roleId'],
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'rights'],
          where: {
            rights: {
              $overlap: permissions, // PostgreSQL array overlap operator
            },
          },
        },
      ],
    });

    const tokens = users.filter((user) => user.fcmRegistrationToken).map((user) => user.fcmRegistrationToken);

    if (tokens.length === 0) {
      logger.warn('No users with FCM tokens and permissions', {
        centerId,
        permissions,
      });
      return { success: false, error: 'No FCM tokens found' };
    }

    // Send notification to multiple devices
    const response = await fcmService.sendNotificationToMultiClient(tokens, notificationPayload);
    logger.info('FCM notification sent to users with permission', {
      centerId,
      permissions,
      totalUsers: users.length,
      tokensFound: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return {
      success: true,
      centerId,
      permissions,
      totalUsers: users.length,
      tokensFound: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    logger.error('Error sending FCM notification to users with permission', {
      error: error.message,
      centerId,
      permissions,
    });
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotificationToUser,
  sendNotificationToMultipleUsers,
  sendNotificationToCenter,
  sendNotificationToUsersWithPermission,
};
