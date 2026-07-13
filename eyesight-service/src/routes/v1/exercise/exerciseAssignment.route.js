const express = require('express');
const allRights = require('../../../config/rights');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const { exerciseAssignmentValidation } = require('../../../validations');
const exerciseAssignmentController = require('../../../controllers/exercise/exerciseAssignment.controller');

const router = express.Router();

// Maintenance (admin/doctor) — sync session snapshots after config changes
router.post(
  '/maintenance/sync-sessions',
  auth(allRights.manageExercises.code),
  validate(exerciseAssignmentValidation.syncAssignmentSessions),
  exerciseAssignmentController.syncAssignmentSessions
);

// Nested resource: Exercise config assignments
router
  .route('/exercise-configs/:configId/assignments')
  .post(
    auth(allRights.manageExercises.code),
    validate(exerciseAssignmentValidation.assignConfig),
    injectData('body'),
    exerciseAssignmentController.assignConfigToPatients
  )
  .get(
    auth(allRights.getExercises.code),
    validate(exerciseAssignmentValidation.getConfigAssignments),
    injectData('query'),
    exerciseAssignmentController.getConfigAssignments
  );

// Nested resource: Patient assignments
router
  .route('/patients/:patientId/assignments')
  .get(
    auth(allRights.getExercises.code),
    validate(exerciseAssignmentValidation.getPatientAssignments),
    injectData('query'),
    exerciseAssignmentController.getPatientAssignments
  );

// Alias route for exercise-configs (clearer naming)
router
  .route('/patients/:patientId/exercise-configs')
  .get(
    auth(allRights.getExercises.code),
    validate(exerciseAssignmentValidation.getPatientAssignments),
    injectData('query'),
    exerciseAssignmentController.getPatientAssignments
  );

// Individual assignment management
router
  .route('/patients/:patientId/assignments/:assignmentId')
  .get(
    auth(allRights.getExercises.code),
    validate(exerciseAssignmentValidation.getAssignment),
    exerciseAssignmentController.getAssignment
  )
  .patch(
    auth(allRights.manageExercises.code),
    validate(exerciseAssignmentValidation.updateAssignment),
    injectData('body'),
    exerciseAssignmentController.updateAssignment
  )
  .delete(
    auth(allRights.manageExercises.code),
    validate(exerciseAssignmentValidation.removeAssignment),
    injectData('body'),
    exerciseAssignmentController.removeAssignment
  );

// Session tracking nested resource
router
  .route('/patients/:patientId/assignments/:assignmentId/sessions')
  .post(
    auth(allRights.manageExercises.code),
    validate(exerciseAssignmentValidation.recordSession),
    injectData('body'),
    exerciseAssignmentController.recordSession
  );

// Statistics endpoint
router
  .route('/assignments/stats')
  .get(
    auth(allRights.getExercises.code),
    validate(exerciseAssignmentValidation.getAssignmentStats),
    injectData('query'),
    exerciseAssignmentController.getAssignmentStats
  );

module.exports = router;
