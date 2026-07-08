// src/services/token.service.js
const jwt = require('jsonwebtoken');
const moment = require('moment');
const httpStatus = require('http-status');
const config = require('../../config/config');
const { Token, User } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { tokenTypes } = require('../../config/tokens');

const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

const saveToken = async (token, userId, expires, type, blacklisted = false) => {
  const tokenDoc = await Token.create({
    token,
    userId,
    expires: expires.toDate(),
    type,
    blacklisted,
  });
  return tokenDoc;
};

const verifyToken = async (token, type) => {
  const tokenDoc = await Token.findOne({
    where: { token, type, blacklisted: false },
    rejectOnEmpty: true,
  }).catch((err) => {
    if (err.name === 'SequelizeEmptyResultError') {
      throw new ApiError(httpStatus.NOT_FOUND, 'Token không tồn tại hoặc không hợp lệ');
    }
    throw err;
  });
  const expires = moment(tokenDoc.expires);
  if (expires.isBefore(moment())) {
    await tokenDoc.destroy();
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Token đã hết hạn');
  }
  return tokenDoc;
};

const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);
  await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

  return {
    access: { token: accessToken, expires: accessTokenExpires.toDate() },
    refresh: { token: refreshToken, expires: refreshTokenExpires.toDate() },
  };
};

const generateResetPasswordToken = async (email) => {
  const user = await User.findOne({ where: { email }, rejectOnEmpty: true }).catch((err) => {
    if (err.name === 'SequelizeEmptyResultError') {
      throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy người dùng với email này');
    }
    throw err;
  });
  const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken(user.id, expires, tokenTypes.RESET_PASSWORD);
  await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD);
  return resetPasswordToken;
};

const generateVerifyEmailToken = async (user) => {
  const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
  const verifyEmailToken = generateToken(user.id, expires, tokenTypes.VERIFY_EMAIL);
  await saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL);
  return verifyEmailToken;
};

module.exports = {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
};
