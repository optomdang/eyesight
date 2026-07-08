const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const { authService, userService, tokenService, auditLogService } = require('../../services');

const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const requestContext = auditLogService.buildRequestContext(req);
  const user = await authService.loginUserWithEmailAndPassword(email, password, requestContext);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken, {
    user: req.user,
    requestContext: auditLogService.buildRequestContext(req),
  });
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  await authService.requestPasswordReset(req.body.email, {
    requestContext: auditLogService.buildRequestContext(req),
  });
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password, {
    requestContext: auditLogService.buildRequestContext(req),
  });
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  await authService.sendVerificationEmail(req.user, {
    user: req.user,
    requestContext: auditLogService.buildRequestContext(req),
  });
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token, {
    requestContext: auditLogService.buildRequestContext(req),
  });
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
};
