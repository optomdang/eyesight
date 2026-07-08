const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const exerciseController = require('../../../controllers/clinic/exercise.controller');
const exerciseConfigController = require('../../../controllers/exercise/exerciseConfig.controller');
const allRights = require('../../../config/rights');
const exerciseValidation = require('../../../validations/exercise/exercise.validation');
const { exerciseConfigValidation } = require('../../../validations');

const router = express.Router();

router
  .route('/')
  .post(
    auth(allRights.manageExercises.code),
    injectData('body'),
    validate(exerciseValidation.createExercise),
    exerciseController.createExercise
  )
  .get(
    auth(allRights.getExercises.code),
    validate(exerciseValidation.getExercises),
    injectData('query'),
    exerciseController.getExercises
  )
  .delete(
    auth(allRights.manageExercises.code),
    validate(exerciseValidation.deleteExercises),
    injectData('body'),
    exerciseController.deleteExercises
  );

router
  .route('/:exerciseId')
  .get(auth(allRights.getExercises.code), validate(exerciseValidation.getExercise), exerciseController.getExercise)
  .patch(
    auth(allRights.manageExercises.code),
    injectData('body'),
    validate(exerciseValidation.updateExercise),
    exerciseController.updateExercise
  )
  .delete(
    auth(allRights.manageExercises.code),
    validate(exerciseValidation.deleteExercise),
    injectData('body'),
    exerciseController.deleteExercise
  );

// Routes for exercise configuration management
router
  .route('/:exerciseId/config')
  .get(
    auth(allRights.getExercises.code),
    validate(exerciseConfigValidation.getExerciseConfigByExerciseId),
    injectData('query'),
    exerciseConfigController.getExerciseConfigByExerciseId
  )
  .post(
    auth(allRights.manageExercises.code),
    validate(exerciseConfigValidation.createExerciseConfig),
    injectData('body'),
    exerciseConfigController.createExerciseConfig
  )
  .patch(
    auth(allRights.manageExercises.code),
    validate(exerciseConfigValidation.updateExerciseConfig),
    injectData('body'),
    exerciseConfigController.updateExerciseConfig
  )
  .delete(
    auth(allRights.manageExercises.code),
    validate(exerciseConfigValidation.deleteExerciseConfig),
    injectData('body'),
    exerciseConfigController.deleteExerciseConfig
  );

// Routes for specific exercise configuration by configId
router
  .route('/:exerciseId/config/:configId')
  .get(
    auth(allRights.getExercises.code),
    validate(exerciseConfigValidation.getExerciseConfigById),
    exerciseConfigController.getExerciseConfigById
  )
  .patch(
    auth(allRights.manageExercises.code),
    validate(exerciseConfigValidation.updateExerciseConfigById),
    injectData('body'),
    exerciseConfigController.updateExerciseConfigById
  )
  .delete(
    auth(allRights.manageExercises.code),
    validate(exerciseConfigValidation.deleteExerciseConfigById),
    injectData('body'),
    exerciseConfigController.deleteExerciseConfigById
  );

// Routes for template-based exercise configurations
router
  .route('/:exerciseId/configs')
  .get(
    auth(allRights.getExercises.code),
    validate(exerciseConfigValidation.getExerciseConfigs),
    injectData('query'),
    exerciseConfigController.getExerciseConfigs
  );

// Routes for patient-specific configurations
router
  .route('/:exerciseId/patients/:patientId/config')
  .post(
    auth(allRights.manageExercises.code),
    validate(exerciseConfigValidation.assignTemplateToPatient),
    injectData('body'),
    exerciseConfigController.assignTemplateToPatient
  );

module.exports = router;
