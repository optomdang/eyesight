const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const { patientService, userService } = require('../../services');

/**
 * Normalize phone number to standard format
 */
const normalizePhoneNumber = (phone) => {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');

  // Convert to Vietnamese format
  if (normalized.startsWith('84')) {
    normalized = `0${normalized.substring(2)}`;
  } else if (normalized.startsWith('+84')) {
    normalized = `0${normalized.substring(3)}`;
  } else if (!normalized.startsWith('0')) {
    normalized = `0${normalized}`;
  }

  return normalized;
};

/**
 * Link patient with Zalo User ID using phone number
 */
const linkPatientWithZaloId = async (phoneNumber, zaloUserId) => {
  try {
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Tìm user bằng số điện thoại
    const user = await userService.getUserByPhone(normalizedPhone);

    if (user && user.patient) {
      // Cập nhật Zalo User ID cho patient
      await patientService.updatePatientById(user.patient.id, {
        zaloUserId,
      });

      logger.info('Patient linked with Zalo ID', {
        patientId: user.patient.id,
        phoneNumber: normalizedPhone,
        zaloUserId,
      });

      return true;
    }
    logger.warn('No patient found for phone number', { phoneNumber: normalizedPhone });
    return false;
  } catch (error) {
    logger.error('Error linking patient with Zalo ID', {
      error: error.message,
      phoneNumber,
      zaloUserId,
    });
    return false;
  }
};

/**
 * Handle Zalo webhook events
 */
const handleZaloWebhook = catchAsync(async (req, res) => {
  const { event_name: eventName, sender, recipient, message } = req.body;

  logger.info('Zalo webhook received', { eventName, sender, recipient });

  try {
    if (eventName === 'user_send_text' || eventName === 'follow') {
      const zaloUserId = sender.id;

      // Nếu có message chứa số điện thoại, cố gắng link với patient
      if (message && message.text) {
        const phoneMatch = message.text.match(/(\+84|84|0)?([0-9]{9,10})/);
        if (phoneMatch) {
          const phoneNumber = phoneMatch[0];
          await linkPatientWithZaloId(phoneNumber, zaloUserId);
        }
      }

      // Response để Zalo biết đã nhận được
      res.send({
        message: 'Webhook processed',
      });
    }
  } catch (error) {
    logger.error('Error processing Zalo webhook', { error: error.message });
    res.send({ error: 'Processing failed' }); // Vẫn return 200 để Zalo không retry
  }
});

/**
 * Manual link patient with Zalo ID
 */
const linkPatientZalo = catchAsync(async (req, res) => {
  const { patientId } = req.params;
  const { zaloUserId, phoneNumber } = req.body;

  let linkResult = false;

  if (zaloUserId) {
    // Trực tiếp link bằng Zalo User ID
    await patientService.updatePatientById(patientId, { zaloUserId });
    linkResult = true;
  } else if (phoneNumber) {
    // Link bằng số điện thoại (cần có sẵn mapping)
    linkResult = await linkPatientWithZaloId(phoneNumber, 'pending');
  }

  res.send({
    success: linkResult,
    message: linkResult ? 'Patient linked successfully' : 'Failed to link patient',
  });
});

/**
 * Get patient Zalo info
 */
const getPatientZaloInfo = catchAsync(async (req, res) => {
  const { patientId } = req.params;

  const patient = await patientService.getPatientById(patientId);

  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }

  res.send({
    patientId,
    zaloUserId: patient.zaloUserId,
    hasZaloConnection: !!patient.zaloUserId,
  });
});

module.exports = {
  handleZaloWebhook,
  linkPatientZalo,
  getPatientZaloInfo,
  linkPatientWithZaloId,
  normalizePhoneNumber,
};
