const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const config = require('./config/config');
const morgan = require('./config/morgan');
const logger = require('./config/logger');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');
const sentry = require('./config/sentry'); // Import Sentry configuration
const {
  examNotificationService,
  examSchedulerService,
  exerciseNotificationService,
  exerciseSchedulerService,
} = require('./services');
const packageJson = require('../package.json');

const app = express();

// Initialize Sentry FIRST (before any other middleware)
sentry.initSentry(app);

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(helmet());

// parse json request body - Increased limit for base64 images
app.use(express.json({ limit: '1mb' }));

// parse urlencoded request body
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// sanitize request data
app.use(xss());

// gzip compression
app.use(compression());

// enable cors — production: set CORS_ORIGINS=https://app.nhuocthi.vn,https://nhuocthi.vn
const defaultCorsOrigins = [
  'http://localhost:4001',
  'http://localhost',
  'https://plankton-app-i43v5.ondigitalocean.app',
  'https://sea-lion-app-xajc7.ondigitalocean.app',
  'https://app.nhuocthi.vn',
  'https://nhuocthi.vn',
  'https://www.nhuocthi.vn',
];
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  : defaultCorsOrigins;

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.options('*', cors());

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/api/v1/auth', authLimiter);
}

// Health check and version endpoint
app.get('/api/v1/version', (req, res) => {
  res.json({
    version: packageJson.version,
    environment: config.env,
    name: packageJson.name,
  });
});

// v1 api routes
app.use('/api/v1', routes);

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// Sentry Express error handler (v8+) MUST be AFTER all routes and BEFORE other error handlers
sentry.setupExpressErrorHandler(app);

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

// Global flag to prevent duplicate scheduler initialization
global.schedulersInitialized = global.schedulersInitialized || false;

// Start schedulers for notifications and session creation
// Only start once - prevent duplicate initialization on hot reload
// Can be disabled via DISABLE_SCHEDULERS=true env variable
const schedulersEnabled = process.env.DISABLE_SCHEDULERS !== 'true';

if (config.env !== 'test' && schedulersEnabled && !global.schedulersInitialized) {
  global.schedulersInitialized = true;

  logger.info('Initializing cron schedulers...');

  // Exam session scheduler - creates ExamSession daily at 6 AM
  examSchedulerService.startExamScheduler();

  // Exam notification scheduler - sends reminders daily at 9 AM
  examNotificationService.startNotificationScheduler();

  // Exercise notification scheduler (every 10 minutes)
  if (exerciseNotificationService.startExerciseNotificationScheduler) {
    exerciseNotificationService.startExerciseNotificationScheduler();
  }

  // Exercise scheduler - compliance checking (hourly) and session creation
  exerciseSchedulerService.startExerciseSchedulers();

  logger.info('All cron schedulers initialized successfully');
} else if (!schedulersEnabled) {
  logger.warn('Schedulers DISABLED via DISABLE_SCHEDULERS env variable');
}

module.exports = app;
