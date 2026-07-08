const nodemailer = require('nodemailer');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const logger = require('../config/logger');
const notificationTemplateService = require('./system/notificationTemplate.service');

const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email with timeout protection
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html - Optional HTML content (takes priority over text)
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text, html = null) => {
  const msg = { from: config.email.from, to, subject };

  // If HTML provided, use it; otherwise use text
  if (html) {
    msg.html = html;
  } else {
    msg.text = text;
  }

  // Add timeout protection to prevent hanging indefinitely
  const sendPromise = transport.sendMail(msg);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Email send timeout after 45 seconds')), 45000);
  });

  return Promise.race([sendPromise, timeoutPromise]);
};

/**
 * Send email using template
 * @param {string} to
 * @param {string} templateCode
 * @param {Object} variables
 * @param {number} centerId
 * @returns {Promise}
 */
const sendEmailWithTemplate = async (to, templateCode, variables = {}, centerId = null) => {
  try {
    const template = await notificationTemplateService.getNotificationTemplateByCode(templateCode, centerId);
    if (!template) {
      throw new ApiError(httpStatus.NOT_FOUND, `Không tìm thấy template email: ${templateCode}`);
    }

    const rendered = template.renderTemplate(variables);
    await sendEmail(to, rendered.subject, rendered.content);

    logger.info('Email sent with template', {
      to,
      templateCode,
      templateId: template.id,
    });
  } catch (error) {
    logger.error('Failed to send email with template', {
      error: error.message,
      to,
      templateCode,
    });
    throw error;
  }
};

/**
 * Send exam reminder email with template
 * @param {string} to
 * @param {Object} examData
 * @param {number} centerId
 * @returns {Promise}
 */
const sendExamReminderEmailWithTemplate = async (to, examData, centerId = null) => {
  return sendEmailWithTemplate(to, 'EXAM_REMINDER_EMAIL', examData, centerId);
};

/**
 * Send exam notification email with template
 * @param {string} to
 * @param {Object} examData
 * @param {string} type - 'start' or 'complete'
 * @param {number} centerId
 * @returns {Promise}
 */
const sendExamNotificationEmailWithTemplate = async (to, examData, type, centerId = null) => {
  const templateCode = type === 'start' ? 'EXAM_START_EMAIL' : 'EXAM_COMPLETE_EMAIL';
  return sendEmailWithTemplate(to, templateCode, examData, centerId);
};

/**
 * Send exercise reminder email with template
 * @param {string} to
 * @param {Object} exerciseData
 * @param {number} centerId
 * @returns {Promise}
 */
