const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const useDbSsl = process.env.DB_USE_SSL === 'true';

const dialectOptions = {
  connectTimeout: 30000,
};

if (useDbSsl) {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false,
  };
}

const baseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  dialect: 'postgres',
  logging: false,
  dialectOptions,
};

module.exports = {
  development: {
    ...baseConfig,
    database: process.env.DB_NAME || 'eyesight_dev',
    migrationStoragePath: 'src/database/migrations',
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000,
    },
  },
  production: {
    ...baseConfig,
    database: process.env.DB_NAME || 'eyesight_prod',
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000,
    },
  },
};
