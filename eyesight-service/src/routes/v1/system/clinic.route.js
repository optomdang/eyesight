const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const clinicValidation = require('../../../validations/system/clinic.validation');
const clinicController = require('../../../controllers/system/clinic.controller');
const allRights = require('../../../config/rights');

const router = express.Router();

router
  .route('/')
  .post(
    auth(allRights.manageClinics.code),
    validate(clinicValidation.createClinic),
    injectData('body'),
    clinicController.createClinic
  )
  .get(
    auth(allRights.getClinics.code),
    validate(clinicValidation.getClinics),
    injectData('query'),
    clinicController.getClinics
  )
  .delete(
    auth(allRights.manageClinics.code),
    validate(clinicValidation.deleteClinics),
    injectData('body'),
    clinicController.deleteClinics
  );

router
  .route('/:clinicId')
  .get(auth(allRights.getClinics.code), validate(clinicValidation.getClinic), clinicController.getClinic)
  .patch(
    auth(allRights.manageClinics.code),
    validate(clinicValidation.updateClinic),
    injectData('body'),
    clinicController.updateClinic
  )
  .delete(
    auth(allRights.manageClinics.code),
    validate(clinicValidation.deleteClinic),
    injectData('body'),
    clinicController.deleteClinic
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Clinics
 *   description: Clinic management and retrieval
 */

/**
 * @swagger
 * /clinics:
 *   post:
 *     summary: Create a clinic
 *     description: Only admins can create other clinics.
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clinicName
 *               - clinicCode
 *             properties:
 *               clinicName:
 *                 type: string
 *               clinicCode:
 *                 type: string
 *             example:
 *               clinicName: Create User
 *               clinicCode: CreateUser
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Clinic'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all clinics
 *     description: Only admins can retrieve all clinics.
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Clinic name
 *       - in: query
 *         name: clinic
 *         schema:
 *           type: string
 *         description: Clinic clinic
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
 *         description: Maximum number of clinics
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
 *                     $ref: '#/components/schemas/Clinic'
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
 * /clinics/{id}:
 *   get:
 *     summary: Get a clinic
 *     description: Logged in clinics can fetch only their own clinic information. Only admins can fetch other clinics.
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Clinic id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Clinic'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a clinic
 *     description: Logged in clinics can only update their own information. Only admins can update other clinics.
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Clinic id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *                 description: must be unique
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: At least one number and one letter
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Clinic'
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
 *     summary: Delete a clinic
 *     description: Logged in clinics can delete only themselves. Only admins can delete other clinics.
 *     tags: [Clinics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Clinic id
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
