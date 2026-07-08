const { version } = require('../../package.json');
const config = require('../config/config');

const swaggerDef = {
  openapi: '3.0.0',
  info: {
    title: 'EyeSight Training Service API',
    version,
    description:
      'Comprehensive API for eyesight training system with exercise management, patient tracking, and visual level configurations',
    contact: {
      name: 'EyeSight Team',
      email: 'support@eyesight.com',
    },
    license: {
      name: 'MIT',
      url: 'https://github.com/hagopj13/node-express-boilerplate/blob/master/LICENSE',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/v1`,
      description: 'Development server',
    },
    {
      url: 'https://api.eyesight.com/v1',
      description: 'Production server',
    },
  ],
};

module.exports = swaggerDef;
