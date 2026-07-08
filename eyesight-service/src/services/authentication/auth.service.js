// src/services/auth.service.js
const httpStatus = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const emailService = require('../email.service');
const auditLogService = require('../system/auditLog.service');
const { Token } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { tokenTypes } = require('../../config/tokens');

const isUserActive = (user) => user?.active === true;

const loginUserWithEmailAndPassword = async (email, password, requestContext = {}) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    await auditLogService.logAuthEvent({
      user,
      email,
      status: 'failed',
      requestContext,
      metadata: {
        reason: 'invalid_credentials',
      },
    });
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email hoặc mật khẩu không đúng');
  }

  if (!isUserActive(user)) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Tài khoản đã bị khóa hoặc không hoạt động');
  }

  // Update lastLoginAt timestamp
  const loginTime = new Date();
  await user.update({ lastLoginAt: loginTime });

  await auditLogService.logAuthEvent({
    user,
    email,
    status: 'success',
    requestContext,
    metadata: {
      loginAt: loginTime.toISOString(),
    },
  });

  return user;
};

const logout = async (refreshToken, { user = null, requestContext = {} } = {}) => {
  const refreshTokenDoc = await Token.findOne({
    where: { token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false },
    rejectOnEmpty: true,
  }).catch((err) => {
    if (err.name === 'SequelizeEmptyResultError') {
      throw new ApiError(httpStatus.NOT_FOUND, 'Refresh token không tồn tại');
    }
    throw err;
  });
  await refreshTokenDoc.destroy();

  await auditLogService.logEntityAuditEvent({
    user,
    requestContext,
    action: 'auth.logout',
    entityType: 'user',
    entityId: user?.id || null,
  });
};

const refreshAuth = async (refreshToken) => {
  const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
  const user = await userService.getUserById(refreshTokenDoc.userId);

  if (!user) {
    await refreshTokenDoc.destroy();
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Phiên đăng nhập không hợp lệ');
  }

  if (!isUserActive(user)) {
    // Invalidate the refresh token so the inactive user cannot retry indefinitely.
    await refreshTokenDoc.destroy();
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Tài khoản đã bị khóa hoặc không hoạt động');
  }

  await refreshTokenDoc.destroy();
  return tokenService.generateAuthTokens(user);
};

const requestPasswordReset = async (email, { requestContext = {} } = {}) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(email);
  await emailService.sendResetPasswordEmail(email, resetPasswordToken);

  await auditLogService.logEntityAuditEvent({
    requestContext,
    action: 'auth.passwordReset.request',
    entityType: 'user',
    metadata: {
      email,
    },
  });
};

const resetPassword = async (resetPasswordToken, newPassword, { requestContext = {} } = {}) => {
  const resetTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
  const user = await userService.getUserById(resetTokenDoc.userId);
  await userService.updateUserById(user.id, { password: newPassword });
  await Token.destroy({ where: { userId: user.id, type: tokenTypes.RESET_PASSWORD } });

  await auditLogService.logEntityAuditEvent({
    requestContext,
    action: 'auth.passwordReset.confirm',
    entityType: 'user',
    entityId: user.id,
  });
};

const sendVerificationEmail = async (user, { requestContext = {} } = {}) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
  await emailService.sendVerificationEmail(user.email, verifyEmailToken);

  await auditLogService.logEntityAuditEvent({
    user,
    requestContext,
    action: 'auth.emailVerification.send',
    entityType: 'user',
    entityId: user.id,
    metadata: {
      email: user.email,
    },
  });
};

const verifyEmail = async (verifyEmailToken, { requestContext = {} } = {}) => {
  const emailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
  const user = await userService.getUserById(emailTokenDoc.userId);
  await Token.destroy({ where: { userId: user.id, type: tokenTypes.VERIFY_EMAIL } });
  await userService.updateUserById(user.id, { isEmailVerified: true });

  await auditLogService.logEntityAuditEvent({
    requestContext,
    action: 'auth.emailVerification.confirm',
    entityType: 'user',
    entityId: user.id,
  });
};

module.exports = {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
};
