/** @type {import('sequelize-cli').Migration} */
/**
 * Performance: Composite indexes for dashboard / report queries.
 *
 * Every dashboard query filters by (centerId + createdAt range) and usually status.
 * The existing index set has no (centerId, createdAt[, status]) composite, so Postgres
 * cannot range-scan efficiently for the dashboards. This migration adds the missing
 * composites. All indexes are additive and created CONCURRENTLY-safe via IF NOT EXISTS
 * guards (idempotent re-run).
 *
 * Impact: faster dashboard reads; marginal write overhead.
 */

const logger = require('../../config/logger');

const addIndexIfNotExists = async (queryInterface, table, fields, options) => {
  try {
    await queryInterface.addIndex(table, fields, options);
    logger.info(`Created index: ${options.name}`);
  } catch (error) {
    if (/already exists/i.test(error.message)) {
      logger.info(`Index already exists, skipping: ${options.name}`);
    } else {
      throw error;
    }
  }
};

const INDEXES = [
  // ExerciseResults: KPI / trend / breakdown / training-hours all filter centerId + createdAt + status IN (passed,failed)
  {
    table: 'ExerciseResults',
    fields: ['centerId', 'status', 'createdAt'],
    name: 'idx_exerciseresult_center_status_created',
    comment: 'Dashboard: center + status filter + date range',
  },
  // ExamResults: KPI / trend filter centerId + createdAt + status
  {
    table: 'ExamResults',
    fields: ['centerId', 'status', 'createdAt'],
    name: 'idx_examresult_center_status_created',
    comment: 'Dashboard: center + status filter + date range',
  },
  // ExamResults: patient-correlation filters centerId + examType + completedAt + status='completed'
  {
    table: 'ExamResults',
    fields: ['centerId', 'examType', 'completedAt'],
    name: 'idx_examresult_center_examtype_completed',
    comment: 'Correlation: center + exam type + completedAt range',
  },
  // ExerciseSessions: compliance LEFT JOIN on assignmentId with createdAt BETWEEN
  {
    table: 'ExerciseSessions',
    fields: ['exerciseAssignmentId', 'createdAt'],
    name: 'idx_exercisesession_assignment_created',
    comment: 'Compliance: sessions per assignment within date range',
  },
  // AuditLogs: login-trend filters centerId + action + occurredAt range
  {
    table: 'AuditLogs',
    fields: ['centerId', 'action', 'occurredAt'],
    name: 'idx_auditlog_center_action_occurred',
    comment: 'Login trend: center + action + occurredAt range',
  },
];

module.exports = {
  async up(queryInterface) {
    logger.info('Adding dashboard composite indexes', { migration: '20260531000000' });
    for (const idx of INDEXES) {
      // eslint-disable-next-line no-await-in-loop
      await addIndexIfNotExists(queryInterface, idx.table, idx.fields, {
        name: idx.name,
        comment: idx.comment,
      });
    }
    logger.info('Dashboard composite indexes completed', { migration: '20260531000000' });
  },

  async down(queryInterface) {
    logger.info('Removing dashboard composite indexes', { migration: '20260531000000' });
    for (const idx of INDEXES) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.removeIndex(idx.table, idx.name);
        logger.info('Removed index', { indexName: idx.name, table: idx.table });
      } catch (error) {
        logger.warn(`Could not remove index ${idx.name} from ${idx.table}: ${error.message}`);
      }
    }
  },
};
