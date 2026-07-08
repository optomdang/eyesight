const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const allRights = require('../../../config/rights');
const exerciseResultValidation = require('../../../validations/exercise/exerciseResult.validation');
const exerciseResultController = require('../../../controllers/exam/exerciseResult.controller');

const router = express.Router();

router
  .route('/')
  .post(
    auth(allRights.manageExerciseResults.code),
    validate(exerciseResultValidation.createExerciseResult),
    injectData('body'),
    exerciseResultController.createExerciseResult
  )
  .get(
    auth(allRights.getExerciseResults.code),
    validate(exerciseResultValidation.getExerciseResults),
    injectData('query'),
    exerciseResultController.getExerciseResults
  )
  .delete(
    auth(allRights.manageExerciseResults.code),
    validate(exerciseResultValidation.deleteExerciseResults),
    exerciseResultController.deleteExerciseResults
  );

router
  .route('/:resultId')
  .get(
    auth(allRights.getExerciseResults.code),
    validate(exerciseResultValidation.getExerciseResult),
    exerciseResultController.getExerciseResult
  )
  .patch(
    auth(allRights.manageExerciseResults.code),
    validate(exerciseResultValidation.updateExerciseResult),
    exerciseResultController.updateExerciseResult
  )
  .delete(
    auth(allRights.manageExerciseResults.code),
    validate(exerciseResultValidation.deleteExerciseResult),
    exerciseResultController.deleteExerciseResult
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: ExerciseResults
 *   description: Exercise result management and retrieval
 */

/**
 * @swagger
 * /exercise-results:
 *   post:
 *     summary: Create an exercise result
 *     description: Only admins can create exercise results.
 *     tags: [ExerciseResults]
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
 *               - assignmentId
 *               - centerId
 *             properties:
 *               code:
 *                 type: string
 *               assignmentId:
 *                 type: integer
 *               score:
 *                 type: integer
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *               state:
 *                 type: object
 *               centerId:
 *                 type: integer
 *             example:
 *               code: ER001
 *               assignmentId: 1
 *               score: 95
 *               completedAt: "2023-10-02T10:00:00Z"
 *               state: { "progress": "complete" }
 *               centerId: 1
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ExerciseResult'
 *       "400":
 *         $ref: '#/components/responses/DuplicateCode'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all exercise results
 *     description: Only admins can retrieve all exercise results.
 *     tags: [ExerciseResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Result code
 *       - in: query
 *         name: assignmentId
 *         schema:
 *           type: integer
 *         description: Exercise Assignment ID
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
 *                     $ref: '#/components/schemas/ExerciseResult'
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
 * /exercise-results/{resultId}:
 *   get:
 *     summary: Get an exercise result
 *     description: Only admins can fetch exercise result information.
 *     tags: [ExerciseResults]
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
 *                $ref: '#/components/schemas/ExerciseResult'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update an exercise result
 *     description: Only admins can update exercise result information.
 *     tags: [ExerciseResults]
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
 *               assignmentId:
 *                 type: integer
 *               score:
 *                 type: integer
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *               state:
 *                 type: object
 *               centerId:
 *                 type: integer
 *             example:
 *               code: ER002
 *               score: 88
 *               completedAt: "2023-10-03T10:00:00Z"
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ExerciseResult'
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
 *     summary: Delete an exercise result
 *     description: Only admins can delete exercise results.
 *     tags: [ExerciseResults]
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
