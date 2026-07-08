const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(4000),
    DB_HOST: Joi.string().required().description('Postgres DB url'),
    DB_PORT: Joi.number().required().description('Postgres DB port'),
    DB_USER: Joi.string().required().description('Postgres DB url'),
    DB_PASSWORD: Joi.string().required().description('Postgres DB url'),
    DB_NAME: Joi.string().required().description('Postgres DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    ZALO_ACCESS_TOKEN: Joi.string().description('Zalo OA access token for notifications'),
    ZALO_APP_ID: Joi.string().description('Zalo app ID'),
    ZALO_APP_SECRET: Joi.string().description('Zalo app secret'),
    SENTRY_DSN: Joi.string().description('Sentry DSN for error tracking'),
    SENTRY_ENVIRONMENT: Joi.string().default('development').description('Sentry environment'),
    SENTRY_TRACES_SAMPLE_RATE: Joi.number().default(0.1).description('Sentry traces sample rate'),
    SENTRY_PROFILES_SAMPLE_RATE: Joi.number().default(0.1).description('Sentry profiles sample rate'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const useDbSsl = process.env.DB_USE_SSL === 'true';
const postgresDialectOptions = {
  connectTimeout: 30000,
};

if (useDbSsl) {
  postgresDialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false,
  };
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  postgres: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    username: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    database: envVars.DB_NAME,
    dialect: 'postgres',
    timezone: '+07:00',
    logging: false,
    pool: {
      max: 50,
      min: 10,
      acquire: 30000,
      idle: 10000,
      evict: 10000,
    },
    dialectOptions: postgresDialectOptions,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      secure: envVars.SMTP_PORT === 465, // true for 465 (SSL), false for other ports
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 30000, // 30 seconds for send operation
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      tls: {
        rejectUnauthorized: false, // Accept self-signed certificates
      },
    },
    from: envVars.EMAIL_FROM,
  },
  zalo: {
    accessToken: envVars.ZALO_ACCESS_TOKEN,
    appId: envVars.ZALO_APP_ID,
    appSecret: envVars.ZALO_APP_SECRET,
  },
  sentry: {
    dsn: envVars.SENTRY_DSN,
    environment: envVars.SENTRY_ENVIRONMENT,
    tracesSampleRate: envVars.SENTRY_TRACES_SAMPLE_RATE,
    profilesSampleRate: envVars.SENTRY_PROFILES_SAMPLE_RATE,
  },
};

module.exports = config;
