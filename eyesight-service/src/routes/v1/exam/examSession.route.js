const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const allRights = require('../../../config/rights');
const examSessionValidation = require('../../../validations/exam/examSession.validation');
const examSessionController = require('../../../controllers/exam/examSession.controller');
const examResultValidation = require('../../../validations/exam/examResult.validation');
const examResultController = require('../../../controllers/exam/examResult.controller');
const { routePatterns } = require('../../../utils/routes');

const router = express.Router();

// Standard CRUD routes for exam sessions
router
  .route('/')
  .post(
    ...routePatterns.create({
      right: allRights.manageExamSessions.code,
      validation: examSessionValidation.createExamSession,
      controller: examSessionController.createExamSession,
    })
  )
  .get(
    ...routePatterns.list({
      right: allRights.getExamSessions.code,
      validation: examSessionValidation.getExamSessions,
      controller: examSessionController.getExamSessions,
    })
  );

// Standard single exam session routes
router
  .route('/:sessionId')
  .get(
    ...routePatterns.get({
      right: allRights.getExamSessions.code,
      validation: examSessionValidation.getExamSession,
      controller: examSessionController.getExamSession,
    })
  )
  .patch(
    ...routePatterns.update({
      right: allRights.manageExamSessions.code,
      validation: examSessionValidation.updateExamSession,
      controller: examSessionController.updateExamSession,
    })
  )
  .delete(
    ...routePatterns.delete({
      right: allRights.manageExamSessions.code,
      validation: examSessionValidation.deleteExamSession,
      controller: examSessionController.deleteExamSession,
    })
  );

// Nested resource: Session exam results
router
  .route('/:sessionId/exam-results')
  .get(
    auth(allRights.getExamResults.code),
    validate(examResultValidation.getExamResults),
    injectData('query'),
    examResultController.getExamResults
  );

// Session status update (specialized endpoint)
router
  .route('/:sessionId/status')
  .patch(
    auth(allRights.manageExamSessions.code),
    validate(examSessionValidation.updateExamSessionStatus),
    examSessionController.updateExamSessionStatus
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: ExamSessions
 *   description: Test session management and retrieval
 */

/**
 * @swagger
 * /exam-sessions:
 *   post:
 *     summary: Create a test session
 *     description: Only admins can create test sessions.
 *     tags: [ExamSessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - patientId
 *               - centerId
 *             properties:
 *               code:
 *                 type: string
 *               patientId:
 *                 type: integer
 *               doctorId:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [incomplete, completed]
 *                 description: Database status - incomplete (scheduled/in progress), completed (exam finished)
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *               deviceInfo:
 *                 type: object
 *               centerId:
 *                 type: integer
 *             example:
 *               code: TS001
 *               patientId: 1
 *               doctorId: 1
 *               status: incomplete
 *               centerId: 1
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ExamSession'
 *       "400":
 *         $ref: '#/components/responses/DuplicateCode'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all test sessions
 *     description: Only admins can retrieve all test sessions.
 *     tags: [ExamSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Session code
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: integer
 *         description: Patient ID
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: integer
 *         description: Doctor ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [incomplete, completed]
 *         description: Session status (database status)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. code:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of results
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ExamSession'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /exam-sessions/{sessionId}:
 *   get:
 *     summary: Get a test session
 *     description: Only admins can fetch test session information.
 *     tags: [ExamSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ExamSession'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a test session
 *     description: Only admins can update test session information.
 *     tags: [ExamSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               patientId:
 *                 type: integer
 *               doctorId:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [incomplete, completed]
 *                 description: Database status - incomplete (scheduled/in progress), completed (exam finished)
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *               deviceInfo:
 *                 type: object
 *               centerId:
 *                 type: integer
 *             example:
 *               status: incomplete
 *               startedAt: "2023-01-01T00:00:00Z"
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ExamSession'
 *       "400":
 *         $ref: '#/components/responses/DuplicateCode'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a test session
 *     description: Only admins can delete test sessions.
 *     tags: [ExamSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     responses:
 *       "204":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /exam-sessions/{sessionId}/status:
 *   patch:
 *     summary: Update a test session status
 *     description: Only admins can update test session status.
 *     tags: [ExamSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [incomplete, completed]
 *                 description: Database status - incomplete (scheduled/in progress), completed (exam finished)
 *             example:
 *               status: completed
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ExamSession'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /exam-sessions/patient/{patientId}/status:
 *   get:
 *     summary: Get patient exam sessions status
 *     description: Retrieve upcoming, current, and historical exam sessions for a patient.
 *     tags: [ExamSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 upcomingSessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       code:
 *                         type: string
 *                       patientId:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       isComplete:
 *                         type: boolean
 *                       completedExamTypes:
 *                         type: array
 *                         items:
 *                           type: string
 *                       results:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/ExamResult'
 *                 currentSessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       code:
 *                         type: string
 *                       patientId:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       isComplete:
 *                         type: boolean
 *                       completedExamTypes:
 *                         type: array
 *                         items:
 *                           type: string
 *                       results:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/ExamResult'
 *                 historySessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       code:
 *                         type: string
 *                       patientId:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       isComplete:
 *                         type: boolean
 *                       completedExamTypes:
 *                         type: array
 *                         items:
 *                           type: string
 *                       results:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/ExamResult'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /exam-sessions/{sessionId}/exam-results:
 *   get:
 *     summary: Get exam results for a specific exam session
 *     description: Retrieves all exam results that belong to the specified exam session ID.
 *     tags: [ExamSessions, ExamResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exam Session ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. createdAt:desc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of results
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rows:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ExamResult'
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
