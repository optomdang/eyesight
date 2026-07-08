/** @type {import('sequelize-cli').Migration} */
/**
 * Add composite index on Patients (centerId, deleted, treatmentStatus)
 * to optimize queries for active patients in multi-tenant environments.
 */
const logger = require('../../config/logger');

module.exports = {
  async up(queryInterface) {
    try {
      await queryInterface.addIndex('Patients', ['centerId', 'deleted', 'treatmentStatus'], {
        name: 'idx_patients_center_deleted_status',
        comment: 'Composite: centerId + deleted + treatmentStatus lookup',
      });
      logger.info('Created composite index: idx_patients_center_deleted_status on Patients');
    } catch (error) {
      if (/already exists/i.test(error.message)) {
        logger.info('Index idx_patients_center_deleted_status already exists, skipping');
      } else {
        throw error;
      }
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('Patients', 'idx_patients_center_deleted_status');
      logger.info('Removed composite index: idx_patients_center_deleted_status from Patients');
    } catch (error) {
      logger.warn(`Could not remove index idx_patients_center_deleted_status: ${error.message}`);
    }
  },
};
