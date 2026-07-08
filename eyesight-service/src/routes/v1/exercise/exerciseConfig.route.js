const express = require('express');
const allRights = require('../../../config/rights');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const exerciseConfigController = require('../../../controllers/exercise/exerciseConfig.controller');
const { exerciseConfigValidation } = require('../../../validations');
const { routePatterns } = require('../../../utils/routes');

const router = express.Router();

// Standard CRUD routes for exercise configs
router
  .route('/')
  .get(
    ...routePatterns.list({
      right: allRights.getExercises.code,
      validation: exerciseConfigValidation.getExerciseConfigs,
      controller: exerciseConfigController.getExerciseConfigs,
    })
  )
  .post(
    ...routePatterns.create({
      right: allRights.manageExercises.code,
      validation: exerciseConfigValidation.createExerciseConfig,
      controller: exerciseConfigController.createExerciseConfig,
    })
  )
  .delete(
    ...routePatterns.bulkDelete({
      right: allRights.manageExercises.code,
      validation: exerciseConfigValidation.deleteExerciseConfigs,
      controller: exerciseConfigController.deleteExerciseConfigs,
    })
  );

// Color presets MUST be registered before /:configId
router
  .route('/color-presets')
  .get(auth(allRights.getExercises.code), exerciseConfigController.getColorSchemePresets)
  .put(
    auth(allRights.manageExercises.code),
    validate(exerciseConfigValidation.saveColorSchemePreset),
    exerciseConfigController.saveColorSchemePreset
  );

// Standard single exercise config routes
router
  .route('/:configId')
  .get(
    ...routePatterns.get({
      right: allRights.getExercises.code,
      validation: exerciseConfigValidation.getExerciseConfigById,
      controller: exerciseConfigController.getExerciseConfigById,
    })
  )
  .patch(
    ...routePatterns.update({
      right: allRights.manageExercises.code,
      validation: exerciseConfigValidation.updateExerciseConfigById,
      controller: exerciseConfigController.updateExerciseConfigById,
    })
  )
  .delete(
    ...routePatterns.delete({
      right: allRights.manageExercises.code,
      validation: exerciseConfigValidation.deleteExerciseConfigById,
      controller: exerciseConfigController.deleteExerciseConfigById,
    })
  );

module.exports = router;
