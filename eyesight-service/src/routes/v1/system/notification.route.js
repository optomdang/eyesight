const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const notificationValidation = require('../../../validations/system/notification.validation');
const notificationController = require('../../../controllers/system/notification.controller');
const allRights = require('../../../config/rights');

const router = express.Router();

router
  .route('/send-manual')
  .post(
    auth(allRights.manageNotifications.code),
    validate(notificationValidation.sendManualNotification),
    injectData('body'),
    notificationController.sendManualNotification
  );

router
  .route('/')
  .post(
    auth(allRights.manageNotifications.code),
    validate(notificationValidation.createNotification),
    injectData('body'),
    notificationController.createNotification
  )
  .get(
    auth(allRights.getNotifications.code),
    validate(notificationValidation.getNotifications),
    injectData('query'),
    notificationController.getNotifications
  )
  .delete(
    auth(allRights.manageNotifications.code),
    validate(notificationValidation.deleteNotifications),
    injectData('body'),
    notificationController.deleteNotifications
  );

router
  .route('/:notificationId')
  .get(
    auth(allRights.getNotifications.code),
    validate(notificationValidation.getNotification),
    notificationController.getNotification
  )
  .patch(
    auth(allRights.manageNotifications.code),
    validate(notificationValidation.updateNotification),
    injectData('body'),
    notificationController.updateNotification
  )
  .delete(
    auth(allRights.manageNotifications.code),
    validate(notificationValidation.deleteNotification),
    injectData('body'),
    notificationController.deleteNotification
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management and retrieval
 */

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Create a notification
 *     description: Only admins can create notifications.
 *     tags: [Notifications]
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
 *               - category
 *               - title
 *               - message
 *               - sender
 *               - receiverId
 *               - centerId
 *             properties:
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [info, warning, error, success]
 *               category:
 *                 type: string
 *                 enum: [appointment, inventory, common]
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               sender:
 *                 type: string
 *               receiverId:
 *                 type: integer
 *               isRead:
 *                 type: boolean
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *               url:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               sent:
 *                 type: boolean
 *               centerId:
 *                 type: integer
 *             example:
 *               code: NOTIF001
 *               type: info
 *               category: appointment
 *               title: "Appointment Reminder"
 *               message: "Your appointment is tomorrow."
 *               sender: "System"
 *               receiverId: 1
 *               isRead: false
 *               priority: normal
 *               url: "/appointments/123"
 *               scheduledAt: "2023-10-04T10:00:00Z"
 *               sent: false
 *               centerId: 1
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Notification'
 *       "400":
 *         $ref: '#/components/responses/DuplicateCode'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all notifications
 *     description: Only admins can retrieve all notifications.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Notification code
 *       - in: query
 *         name: receiverId
 *         schema:
 *           type: integer
 *         description: Receiver ID
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
 *         description: Maximum number of notifications
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
 *                     $ref: '#/components/schemas/Notification'
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
 * /notifications/{notificationId}:
 *   get:
 *     summary: Get a notification
 *     description: Only admins can fetch notification information.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Notification'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a notification
 *     description: Only admins can update notification information.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *               category:
 *                 type: string
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               sender:
 *                 type: string
 *               receiverId:
 *                 type: integer
 *               isRead:
 *                 type: boolean
 *               priority:
 *                 type: string
 *               url:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               sent:
 *                 type: boolean
 *               centerId:
 *                 type: integer
 *             example:
 *               code: NOTIF002
 *               title: "Updated Reminder"
 *               message: "Your appointment is today."
 *               isRead: true
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Notification'
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
 *     summary: Delete a notification
 *     description: Only admins can delete notifications.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
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
