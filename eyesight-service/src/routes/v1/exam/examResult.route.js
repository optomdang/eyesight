const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const allRights = require('../../../config/rights');
const examResultValidation = require('../../../validations/exam/examResult.validation');
const examResultController = require('../../../controllers/exam/examResult.controller');

const router = express.Router();

// Base routes
router
  .route('/')
  .post(
    auth(allRights.manageExamResults.code),
    validate(examResultValidation.createExamResult),
    injectData('body'),
    examResultController.createExamResult
  )
  .get(
    auth(allRights.getExamResults.code),
    validate(examResultValidation.getExamResults),
    injectData('query'),
    examResultController.getExamResults
  )
  .delete(
    auth(allRights.manageExamResults.code),
    validate(examResultValidation.deleteExamResults),
    injectData('body'),
    examResultController.deleteExamResults
  );

router
  .route('/:resultId')
  .get(
    auth(allRights.getExamResults.code),
    validate(examResultValidation.getExamResultById),
    examResultController.getExamResult
  )
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

/**
 * @swagger
 * tags:
 *   name: ExamResults
 *   description: Exam result management and retrieval
 */

/**
 * @swagger
 * /exam-results:
 *   post:
 *     summary: Create an exam result
 *     description: Only admins can create exam results.
 *     tags: [ExamResults]
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
 *               - examType
 *               - centerId
 *             properties:
 *               code:
 *                 type: string
 *               patientId:
 *                 type: integer
 *               examType:
 *                 type: string
 *                 enum: [FarVision, NearVision, StereoVision, ContrastVision]
 *               result:
 *                 type: object
 *               centerId:
 *                 type: integer
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *             example:
 *               code: ER001
 *               patientId: 1
 *               examType: FarVision
 *               result: { "score": 90 }
 *               centerId: 1
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ExamResult'
 *       "400":
 *         $ref: '#/components/responses/DuplicateCode'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all exam results
 *     description: Only admins can retrieve all exam results.
 *     tags: [ExamResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Result code
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: integer
 *         description: Patient ID
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
 *                     $ref: '#/components/schemas/ExamResult'
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
 * /exam-results/{resultId}:
 *   get:
 *     summary: Get an exam result
 *     description: Only admins can fetch exam result information.
 *     tags: [ExamResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resultId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Result ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ExamResult'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update an exam result
 *     description: Only admins can update exam result information.
 *     tags: [ExamResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resultId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Result ID
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
 *               examType:
 *                 type: string
 *               result:
 *                 type: object
 *               centerId:
 *                 type: integer
 *             example:
 *               code: ER002
 *               examType: NearVision
 *               result: { "score": 85 }
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ExamResult'
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
 *     summary: Delete an exam result
 *     description: Only admins can delete exam results.
 *     tags: [ExamResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resultId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Result ID
 *     responses:
 *       "200":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
