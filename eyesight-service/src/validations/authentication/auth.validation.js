const Joi = require('joi');
const { password } = require('../custom.validation');
const { standardId, standardString, standardContact, standardTenantFields } = require('../../utils/validation');

// Register validation - all mandatory fields required
const register = {
  body: Joi.object().keys({
    email: standardContact.email,
    password: Joi.string().required().custom(password),
    name: standardString.name,
    roleId: standardId,
    phoneNumber: standardContact.phoneNumber,
    centerId: standardTenantFields.centerId,
  }),
};

// Login validation - email and password required
const login = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

// Logout validation - refresh token required
const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

// Refresh tokens validation - refresh token required
const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

// Forgot password validation - email required
const forgotPassword = {
  body: Joi.object().keys({
    email: standardContact.email,
  }),
};

// Reset password validation - token and new password required
const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
  }),
};

// Verify email validation - token required
const verifyEmail = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
