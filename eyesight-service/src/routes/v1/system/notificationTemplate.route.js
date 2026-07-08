const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const injectData = require('../../../middlewares/injectData');
const notificationTemplateValidation = require('../../../validations/system/notificationTemplate.validation');
const notificationTemplateController = require('../../../controllers/system/notificationTemplate.controller');
const allRights = require('../../../config/rights');

const router = express.Router();

router
  .route('/')
  .post(
    auth(allRights.manageNotificationTemplates.code),
    validate(notificationTemplateValidation.createNotificationTemplate),
    injectData('body'),
    notificationTemplateController.createNotificationTemplate
  )
  .get(
    auth(allRights.getNotificationTemplates.code),
    validate(notificationTemplateValidation.getNotificationTemplates),
    injectData('query'),
    notificationTemplateController.getNotificationTemplates
  )
  .delete(
    auth(allRights.manageNotificationTemplates.code),
    validate(notificationTemplateValidation.deleteNotificationTemplates),
    injectData('body'),
    notificationTemplateController.deleteNotificationTemplates
  );

router
  .route('/:templateId')
  .get(
    auth(allRights.getNotificationTemplates.code),
    validate(notificationTemplateValidation.getNotificationTemplate),
    notificationTemplateController.getNotificationTemplate
  )
  .patch(
    auth(allRights.manageNotificationTemplates.code),
    validate(notificationTemplateValidation.updateNotificationTemplate),
    injectData('body'),
    notificationTemplateController.updateNotificationTemplate
  )
  .delete(
    auth(allRights.manageNotificationTemplates.code),
    validate(notificationTemplateValidation.deleteNotificationTemplate),
    injectData('body'),
    notificationTemplateController.deleteNotificationTemplate
  );

// Template utilities
router
  .route('/:templateId/render')
  .post(
    auth(allRights.getNotificationTemplates.code),
    validate(notificationTemplateValidation.renderTemplate),
    notificationTemplateController.renderTemplate
  );

router
  .route('/:templateId/preview')
  .get(
    auth(allRights.getNotificationTemplates.code),
    validate(notificationTemplateValidation.previewTemplate),
    notificationTemplateController.previewTemplate
  );

// Get template by code
router
  .route('/code/:code/:type')
  .get(
    auth(allRights.getNotificationTemplates.code),
    validate(notificationTemplateValidation.getTemplateByCode),
    notificationTemplateController.getTemplateByCode
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: NotificationTemplates
 *   description: Notification template management
 */

/**
 * @swagger
 * /notification-templates:
 *   post:
 *     summary: Create a notification template
 *     description: Admin can create notification templates.
 *     tags: [NotificationTemplates]
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
 *               - name
 *               - type
 *               - category
 *               - event
 *               - content
 *             properties:
 *               code:
 *                 type: string
 *                 maxLength: 100
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               type:
 *                 type: string
 *                 enum: [email, zalo, sms]
 *               category:
 *                 type: string
 *                 enum: [exam, exercise, system, reminder]
 *               event:
 *                 type: string
 *                 enum: [reminder, start, complete, custom]
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *               isDefault:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *               centerId:
 *                 type: integer
 *             example:
 *               code: "EXAM_REMINDER_EMAIL_CUSTOM"
 *               name: "Custom Exam Reminder Email"
 *               type: "email"
 *               category: "exam"
 *               event: "reminder"
 *               subject: "Nhắc nhở lịch kiểm tra - {{clinicName}}"
 *               content: "Xin chào {{patientName}}, bạn có lịch kiểm tra vào {{examDate}}"
 *               variables: ["patientName", "examDate", "clinicName"]
 *               isDefault: false
 *               isActive: true
 *     responses:
 *       "201":
 *         description: Created
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all notification templates
 *     description: Admin can retrieve all notification templates.
 *     tags: [NotificationTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [email, zalo, sms]
 *         description: Template type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [exam, exercise, system, reminder]
 *         description: Template category
 *       - in: query
 *         name: event
 *         schema:
 *           type: string
 *           enum: [reminder, start, complete, custom]
 *         description: Template event
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
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
 *         description: Maximum number of templates
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
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /notification-templates/{id}:
 *   get:
 *     summary: Get a notification template
 *     description: Admin can fetch notification templates.
 *     tags: [NotificationTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template id
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a notification template
 *     description: Admin can update notification templates.
 *     tags: [NotificationTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *             example:
 *               name: "Updated Template Name"
 *               content: "Updated template content with {{variable}}"
 *     responses:
 *       "200":
 *         description: OK
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a notification template
 *     description: Admin can delete notification templates.
 *     tags: [NotificationTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template id
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
