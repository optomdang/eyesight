const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const allRights = require('../../../config/rights');
const warrantyAgreementValidation = require('../../../validations/clinic/warrantyAgreement.validation');
const warrantyAgreementController = require('../../../controllers/clinic/warrantyAgreement.controller');

const router = express.Router();

router.get(
  '/me',
  auth(allRights.manageOwnExercises.code),
  validate(warrantyAgreementValidation.getMyAgreement),
  warrantyAgreementController.getMyAgreement
);

router
  .route('/patients/:patientId')
  .get(
    auth(allRights.getPatients.code),
    validate(warrantyAgreementValidation.getPatientAgreement),
    warrantyAgreementController.getPatientAgreement
  )
  .post(
    auth(allRights.managePatients.code),
    injectData('body'),
    validate(warrantyAgreementValidation.createPatientAgreement),
    warrantyAgreementController.createPatientAgreement
  );

router.post(
  '/:agreementId/phases',
  auth(allRights.managePatients.code),
  injectData('body'),
  validate(warrantyAgreementValidation.createAgreementPhase),
  warrantyAgreementController.createAgreementPhase
);

router.patch(
  '/:agreementId/phases/:phaseId/clinical-data',
  auth(allRights.managePatients.code),
  injectData('body'),
  validate(warrantyAgreementValidation.updateAgreementPhaseClinicalData),
  warrantyAgreementController.updateAgreementPhaseClinicalData
);

router.post(
  '/:agreementId/phases/:phaseId/sign',
  auth(),
  validate(warrantyAgreementValidation.signAgreementPhase),
  warrantyAgreementController.signAgreementPhase
);

router.get(
  '/:agreementId/phases/:phaseId/download',
  auth(),
  validate(warrantyAgreementValidation.downloadAgreementPhasePdf),
  warrantyAgreementController.downloadAgreementPhasePdf
);

router.get(
  '/:agreementId/download',
  auth(),
  validate(warrantyAgreementValidation.downloadAgreementAggregatePdf),
  warrantyAgreementController.downloadAgreementAggregatePdf
);

// Generate a short-lived public sign link token (requires staff auth)
router.post(
  '/:agreementId/phases/:phaseId/sign-token',
  auth(allRights.managePatients.code),
  validate(warrantyAgreementValidation.generateSignToken),
  warrantyAgreementController.generateSignToken
);

// Public endpoints — no auth required (validated by JWT token in URL)
router.get(
  '/sign/:token',
  validate(warrantyAgreementValidation.getSignData),
  warrantyAgreementController.getSignData
);

router.post(
  '/sign/:token',
  validate(warrantyAgreementValidation.signByToken),
  warrantyAgreementController.submitSignature
);

router.get(
  '/sign/:token/pdf',
  validate(warrantyAgreementValidation.getSignData),
  warrantyAgreementController.downloadPdfByToken
);

module.exports = router;
