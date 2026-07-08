const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const validateUserType = require('../../../middlewares/validateUserType');
const _injectData = require('../../../middlewares/injectData');
const userValidation = require('../../../validations/authentication/user.validation');
const userController = require('../../../controllers/authentication/user.controller');
const allRights = require('../../../config/rights');
const patientValidation = require('../../../validations/clinic/patient.validation');
const patientController = require('../../../controllers/clinic/patient.controller');
const { routePatterns } = require('../../../utils/routes');
const injectData = require('../../../middlewares/injectData');

const router = express.Router();

// Standard CRUD routes for users
router
  .route('/')
  .post(
    // SECURITY: Accept manageUsers OR domain-specific permissions (managePatients, manageDoctors)
    // validateUserType middleware will enforce which user types can be created based on permission
    auth(allRights.manageUsers.code, allRights.managePatients.code, allRights.manageDoctors.code),
    validateUserType, // SECURITY: Enforce user type based on permission
    validate(userValidation.createUser),
    injectData('body'),
    userController.createUser
  )
  .get(
    ...routePatterns.list({
      right: allRights.getUsers.code,
      validation: userValidation.getUsers,
      controller: userController.getUsers,
    })
  )
  .delete(
    ...routePatterns.bulkDelete({
      right: allRights.manageUsers.code,
      validation: userValidation.deleteUser,
      controller: userController.deleteUsers,
    })
  );

// Nested resource: User's patient profile
router
  .route('/:userId/patient')
  .get(
    auth(allRights.getPatients.code),
    validate(patientValidation.getPatientByUserId),
    patientController.getPatientByUserId
  );

// Standard single user routes
router
  .route('/:userId')
  .get(
    ...routePatterns.get({
      right: allRights.getUsers.code,
      validation: userValidation.getUser,
      controller: userController.getUser,
    })
  )
  .patch(
    // SECURITY: Accept manageUsers OR domain-specific permissions (managePatients, manageDoctors)
    auth(allRights.manageUsers.code, allRights.managePatients.code, allRights.manageDoctors.code),
    validate(userValidation.updateUser),
    injectData('body'),
    userController.updateUser
  )
  .delete(
    ...routePatterns.delete({
      right: allRights.manageUsers.code,
      validation: userValidation.deleteUser,
      controller: userController.deleteUser,
    })
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and retrieval
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a user
 *     description: Only admins can create other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
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
 *               roleId:
 *                  type: string
 *               phoneNumber:
 *                  type: string
 *             example:
 *               name: Vinh Nguyen
 *               email: vinhnb@example.com
 *               password: password1
 *               roleId: 640d991c51bf87439ccf566f
 *               phoneNumber: 0943991586
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/User'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all users
 *     description: Only admins can retrieve all users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: User name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: User role
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
 *         description: Maximum number of users
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
 *                     $ref: '#/components/schemas/User'
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
 * /users/{id}:
 *   get:
 *     summary: Get a user
 *     description: Logged in users can fetch only their own user information. Only admins can fetch other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/User'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a user
 *     description: Logged in users can only update their own information. Only admins can update other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
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
 *               roleId:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               centerId:
 *                 type: string
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               roleId: 640d991c51bf87439ccf566f
 *               phoneNumber: 0943991586
 *               centerId: 640d991c51bf87439
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/User'
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
 *     summary: Delete a user
 *     description: Logged in users can delete only themselves. Only admins can delete other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
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
