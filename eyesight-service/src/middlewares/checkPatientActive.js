const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Patient } = require('../models');

/**
 * Middleware to check if a patient is currently in treatment (treatmentStatus === 'active').
 * Blocks non-active patients from accessing treatment-related endpoints.
 *
 * Business Rule (P4 — treatmentStatus is a STRING enum):
 * - Only 'active' patients may access treatment features (exercises, exams, sessions, results).
 * - 'paused' | 'not_started' | 'completed' are all blocked.
 * - Profile and notification endpoints remain accessible.
 *
 * Usage:
 * Add after auth() middleware and before validate() on patient portal treatment routes
 *
 * Example:
 * router.get('/assignments',
 *   auth(allRights.manageOwnExercises.code),
 *   checkPatientActive,  // Add here
 *   validate(validation.getMyAssignments),
 *   controller.getMyAssignments
 * );
 *
 * @throws {ApiError} 403 if patient is not in treatment (treatmentStatus !== 'active')
 * @throws {ApiError} 404 if patient record not found for patient user
 */
const checkPatientActive = async (req, res, next) => {
  try {
    // Skip check if user is not a patient
    // Doctors and admins should not be blocked
    if (req.user?.userType !== 'patient') {
      return next();
    }

    // Query patient record with treatmentStatus
    // Use minimal attributes for performance
    const patient = await Patient.findOne({
      where: {
        userId: req.user.id,
        deleted: false,
      },
      attributes: ['id', 'treatmentStatus', 'doctorId'],
    });

    // Patient record should exist for patient users
    // This is a data integrity issue if not found
    if (!patient) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Thông tin bệnh nhân không tồn tại');
    }

    // Chỉ cho phép khi đang điều trị (status='active'). paused/not_started/completed → chặn (P4).
    if (patient.treatmentStatus !== 'active') {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Tài khoản của bạn hiện không trong liệu trình điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ.'
      );
    }

    // Cache patient record for controllers to avoid duplicate queries
    // Controllers can access req.patient instead of querying again
    req.patient = patient;

    next();
  } catch (error) {
    // Propagate error to error handling middleware
    next(error);
  }
};

module.exports = checkPatientActive;
