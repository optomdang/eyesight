const express = require('express');
// ...existing code...
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('../../docs/swagger');

const router = express.Router();

router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'EyeSight API Documentation',
  })
);

router.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

module.exports = router;
