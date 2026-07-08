const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const ttsPreviewController = require('../../../controllers/tools/ttsPreview.controller');
const ttsPreviewValidation = require('../../../validations/tools/ttsPreview.validation');
const allRights = require('../../../config/rights');

const router = express.Router();

router
  .route('/status')
  .get(auth(allRights.getExercises.code), ttsPreviewController.getStatus);

router
  .route('/synthesize')
  .post(
    auth(allRights.getExercises.code),
    validate(ttsPreviewValidation.synthesize),
    ttsPreviewController.synthesize
  );

module.exports = router;
