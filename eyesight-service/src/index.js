const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const { connectDB } = require('./config/db');
const {
  backfillDefaultExerciseModesForAllCenters,
} = require('./services/system/defaultExerciseModes.service');

logger.info('Starting application...');

let server;

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

connectDB()
  .then(async () => {
    logger.info('Connected to Postgres');
    await syncSystemExerciseModes();
    server = app.listen(config.port, () => {
      logger.info(`Listening to port ${config.port}`);
    });
  })
  .catch((err) => {
    logger.error('Database connection failed:', err);
    process.exit(1);
  });

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
