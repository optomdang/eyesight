const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const patientValidation = require('../../../validations/clinic/patient.validation');
const patientController = require('../../../controllers/clinic/patient.controller');
const allRights = require('../../../config/rights');
const { routePatterns } = require('../../../utils/routes');

// Import nested resource controllers and validations
const examAssignmentValidation = require('../../../validations/clinic/examAssignment.validation');
const examAssignmentController = require('../../../controllers/clinic/examAssignment.controller');
const examResultValidation = require('../../../validations/exam/examResult.validation');
const examResultController = require('../../../controllers/exam/examResult.controller');
const examSessionController = require('../../../controllers/exam/examSession.controller');
const exerciseResultController = require('../../../controllers/exam/exerciseResult.controller');

const router = express.Router();

// Standard CRUD routes for patients
router
  .route('/')
  .post(
    ...routePatterns.create({
      right: allRights.managePatients.code,
      validation: patientValidation.createPatient,
      controller: patientController.createPatient,
    })
  )
  .get(
    ...routePatterns.list({
      right: allRights.getPatients.code,
      validation: patientValidation.getPatients,
      controller: patientController.getPatients,
    })
  )
  .delete(
    ...routePatterns.bulkDelete({
      right: allRights.managePatients.code,
      validation: patientValidation.deletePatients,
      controller: patientController.deletePatients,
    })
  );

// Standard single patient routes
router
  .route('/:patientId')
  .get(
    ...routePatterns.get({
      right: allRights.getPatients.code,
      validation: patientValidation.getPatient,
      controller: patientController.getPatient,
    })
  )
  .patch(
    ...routePatterns.update({
      right: allRights.managePatients.code,
      validation: patientValidation.updatePatient,
      controller: patientController.updatePatient,
    })
  )
  .delete(
    ...routePatterns.delete({
      right: allRights.managePatients.code,
      validation: patientValidation.deletePatient,
      controller: patientController.deletePatient,
    })
  );

router.route('/:patientId/pause').patch(
  ...routePatterns.update({
    right: allRights.managePatients.code,
    validation: patientValidation.pausePatientTreatment,
    controller: patientController.pausePatientTreatment,
  })
);

router.route('/:patientId/resume').patch(
  ...routePatterns.update({
    right: allRights.managePatients.code,
    validation: patientValidation.resumePatientTreatment,
    controller: patientController.resumePatientTreatment,
  })
);

router.route('/:patientId/active-treatment-package').get(
  ...routePatterns.get({
    right: allRights.getPatients.code,
    validation: patientValidation.getPatientActiveTreatmentPackage,
    controller: patientController.getPatientActiveTreatmentPackage,
  })
);

// Specialized endpoint: Medical record update
router
  .route('/:patientId/medical-record')
  .patch(
    auth(allRights.managePatients.code),
    validate(patientValidation.updateMedicalRecord),
    patientController.updateMedicalRecord
  );

// Nested resource: Patient exam configs
router
  .route('/:patientId/exam-configs')
  .get(auth(allRights.getExamAssignments.code), examAssignmentController.getExamAssignmentAssignments)
  .post(
    auth(allRights.manageExamAssignments.code),
    validate(examAssignmentValidation.createExamAssignment),
    injectData('body'),
    examAssignmentController.createExamAssignment
  );

router
  .route('/:patientId/exam-configs/:configId')
  .get(
    auth(allRights.getExamAssignments.code),
    validate(examAssignmentValidation.getExamAssignment),
    injectData('params'),
    examAssignmentController.getExamAssignment
  )
  .patch(
    auth(allRights.manageExamAssignments.code),
    validate(examAssignmentValidation.updateExamAssignment),
    examAssignmentController.updateExamAssignment
  )
  .delete(
    auth(allRights.manageExamAssignments.code),
    validate(examAssignmentValidation.deleteExamAssignment),
    examAssignmentController.deleteExamAssignment
  );

// Nested resource: Patient exam sessions
router
  .route('/:patientId/exam-sessions')
  .get(auth(allRights.getExamSessions.code), examSessionController.getExamAssignmentSessions);

// Nested resource: Patient exam session histories
router
  .route('/:patientId/exam-sessions/histories')
  .get(auth(allRights.getExamSessions.code), examSessionController.getPatientHistorySessions);

// Nested resource: Patient exam results
router
  .route('/:patientId/exam-results')
  .get(
    auth(allRights.getExamResults.code),
    validate(examResultValidation.getExamAssignmentResults),
    injectData('query'),
    examResultController.getExamAssignmentResults
  )
  .post(
    auth(allRights.manageExamResults.code),
    validate(examResultValidation.createExamResult),
    injectData('body'),
    examResultController.createExamResult
  );

// Nested resource: Patient exercise results
router.route('/:patientId/exercise-results').get(
  auth(allRights.getExerciseResults.code),
  validate(examResultValidation.getExamAssignmentResults), // Reuse validation
  injectData('query'),
  exerciseResultController.getExerciseResults
);

// Nested resource: Patient exercise sessions (for progress chart)
router
  .route('/:patientId/exercise-sessions')
  .get(auth(allRights.getExerciseResults.code), injectData('query'), exerciseResultController.getPatientExerciseSessions);

// Specialized endpoint: Latest exam results
router
  .route('/:patientId/exam-results/latest')
  .get(
    auth(allRights.getExamResults.code),
    validate(examResultValidation.getLatestExamAssignmentResult),
    examResultController.getLatestExamAssignmentResult
  );

// Individual exam result management
router
  .route('/:patientId/exam-results/:resultId')
  .get(auth(allRights.getExamResults.code), validate(examResultValidation.getExamResult), examResultController.getExamResult)
  .patch(
    auth(allRights.manageExamResults.code),
    validate(examResultValidation.updateExamResult),
    injectData('body'),
    examResultController.updateExamResult
  )
  .delete(
    auth(allRights.manageExamResults.code),
    validate(examResultValidation.deleteExamResult),
    injectData('body'),
    examResultController.deleteExamResult
  );

module.exports = router;
