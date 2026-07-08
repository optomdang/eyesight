const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Middleware to restrict user type creation based on permissions
 *
 * Permission Logic:
 * - manageUsers: Can create ANY user type (admin, doctor, patient)
 * - managePatients: Can create PATIENT users only (because managing patients requires creating their user accounts)
 * - manageDoctors: Can create DOCTOR users only (because managing doctors requires creating their user accounts)
 *
 * This allows domain-specific permissions without needing separate "managePatientUsers" permission.
 */
const validateUserType = (req, res, next) => {
  const { userType } = req.body;

  // Skip validation if no userType specified (will be caught by validation layer)
  if (!userType) {
    return next();
  }

  const userRights = req.user?.role?.rights || [];

  // If user has full manageUsers permission, allow everything
  if (userRights.includes('manageUsers')) {
    return next();
  }

  // If creating patient user, check for managePatients permission
  if (userType === 'patient') {
    if (userRights.includes('managePatients')) {
      return next();
    }
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền tạo tài khoản bệnh nhân');
  }

  // If creating doctor user, check for manageDoctors permission
  if (userType === 'doctor') {
    if (userRights.includes('manageDoctors')) {
      return next();
    }
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền tạo tài khoản bác sĩ');
  }

  // For any other user type (admin, etc.), require manageUsers
  throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền tạo loại tài khoản này');
};

module.exports = validateUserType;
