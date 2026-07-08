const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const auditLogValidation = require('../../../validations/system/auditLog.validation');
const auditLogController = require('../../../controllers/system/auditLog.controller');
const allRights = require('../../../config/rights');

const router = express.Router();

router
  .route('/')
  .get(auth(allRights.getAuditLogs.code), validate(auditLogValidation.getAuditLogs), auditLogController.getAuditLogs);

module.exports = router;
