const express = require('express');
const allRights = require('../../../config/rights');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const { examAssignmentValidation } = require('../../../validations');
const { examAssignmentController } = require('../../../controllers');

const router = express.Router();

// Exam assignments CRUD
router
  .route('/')
  .post(
    auth(allRights.manageExamAssignments.code),
    validate(examAssignmentValidation.createExamAssignment),
    injectData('body'),
    examAssignmentController.createExamAssignment
  )
  .get(
    auth(allRights.getExamAssignments.code),
    validate(examAssignmentValidation.getExamAssignments),
    examAssignmentController.getExamAssignments
  );

router
  .route('/:configId')
  .get(
    auth(allRights.getExamAssignments.code),
    validate(examAssignmentValidation.getExamAssignment),
    examAssignmentController.getExamAssignment
  )
  .patch(
    auth(allRights.manageExamAssignments.code),
    validate(examAssignmentValidation.updateExamAssignment),
    injectData('body'),
    examAssignmentController.updateExamAssignment
  )
  .delete(
    auth(allRights.manageExamAssignments.code),
    validate(examAssignmentValidation.deleteExamAssignment),
    injectData('body'),
    examAssignmentController.deleteExamAssignment
  );

module.exports = router;
