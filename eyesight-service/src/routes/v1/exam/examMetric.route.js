const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const allRights = require('../../../config/rights');
const { examMetricValidation } = require('../../../validations');
const { examMetricController } = require('../../../controllers');

const router = express.Router();

router
  .route('/')
  .post(
    auth(allRights.manageExamResults.code),
    validate(examMetricValidation.createExamMetric),
    injectData('body'),
    examMetricController.createExamMetric
  )
  .get(
    auth(allRights.getExamResults.code),
    validate(examMetricValidation.getExamResults),
    injectData('query'),
    examMetricController.getExamMetrics
  );

router
  .route('/:metricId')
  .get(auth(allRights.getExamResults.code), validate(examMetricValidation.getExamMetric), examMetricController.getExamMetric)
  .patch(
    auth(allRights.manageExamResults.code),
    validate(examMetricValidation.updateExamMetric),
    injectData('body'),
    examMetricController.updateExamMetric
  )
  .delete(
    auth(allRights.manageExamResults.code),
    validate(examMetricValidation.deleteExamMetric),
    injectData('body'),
    examMetricController.deleteExamMetric
  );

router
  .route('/exam-result/:examResultId')
  .get(
    auth(allRights.getExamResults.code),
    validate(examMetricValidation.getExamMetricsByExamResult),
    examMetricController.getExamMetricsByExamResult
  );

module.exports = router;
