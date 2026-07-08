/**
 * Exercise Compliance Routes
 * Routes for frequency-based compliance tracking and notifications
 */

const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const allRights = require('../../../config/rights');
const exerciseComplianceController = require('../../../controllers/exercise/exerciseCompliance.controller');
const { exerciseComplianceValidation } = require('../../../validations');

const router = express.Router();

// Compliance summary and analytics
router
  .route('/summary')
  .get(
    auth(allRights.getExercises.code),
    validate(exerciseComplianceValidation.getComplianceSummary),
    injectData('query'),
    exerciseComplianceController.getComplianceSummary
  );

router
  .route('/analytics')
  .get(
    auth(allRights.getExercises.code),
    validate(exerciseComplianceValidation.getComplianceAnalytics),
    injectData('query'),
    exerciseComplianceController.getComplianceAnalytics
  );

// Overdue assignments management
router
  .route('/overdue')
  .get(
    auth(allRights.getExercises.code),
    validate(exerciseComplianceValidation.getOverdueAssignments),
    injectData('query'),
    exerciseComplianceController.getOverdueAssignments
  );

// Bulk compliance operations
router
  .route('/update-all')
  .post(
    auth(allRights.manageExercises.code),
    validate(exerciseComplianceValidation.updateAllCompliance),
    exerciseComplianceController.updateAllCompliance
  );

router
  .route('/send-reminders')
  .post(
    auth(allRights.manageExercises.code),
    validate(exerciseComplianceValidation.sendReminders),
    injectData('body'),
    exerciseComplianceController.sendReminders
  );

// Individual assignment compliance management
router
  .route('/assignments/:assignmentId/pause')
  .post(
    auth(allRights.manageExercises.code),
    validate(exerciseComplianceValidation.pauseAssignment),
    injectData('body'),
    exerciseComplianceController.pauseAssignment
  );

router
  .route('/assignments/:assignmentId/resume')
  .post(
    auth(allRights.manageExercises.code),
    validate(exerciseComplianceValidation.resumeAssignment),
    exerciseComplianceController.resumeAssignment
  );

router
  .route('/assignments/:assignmentId/update-status')
  .post(
    auth(allRights.manageExercises.code),
    validate(exerciseComplianceValidation.updateAssignmentCompliance),
    exerciseComplianceController.updateAssignmentCompliance
  );

module.exports = router;
