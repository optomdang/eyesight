const axios = require('axios');
const config = require('../config/config');
const logger = require('../config/logger');

/**
 * Send message via Zalo OA (Official Account)
 * @param {string} userId - Zalo user ID
 * @param {Object} messageData - Message content
 * @returns {Promise}
 */
const sendZaloMessage = async (userId, messageData) => {
  try {
    if (!config.zalo || !config.zalo.accessToken) {
      logger.warn('Zalo access token not configured');
      return;
    }

    const response = await axios.post(
      'https://openapi.zalo.me/v2.0/oa/message',
      {
        recipient: {
          user_id: userId,
        },
        message: messageData,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          access_token: config.zalo.accessToken,
        },
      }
    );

    logger.info('Zalo message sent successfully', { userId, response: response.data });
    return response.data;
  } catch (error) {
    logger.error('Failed to send Zalo message', { error: error.message, userId });
    throw error;
  }
};

/**
 * Send exam reminder via Zalo
 * @param {string} userId - Zalo user ID
 * @param {Object} examData - Exam information
 * @returns {Promise}
 */
const sendExamReminderZalo = async (userId, examData) => {
  const { patientName, examCode, examDate, examTime, clinicName, doctorName } = examData;

  const messageData = {
    text: `NHẮC NHỞ LỊCH KIỂM TRA MẮT

Xin chào ${patientName}!

Mã phiên: ${examCode}
Ngày: ${examDate}
Giờ: ${examTime}
Phòng khám: ${clinicName}
Bác sĩ: ${doctorName}

Vui lòng có mặt đúng giờ.`,
  };

  return sendZaloMessage(userId, messageData);
};

/**
 * Send exam notification via Zalo
 * @param {string} userId - Zalo user ID
 * @param {Object} examData - Exam information
 * @param {string} type - 'start' or 'complete'
 * @returns {Promise}
 */
const sendExamNotificationZalo = async (userId, examData, type) => {
  const { patientName, examCode, examDate, results } = examData;

  let messageData;

  if (type === 'start') {
    messageData = {
      text: `BẮT ĐẦU KIỂM TRA

Xin chào ${patientName}!

Phiên kiểm tra của bạn đã bắt đầu:
Mã phiên: ${examCode}
Ngày: ${examDate}

Chúc bạn thành công.`,
    };
  } else if (type === 'complete') {
    messageData = {
      text: `HOÀN THÀNH KIỂM TRA

Xin chào ${patientName}!

Bạn đã hoàn thành phiên kiểm tra:
Mã phiên: ${examCode}
Ngày: ${examDate}
Kết quả: ${results || 'Đang xử lý'}

Cảm ơn bạn.`,
    };
  }

  return sendZaloMessage(userId, messageData);
};

/**
 * Send template message via Zalo (for more advanced messages)
 * @param {string} userId - Zalo user ID
 * @param {string} templateId - Template ID
 * @param {Object} templateData - Template data
 * @returns {Promise}
 */
const sendZaloTemplate = async (userId, templateId, templateData) => {
  try {
    if (!config.zalo || !config.zalo.accessToken) {
      logger.warn('Zalo access token not configured');
      return;
    }

    const response = await axios.post(
      'https://openapi.zalo.me/v2.0/oa/message',
      {
        recipient: {
          user_id: userId,
        },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: templateId,
              elements: [templateData],
            },
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          access_token: config.zalo.accessToken,
        },
      }
    );

    logger.info('Zalo template message sent successfully', { userId, templateId, response: response.data });
    return response.data;
  } catch (error) {
    logger.error('Failed to send Zalo template message', { error: error.message, userId, templateId });
    throw error;
  }
};

/**
 * Send exercise reminder via Zalo
 * @param {string} zaloUserId - Zalo User ID
 * @param {Object} exerciseData - Exercise data
 * @returns {Promise}
 */
const sendExerciseReminderZalo = async (zaloUserId, exerciseData) => {
  let message = `NHẮC NHỞ THỰC HIỆN BÀI TẬP\n\n`;
  message += `Xin chào ${exerciseData.patientName}!\n\n`;
  message += `Tên bài tập: ${exerciseData.exerciseName}\n`;

  if (exerciseData.exerciseDescription) {
    message += `Mô tả: ${exerciseData.exerciseDescription}\n`;
  }

  message += `Thời gian nhắc: ${exerciseData.reminderTime}\n\n`;

  if (exerciseData.customMessage) {
    message += `Thông báo đặc biệt:\n${exerciseData.customMessage}\n\n`;
  }

  message += `Vui lòng thực hiện bài tập theo đúng hướng dẫn để đạt hiệu quả tốt nhất.\n\n`;
  message += `Nếu có thắc mắc, vui lòng liên hệ với bác sĩ của bạn.`;

  return sendZaloMessage(zaloUserId, message);
};

/**
 * Send exercise completion notification via Zalo
 * @param {string} zaloUserId - Zalo User ID
 * @param {Object} exerciseData - Exercise completion data
 * @returns {Promise}
 */
const sendExerciseCompletionZalo = async (zaloUserId, exerciseData) => {
  let message = `BẠN ĐÃ HOÀN THÀNH BÀI TẬP\n\n`;
  message += `Xin chào ${exerciseData.patientName}!\n\n`;
  message += `Bài tập: ${exerciseData.exerciseName}\n`;
  message += `Hoàn thành lúc: ${exerciseData.completionTime}\n`;

  if (exerciseData.score) {
    message += `Điểm số: ${exerciseData.score}\n`;
  }

  message += `\nViệc thực hiện đều đặn các bài tập sẽ giúp cải thiện thị lực của bạn. Hãy tiếp tục duy trì.`;

  return sendZaloMessage(zaloUserId, message);
};

/**
 * Send text message via Zalo (helper for template rendering)
 * @param {string} userId - Zalo user ID
 * @param {string} text - Message text
 * @returns {Promise}
 */
const sendZaloText = async (userId, text) => {
  const messageData = { text };
  return sendZaloMessage(userId, messageData);
};

module.exports = {
  sendZaloMessage,
  sendZaloText,
  sendExamReminderZalo,
  sendExamNotificationZalo,
  sendZaloTemplate,
  sendExerciseReminderZalo,
  sendExerciseCompletionZalo,
};
