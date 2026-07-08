const express = require('express');
const allRights = require('../../../config/rights');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const { levelAdjustmentValidation } = require('../../../validations');
const { levelAdjustmentController } = require('../../../controllers');

const router = express.Router();

// Auto-adjust level
router
  .route('/:assignmentId/adjust-level')
  .post(
    auth(allRights.managePatientExercises.code),
    validate(levelAdjustmentValidation.autoAdjustLevel),
    levelAdjustmentController.autoAdjustLevel
  );

// Toggle auto-adjustment
router
  .route('/:assignmentId/toggle-auto-adjust')
  .patch(
    auth(allRights.managePatientExercises.code),
    validate(levelAdjustmentValidation.toggleAutoAdjust),
    levelAdjustmentController.toggleAutoAdjust
  );

// Set level manually by doctor
router
  .route('/:assignmentId/set-level')
  .patch(
    auth(allRights.managePatientExercises.code),
    validate(levelAdjustmentValidation.setLevelByDoctor),
    levelAdjustmentController.setLevelByDoctor
  );

// Configure pass conditions
router
  .route('/:assignmentId/configure-pass-conditions')
  .patch(
    auth(allRights.managePatientExercises.code),
    validate(levelAdjustmentValidation.configurePassConditions),
    levelAdjustmentController.configurePassConditions
  );

module.exports = router;
