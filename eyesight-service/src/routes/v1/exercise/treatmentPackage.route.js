const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const treatmentPackageValidation = require('../../validations/exercise/treatmentPackage.validation');
const treatmentPackageController = require('../../controllers/exercise/treatmentPackage.controller');
const injectData = require('../../middlewares/injectData');
const allRights = require('../../config/rights');

const router = express.Router();

router
  .route('/')
  .post(
    auth(allRights.manageExercises.code),
    validate(treatmentPackageValidation.createTreatmentPackage),
    injectData('body'),
    treatmentPackageController.createTreatmentPackage
  )
  .get(
    auth(allRights.getExercises.code),
    validate(treatmentPackageValidation.getTreatmentPackages),
    injectData('query'),
    treatmentPackageController.getTreatmentPackages
  )
  .delete(
    auth(allRights.manageExercises.code),
    validate(treatmentPackageValidation.deleteTreatmentPackages),
    injectData('body'),
    treatmentPackageController.deleteTreatmentPackages
  );

router
  .route('/:packageId')
  .get(
    auth(allRights.getExercises.code),
    validate(treatmentPackageValidation.getTreatmentPackage),
    treatmentPackageController.getTreatmentPackage
  )
  .patch(
    auth(allRights.manageExercises.code),
    validate(treatmentPackageValidation.updateTreatmentPackage),
    injectData('body'),
    treatmentPackageController.updateTreatmentPackage
  )
  .delete(
    auth(allRights.manageExercises.code),
    validate(treatmentPackageValidation.deleteTreatmentPackage),
    injectData('body'),
    treatmentPackageController.deleteTreatmentPackage
  );

router
  .route('/:packageId/assign')
  .post(
    auth(allRights.manageExercises.code),
    validate(treatmentPackageValidation.assignTreatmentPackage),
    injectData('body'),
    treatmentPackageController.assignTreatmentPackage
  );

module.exports = router;
