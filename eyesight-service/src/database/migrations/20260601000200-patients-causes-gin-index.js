/** @type {import('sequelize-cli').Migration} */
/**
 * P5 — GIN index cho Patients.causes (ARRAY(STRING)).
 * Chart "Tỉ lệ cải thiện theo nhóm nguyên nhân" lọc bằng `causes && ARRAY[...]` (Op.overlap).
 * GIN cho phép dùng index với toán tử overlap/contains trên mảng.
 */
const logger = require('../../config/logger');

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS "idx_patients_causes_gin" ON "Patients" USING GIN ("causes")'
    );
    logger.info('P5: created GIN index idx_patients_causes_gin on Patients(causes)');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "idx_patients_causes_gin"');
  },
};
