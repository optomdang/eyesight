const catchAsync = require('../../utils/catchAsync');
const { auditLogService } = require('../../services');

const getAuditLogs = catchAsync(async (req, res) => {
  const data = await auditLogService.getAuditLogs(
    {
      centerId: req.user.centerId,
      action: req.query.action,
      status: req.query.status,
      actorUserId: req.query.actorUserId,
      actorUserType: req.query.actorUserType,
      entityType: req.query.entityType,
      entityId: req.query.entityId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    },
    {
      includeActorUser: req.query.includeActorUser,
      sortBy: req.query.sortBy,
      order: req.query.order,
      limit: req.query.limit,
      page: req.query.page,
    }
  );

  res.send(data);
});

module.exports = {
  getAuditLogs,
};
