const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const { connectDB } = require('./config/db');
const {
  backfillDefaultExerciseModesForAllCenters,
} = require('./services/system/defaultExerciseModes.service');

logger.info('Starting application...');

let server;

const MAX_DB_RETRIES = 8;
const DB_RETRY_BASE_MS = 2000;

/**
 * Keep every existing center in sync with DEFAULT_EXERCISE_MODES.
 * When catalog adds new system training modes, each deploy creates the missing
 * rows for old centers (idempotent). Failures are logged and never block boot.
 */
const syncSystemExerciseModes = async () => {
  try {
    const result = await backfillDefaultExerciseModesForAllCenters(null);
    if (result.created > 0) {
      logger.info(
        `System exercise modes synced: +${result.created} across ${result.centers} center(s) (${result.skipped} already present)`
      );
    } else {
      logger.info(
        `System exercise modes up to date for ${result.centers} center(s) (${result.skipped} skipped)`
      );
    }
  } catch (err) {
    logger.error('Failed to sync system exercise modes (non-fatal):', err);
  }
};

const connectDatabaseWithRetry = async (attempt = 1) => {
  try {
    await connectDB();
    logger.info('Connected to Postgres');
    void syncSystemExerciseModes().catch((err) => {
      logger.error('Unhandled sync error (non-fatal):', err);
    });
  } catch (err) {
    logger.error(`Database connection failed (attempt ${attempt}/${MAX_DB_RETRIES}):`, err);
    if (attempt < MAX_DB_RETRIES) {
      const delayMs = Math.min(DB_RETRY_BASE_MS * attempt, 15000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return connectDatabaseWithRetry(attempt + 1);
    }
    logger.error(
      'Database connection failed after all retries — health check stays up; API calls need DB'
    );
  }
};

// Listen immediately so Render health check (/api/v1/version) passes during deploy.
// Previously connectDB() blocked listen(); cold Neon + catalog sync caused deploy/login timeouts.
server = app.listen(config.port, () => {
  logger.info(`Listening to port ${config.port}`);
});

void connectDatabaseWithRetry();

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
