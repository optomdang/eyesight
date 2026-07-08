const express = require('express');
const auth = require('../../../middlewares/auth');
const zaloWebhookController = require('../../../controllers/zalo/zaloWebhook.controller');
const allRights = require('../../../config/rights');

const router = express.Router();

// Zalo webhook endpoint (không cần auth vì từ Zalo server)
router.route('/webhook').post(zaloWebhookController.handleZaloWebhook);

// Patient linking endpoints
router
  .route('/patients/:patientId/link')
  .post(auth(allRights.managePatients.code), zaloWebhookController.linkPatientZalo)
  .get(auth(allRights.getPatients.code), zaloWebhookController.getPatientZaloInfo);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: ZaloIntegration
 *   description: Zalo webhook and patient linking
 */

/**
 * @swagger
 * /zalo/webhook:
 *   post:
 *     summary: Zalo webhook endpoint
 *     description: Receive webhooks from Zalo OA when users interact
 *     tags: [ZaloIntegration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event_name:
 *                 type: string
 *                 example: user_send_text
 *               sender:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "1234567890"
 *               message:
 *                 type: object
 *                 properties:
 *                   text:
 *                     type: string
 *                     example: "0123456789"
 *     responses:
 *       "200":
 *         description: Webhook processed successfully
 */

/**
 * @swagger
 * /zalo/patients/{patientId}/link:
 *   post:
 *     summary: Manually link patient with Zalo
 *     description: Link a patient account with Zalo User ID
 *     tags: [ZaloIntegration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               zaloUserId:
 *                 type: string
 *                 description: Zalo User ID
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number to auto-link
 *             example:
 *               zaloUserId: "1234567890"
 *               phoneNumber: "0123456789"
 *     responses:
 *       "200":
 *         description: Link successful
 *       "404":
 *         description: Patient not found
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get patient Zalo connection info
 *     description: Check if patient is connected to Zalo
 *     tags: [ZaloIntegration]
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
 *         description: Zalo connection info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patientId:
 *                   type: integer
 *                 zaloUserId:
 *                   type: string
 *                 hasZaloConnection:
 *                   type: boolean
 *       "404":
 *         description: Patient not found
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