const sendExerciseReminderEmailWithTemplate = async (to, exerciseData, centerId = null) => {
  return sendEmailWithTemplate(to, 'EXERCISE_REMINDER_EMAIL', exerciseData, centerId);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset password';
  // replace this url with the link to the reset password page of your front-end app
  const resetPasswordUrl = `http://link-to-app/reset-password?token=${token}`;
  const text = `Dear user,
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, then ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
  const subject = 'Email Verification';
  // replace this url with the link to the email verification page of your front-end app
  const verificationEmailUrl = `http://link-to-app/verify-email?token=${token}`;
  const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send exam reminder email
 * @param {string} to
 * @param {Object} examData
 * @returns {Promise}
 */
const sendExamReminderEmail = async (to, examData) => {
  const { patientName, examCode, examDate, examTime, clinicName, doctorName } = examData;
  const subject = 'Nhắc nhở lịch kiểm tra mắt - Eye Sight Service';

  const text = `Kính gửi ${patientName},

Đây là thông báo nhắc nhở về lịch kiểm tra mắt của bạn:

Mã phiên kiểm tra: ${examCode}
Ngày kiểm tra: ${examDate}
Thời gian: ${examTime}
Phòng khám: ${clinicName}
Bác sĩ phụ trách: ${doctorName}

Vui lòng có mặt đúng giờ để thực hiện kiểm tra. Nếu có thay đổi, xin liên hệ trước với phòng khám.

Trân trọng,
Eye Sight Service Team`;

  await sendEmail(to, subject, text);
};

/**
 * Send exam notification email (start/complete)
 * @param {string} to
 * @param {Object} examData
 * @param {string} type - 'start' or 'complete'
 * @returns {Promise}
 */
const sendExamNotificationEmail = async (to, examData, type) => {
  const { patientName, examCode, examDate, results } = examData;

  let subject;
  let text;

  if (type === 'start') {
    subject = 'Bắt đầu phiên kiểm tra - Eye Sight Service';
    text = `Kính gửi ${patientName},

Phiên kiểm tra mắt của bạn đã được bắt đầu:

Mã phiên kiểm tra: ${examCode}
Ngày kiểm tra: ${examDate}

Chúc bạn hoàn thành tốt bài kiểm tra!

Trân trọng,
Eye Sight Service Team`;
  } else if (type === 'complete') {
    subject = 'Hoàn thành phiên kiểm tra - Eye Sight Service';
    text = `Kính gửi ${patientName},

Phiên kiểm tra mắt của bạn đã hoàn thành:

Mã phiên kiểm tra: ${examCode}
Ngày kiểm tra: ${examDate}
Kết quả: ${results || 'Đang được xử lý'}

Cảm ơn bạn đã tham gia kiểm tra. Kết quả chi tiết sẽ được gửi sau khi bác sĩ đánh giá.

Trân trọng,
Eye Sight Service Team`;
  }

  await sendEmail(to, subject, text);
};

/**
 * Send exercise reminder email to patient
 * @param {string} to - Recipient email
 * @param {Object} exerciseData - Exercise data
 * @returns {Promise}
 */
const sendExerciseReminderEmail = async (to, exerciseData) => {
  const subject = 'Nhắc nhở thực hiện bài tập thị lực';

  let html = `
    <h2>Xin chào ${exerciseData.patientName},</h2>

    <p>Đây là lời nhắc thực hiện bài tập thị lực của bạn:</p>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #0066cc; margin-top: 0;">Thông tin bài tập:</h3>
      <p><strong>Tên bài tập:</strong> ${exerciseData.exerciseName}</p>
      ${exerciseData.exerciseDescription ? `<p><strong>Mô tả:</strong> ${exerciseData.exerciseDescription}</p>` : ''}
      <p><strong>Thời gian nhắc:</strong> ${exerciseData.reminderTime}</p>
    </div>`;

  if (exerciseData.customMessage) {
    html += `
    <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h4 style="color: #856404;">Thông báo đặc biệt:</h4>
      <p style="color: #856404; margin-bottom: 0;">${exerciseData.customMessage}</p>
    </div>`;
  }

  html += `
    <div style="margin: 30px 0;">
      <p>Vui lòng thực hiện bài tập theo đúng hướng dẫn để đạt hiệu quả tốt nhất cho việc điều trị.</p>
      <p style="color: #666; font-size: 14px;">
        <em>Lưu ý: Nếu bạn có bất kỳ thắc mắc nào về bài tập, vui lòng liên hệ với bác sĩ của bạn.</em>
      </p>
    </div>

    <p>Trân trọng,<br>
    Đội ngũ chăm sóc sức khỏe thị lực</p>
  `;

  await sendEmail(to, subject, html);
};

/**
 * Send exercise completion notification email
 * @param {string} to - Recipient email
 * @param {Object} exerciseData - Exercise completion data
 * @returns {Promise}
 */
const sendExerciseCompletionEmail = async (to, exerciseData) => {
  const subject = 'Chúc mừng! Bạn đã hoàn thành bài tập';

  const html = `
    <h2>Xin chào ${exerciseData.patientName},</h2>

    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
      <h3 style="color: #155724; margin-top: 0;">Chúc mừng bạn!</h3>
      <p style="color: #155724;">Bạn đã hoàn thành thành công bài tập: <strong>${exerciseData.exerciseName}</strong></p>
      <p style="color: #155724;">Thời gian hoàn thành: ${exerciseData.completionTime}</p>
      ${exerciseData.score ? `<p style="color: #155724;">Điểm số: <strong>${exerciseData.score}</strong></p>` : ''}
    </div>

    <p>Việc thực hiện đều đặn các bài tập sẽ giúp cải thiện thị lực của bạn. Hãy tiếp tục duy trì!</p>

    <p>Trân trọng,<br>
    Đội ngũ chăm sóc sức khỏe thị lực</p>
  `;

  await sendEmail(to, subject, html);
};

module.exports = {
  transport,
  sendEmail,
  sendEmailWithTemplate,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendExamReminderEmail,
  sendExamReminderEmailWithTemplate,
  sendExamNotificationEmail,
  sendExamNotificationEmailWithTemplate,
  sendExerciseReminderEmail,
  sendExerciseReminderEmailWithTemplate,
  sendExerciseCompletionEmail,
};
