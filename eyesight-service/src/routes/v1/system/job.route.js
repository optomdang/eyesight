const express = require('express');
const validate = require('../../../middlewares/validate');
const jobValidation = require('../../../validations/system/job.validation');
const jobController = require('../../../controllers/system/job.controller');

const router = express.Router();

// NOTE: Intentionally non-auth, mounted only in development (see routes/v1/index.js).
router.route('/').get(validate(jobValidation.listJobs), jobController.listJobs);
router.route('/run').post(validate(jobValidation.runJobs), jobController.runJobs);
router.route('/history').get(validate(jobValidation.getScheduleHistory), jobController.getScheduleHistory);

module.exports = router;
