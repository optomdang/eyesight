const { Op } = require('sequelize');
const logger = require('../../config/logger');
const { AuditLog, User } = require('../../models');
const { sanitizePagination, buildPagination } = require('../../utils/query');

const normalizeIpAddress = (ipAddress) => {
  if (!ipAddress || typeof ipAddress !== 'string') {
    return null;
  }

  return ipAddress.replace(/^::ffff:/, '');
};

const extractClientIp = (req = {}) => {
  const forwardedFor = req.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return normalizeIpAddress(forwardedFor.split(',')[0].trim());
  }

  return normalizeIpAddress(req.ip || req.socket?.remoteAddress || null);
};

const buildRequestContext = (req = {}) => ({
  ipAddress: extractClientIp(req),
  userAgent: req.get?.('user-agent') || req.headers?.['user-agent'] || null,
  requestMethod: req.method || null,
  requestPath: req.originalUrl || req.path || null,
});

const logAuditEventSafe = async (payload) => {
  try {
    return await AuditLog.create({
      centerId: payload.centerId ?? null,
      actorUserId: payload.actorUserId ?? null,
      actorUserType: payload.actorUserType ?? null,
      action: payload.action,
      status: payload.status ?? 'success',
      entityType: payload.entityType ?? null,
      entityId: payload.entityId !== null && payload.entityId !== undefined ? String(payload.entityId) : null,
      ipAddress: payload.ipAddress ?? null,
      userAgent: payload.userAgent ?? null,
      requestMethod: payload.requestMethod ?? null,
      requestPath: payload.requestPath ?? null,
      metadata: payload.metadata ?? {},
      occurredAt: payload.occurredAt ?? new Date(),
    });
  } catch (error) {
    logger.error('Failed to write audit log', {
      action: payload.action,
      status: payload.status,
      message: error.message,
    });
    return null;
  }
};

const logAuthEvent = async ({ user = null, email = null, status = 'success', requestContext = {}, metadata = {} }) => {
  return logAuditEventSafe({
    centerId: user?.centerId || metadata.centerId || null,
    actorUserId: user?.id || null,
    actorUserType: user?.userType || metadata.actorUserType || null,
    action: 'auth.login',
    status,
    entityType: 'user',
    entityId: user?.id || null,
    ipAddress: requestContext.ipAddress || null,
    userAgent: requestContext.userAgent || null,
    requestMethod: requestContext.requestMethod || null,
    requestPath: requestContext.requestPath || null,
    metadata: {
      ...(email ? { email } : {}),
      ...metadata,
    },
  });
};

const logEntityAuditEvent = async (params = {}) => {
  try {
    const {
      user = null,
      actorUserId = null,
      actorUserType = null,
      requestContext = {},
      action,
      status = 'success',
      entityType,
      entityId = null,
      centerId = null,
      metadata = {},
    } = params;
    return await logAuditEventSafe({
      centerId: centerId ?? user?.centerId ?? metadata.centerId ?? null,
      actorUserId: actorUserId ?? user?.id ?? null,
      actorUserType: actorUserType ?? user?.userType ?? null,
      action,
      status,
      entityType,
      entityId,
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      requestMethod: requestContext.requestMethod || null,
      requestPath: requestContext.requestPath || null,
      metadata,
    });
  } catch (error) {
    logger.error('logEntityAuditEvent failed silently', {
      action: params?.action,
      entityType: params?.entityType,
      message: error.message,
    });
    return null;
  }
};

const getAuditLogs = async (
  { centerId, action, status, actorUserId, actorUserType, entityType, entityId, startDate, endDate },
  { includeActorUser = true, sortBy = 'occurredAt', order = 'DESC', limit = 50, page = 1 } = {}
) => {
  const { limit: finalLimit, page: finalPage, offset } = sanitizePagination(limit, page, 1000);
  const whereClause = {};

  if (centerId !== undefined && centerId !== null) {
    whereClause.centerId = centerId;
  }
  if (action) {
    whereClause.action = action;
  }
  if (status) {
    whereClause.status = status;
  }
  if (actorUserId) {
    whereClause.actorUserId = actorUserId;
  }
  if (actorUserType) {
    whereClause.actorUserType = actorUserType;
  }
  if (entityType) {
    whereClause.entityType = entityType;
  }
  if (entityId !== undefined && entityId !== null) {
    whereClause.entityId = String(entityId);
  }
  if (startDate || endDate) {
    whereClause.occurredAt = {};
    if (startDate) {
      whereClause.occurredAt[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      whereClause.occurredAt[Op.lte] = endOfDay;
    }
  }

  const include = includeActorUser
    ? [
        {
          model: User,
          as: 'actorUser',
          attributes: ['id', 'name', 'email', 'userType'],
          required: false,
        },
      ]
    : [];

  const result = await AuditLog.findAndCountAll({
    where: whereClause,
    include,
    limit: finalLimit,
    offset,
    order: [[sortBy, order]],
  });

  return {
    rows: result.rows,
    count: result.count,
    ...buildPagination(result.count, finalLimit, finalPage),
  };
};

module.exports = {
  buildRequestContext,
  logAuthEvent,
  logEntityAuditEvent,
  getAuditLogs,
};
