const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const checkPatientActive = require('../../../middlewares/checkPatientActive');
const allRights = require('../../../config/rights');
const {
  exerciseAssignmentValidation,
  examResultValidation,
  userValidation,
  patientValidation,
  exerciseResultValidation,
} = require('../../../validations');
const {
  portalController,
  examResultController,
  userController,
  patientController,
  exerciseResultController,
} = require('../../../controllers');

const router = express.Router();

// Current user profile
router
  .route('/')
  .get(auth(), userController.getCurrentUser)
  .patch(auth(), validate(userValidation.updateCurrentUser), userController.updateCurrentUser);

// Change center (admin only) - safer than updating arbitrary user
router.route('/center').patch(auth(), validate(userValidation.changeAdminCenter), userController.changeAdminCenter);

// Current user patient info
router.route('/info').get(auth(), userController.getCurrentPatientInfo);

// FCM token management
router
  .route('/fcm-token')
  .patch(auth(), validate(userValidation.storeRegistrationToken), userController.storeRegistrationToken)
  .delete(auth(), userController.deleteRegistrationToken);

// Current user notifications
router
  .route('/notifications')
  .get(auth(), userController.getNotificationsByUser)
  .delete(auth(), userController.deleteNotificationsByUser);

router.route('/notifications/stats').get(auth(), userController.getNotificationSummaryByUser);

// Lightweight unread count (used by header badge)
router.route('/notifications/unread-count').get(auth(), userController.getUnreadNotificationCount);

// Mark all notifications as read
router.route('/notifications/mark-all-read').patch(auth(), userController.markAllNotificationsRead);

router
  .route('/notifications/:notificationId/read')
  .patch(auth(), validate(userValidation.markNotificationRead), userController.markNotificationRead);

router.route('/notifications/:notificationId').delete(auth(), userController.deleteNotificationByUser);

// Current user exercises
// Patient exercise assignments (frequency-based)
router
  .route('/assignments')
  .get(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(exerciseAssignmentValidation.getMyAssignments),
    injectData('query'),
    portalController.getMyAssignments
  );

// Patient exercise sessions (active/pending sessions)
router
  .route('/sessions')
  .get(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(exerciseAssignmentValidation.getMyExerciseSessions),
    injectData('query'),
    portalController.getMyExerciseSessions
  );

// Assignment statistics (frequency + progress) - MUST be before :assignmentId route
router
  .route('/assignments/stats')
  .get(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(exerciseAssignmentValidation.getMyAssignmentStats),
    injectData('query'),
    portalController.getMyAssignmentStats
  );

router
  .route('/assignments/:assignmentId')
  .get(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(exerciseAssignmentValidation.getMyAssignment),
    portalController.getMyAssignment
  );

// Create new exercise session (RESTful)
router
  .route('/assignments/:assignmentId/sessions')
  .post(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(exerciseAssignmentValidation.startAssignmentSession),
    portalController.startAssignmentSession
  )
  .get(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(exerciseAssignmentValidation.getMyAssignmentSessions),
    injectData('query'),
    portalController.getMyAssignmentSessions
  );

// Get session results (executions within a session) and Submit exercise result
router
  .route('/assignments/:assignmentId/sessions/:sessionId/results')
  .get(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    injectData('query'),
    portalController.getMyExerciseResults
  )
  .post(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    injectData('body'),
    portalController.submitMyExerciseResult
  );

// Start or resume an exercise (new flow)
router
  .route('/assignments/:assignmentId/sessions/:sessionId/start')
  .post(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(exerciseResultValidation.startExercise),
    exerciseResultController.startExercise
  );

// Track inactivity event (30-second window) — server increments inactivityCount on result
router
  .route('/assignments/:assignmentId/sessions/:sessionId/results/:resultId/inactivity')
  .post(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(exerciseResultValidation.trackInactivity),
    exerciseResultController.trackInactivity
  );

// Pause an exercise - save current game state
router
  .route('/assignments/:assignmentId/sessions/:sessionId/results/:resultId')
  .patch(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(exerciseResultValidation.pauseExercise),
    exerciseResultController.pauseExercise
  );

// Complete an exercise - evaluate pass/fail
router
  .route('/assignments/:assignmentId/sessions/:sessionId/results/:resultId/complete')
  .post(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(exerciseResultValidation.completeExercise),
    exerciseResultController.completeExercise
  );

// Current user exam dashboard for portal
router
  .route('/exam-dashboard')
  .get(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(examResultValidation.getMyExamDashboard),
    examResultController.getMyExamDashboard
  );

// Current user exam sessions - MATCHING Exercise pattern
router
  .route('/exam-sessions/current')
  .get(auth(allRights.manageOwnExercises.code), checkPatientActive, examResultController.getMyCurrentSessions);

router
  .route('/exam-sessions')
  .get(auth(allRights.manageOwnExercises.code), checkPatientActive, examResultController.getMyExamSessions);

router
  .route('/exam-sessions/:sessionId')
  .get(auth(allRights.manageOwnExercises.code), checkPatientActive, examResultController.getMyExamSession);

router
  .route('/exam-sessions/:sessionId/start')
  .post(auth(allRights.manageOwnExercises.code), checkPatientActive, examResultController.startExamFromSession);

// Current user exercise session history (for progress chart)
router
  .route('/exercise-sessions/history')
  .get(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    injectData('query'),
    portalController.getMyExerciseSessionsHistory
  );

// Diligence leaderboard (BXH mức độ chăm chỉ) — portal home
router
  .route('/leaderboard')
  .get(auth(allRights.manageOwnExercises.code), checkPatientActive, portalController.getMyLeaderboard);

// Current user exercise results - get all exercise results
router
  .route('/exercise-results')
  .get(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    injectData('query'),
    portalController.getAllMyExerciseResults
  );

// Current user exam results - create and manage exam results
router
  .route('/exam-results')
  .get(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(examResultValidation.getMyExamResults),
    injectData('query'),
    examResultController.getMyExamResults
  )
  .post(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(examResultValidation.createMyExamResult),
    injectData('body'),
    examResultController.createMyExamResult
  );

router
  .route('/exam-results/:examResultId')
  .put(
    auth(allRights.manageOwnExercises.code),
    checkPatientActive,
    validate(examResultValidation.updateMyExamResult),
    injectData('body'),
    examResultController.updateMyExamResult
  );

// Get my patients (for doctors)
router
  .route('/patients')
  .get(auth(), validate(patientValidation.getPatients), injectData('query'), patientController.getMyPatients);

module.exports = router;
