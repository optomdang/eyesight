const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const doctorValidation = require('../../../validations/clinic/doctor.validation');
const doctorController = require('../../../controllers/clinic/doctor.controller');
const allRights = require('../../../config/rights');

const router = express.Router();

router
  .route('/')
  .post(
    auth(allRights.manageDoctors.code),
    validate(doctorValidation.createDoctor),
    injectData('body'),
    doctorController.createDoctor
  )
  .get(
    auth(allRights.getDoctors.code),
    validate(doctorValidation.getDoctors),
    injectData('query'),
    doctorController.getDoctors
  )
  .delete(
    auth(allRights.manageDoctors.code),
    validate(doctorValidation.deleteDoctors),
    injectData('body'),
    doctorController.deleteDoctors
  );

router
  .route('/:doctorId')
  .get(auth(allRights.getDoctors.code), validate(doctorValidation.getDoctor), doctorController.getDoctor)
  .patch(
    auth(allRights.manageDoctors.code),
    validate(doctorValidation.updateDoctor),
    injectData('body'),
    doctorController.updateDoctor
  )
  .delete(
    auth(allRights.manageDoctors.code),
    validate(doctorValidation.deleteDoctor),
    injectData('body'),
    doctorController.deleteDoctor
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Doctors
 *   description: Doctor management and retrieval
 */

/**
 * @swagger
 * /doctors:
 *   post:
 *     summary: Create a doctor
 *     description: Only admins can create doctors.
 *     tags: [Doctors]
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
 *               - userId
 *               - centerId
 *             properties:
 *               code:
 *                 type: string
 *               userId:
 *                 type: integer
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               centerId:
 *                 type: integer
 *             example:
 *               code: DOC001
 *               userId: 1
 *               phoneNumber: "0123456789"
 *               address: "123 Main St"
 *               centerId: 1
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Doctor'
 *       "400":
 *         $ref: '#/components/responses/DuplicateCode'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all doctors
 *     description: Only admins can retrieve all doctors.
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Doctor code
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: User ID
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
 *         description: Maximum number of doctors
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
 *                     $ref: '#/components/schemas/Doctor'
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
 * /doctors/{doctorId}:
 *   get:
 *     summary: Get a doctor
 *     description: Only admins can fetch doctor information.
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Doctor'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a doctor
 *     description: Only admins can update doctor information.
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               userId:
 *                 type: integer
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               centerId:
 *                 type: integer
 *             example:
 *               code: DOC002
 *               phoneNumber: "0987654321"
 *               address: "456 Elm St"
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Doctor'
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
 *     summary: Delete a doctor
 *     description: Only admins can delete doctors.
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor ID
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
