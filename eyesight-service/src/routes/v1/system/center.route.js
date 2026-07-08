const express = require('express');
const _auth = require('../../../middlewares/auth');
const _validate = require('../../../middlewares/validate');
const _injectData = require('../../../middlewares/injectData');
const centerValidation = require('../../../validations/system/center.validation');
const centerController = require('../../../controllers/system/center.controller');
const allRights = require('../../../config/rights');
const { routePatterns } = require('../../../utils/routes');

const router = express.Router();

// Standard CRUD routes for centers
router
  .route('/')
  .post(
    ...routePatterns.create({
      right: allRights.manageCenters.code,
      validation: centerValidation.createCenter,
      controller: centerController.createCenter,
    })
  )
  .get(
    ...routePatterns.list({
      right: allRights.getCenters.code,
      validation: centerValidation.getCenters,
      controller: centerController.getCenters,
    })
  )
  .delete(
    ...routePatterns.bulkDelete({
      right: allRights.manageCenters.code,
      validation: centerValidation.deleteCenters,
      controller: centerController.deleteCenters,
    })
  );

// Standard single center routes
router
  .route('/:centerId')
  .get(
    ...routePatterns.get({
      right: allRights.getCenters.code,
      validation: centerValidation.getCenter,
      controller: centerController.getCenter,
    })
  )
  .patch(
    ...routePatterns.update({
      right: allRights.manageCenters.code,
      validation: centerValidation.updateCenter,
      controller: centerController.updateCenter,
    })
  )
  .delete(
    ...routePatterns.delete({
      right: allRights.manageCenters.code,
      validation: centerValidation.deleteCenter,
      controller: centerController.deleteCenter,
    })
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Centers
 *   description: Center management and retrieval
 */

/**
 * @swagger
 * /centers:
 *   post:
 *     summary: Create a center
 *     description: Only admins can create other centers.
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - centerName
 *               - centerCode
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *             example:
 *               name: Administrator
 *               code: admin
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Center'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all centers
 *     description: Only admins can retrieve all centers.
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Center name
 *       - in: query
 *         name: center
 *         schema:
 *           type: string
 *         description: Center center
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. name:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of centers
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
 *                     $ref: '#/components/schemas/Center'
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
 * /centers/{id}:
 *   get:
 *     summary: Get a center
 *     description: Logged in centers can fetch only their own center information. Only admins can fetch other centers.
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Center id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Center'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a center
 *     description: Logged in centers can only update their own information. Only admins can update other centers.
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Center id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *             example:
 *               name: Administrator
 *               code: admin
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Center'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a center
 *     description: Logged in centers can delete only themselves. Only admins can delete other centers.
 *     tags: [Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Center id
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
