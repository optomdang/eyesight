const express = require('express');
const auth = require('../../../middlewares/auth');
const examNotificationController = require('../../../controllers/exam/examNotification.controller');
const allRights = require('../../../config/rights');

const router = express.Router();

// Exam notification routes for managing exam reminders and notifications

router.route('/reminder').post(auth(allRights.manageExamSessions.code), examNotificationController.scheduleExamReminder);

router
  .route('/start/:sessionId')
  .post(auth(allRights.manageExamSessions.code), examNotificationController.sendExamStartNotification);

router
  .route('/complete/:sessionId')
  .post(auth(allRights.manageExamSessions.code), examNotificationController.sendExamCompleteNotification);

router
  .route('/process-scheduled')
  .post(auth(allRights.manageExamSessions.code), examNotificationController.processScheduledNotifications);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: ExamNotifications
 *   description: Exam notification management
 */

/**
 * @swagger
 * /exam-notifications/reminder:
 *   post:
 *     summary: Schedule exam reminder notification
 *     description: Schedule a reminder notification for an exam session
 *     tags: [ExamNotifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - examSessionId
 *               - reminderTime
 *             properties:
 *               patientId:
 *                 type: integer
 *                 description: Patient ID
 *               examSessionId:
 *                 type: integer
 *                 description: Exam session ID
 *               reminderTime:
 *                 type: string
 *                 format: date-time
 *                 description: When to send the reminder
 *             example:
 *               patientId: 1
 *               examSessionId: 1
 *               reminderTime: "2024-01-01T09:00:00Z"
 *     responses:
 *       "201":
 *         description: Reminder scheduled successfully
 *       "404":
 *         description: Exam session not found
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /exam-notifications/start/{sessionId}:
 *   post:
 *     summary: Send exam start notification
 *     description: Send notification when exam starts
 *     tags: [ExamNotifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exam session ID
 *     responses:
 *       "200":
 *         description: Notification sent successfully
 *       "404":
 *         description: Exam session not found
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /exam-notifications/complete/{sessionId}:
 *   post:
 *     summary: Send exam completion notification
 *     description: Send notification when exam is completed
 *     tags: [ExamNotifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exam session ID
 *     responses:
 *       "200":
 *         description: Notification sent successfully
 *       "404":
 *         description: Exam session not found
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /exam-notifications/process-scheduled:
 *   post:
 *     summary: Process scheduled notifications
 *     description: Manually trigger processing of scheduled notifications
 *     tags: [ExamNotifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Scheduled notifications processed
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
