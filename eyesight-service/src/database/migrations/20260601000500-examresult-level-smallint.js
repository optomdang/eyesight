/** @type {import('sequelize-cli').Migration} */
/**
 * P3 — ExamResult.{leftEyeLevel,rightEyeLevel,bothEyeLevel}: STRING(50) → SMALLINT.
 * Sửa nợ kỹ thuật D2: bỏ CAST rườm rà + bug so-chuỗi "9">"10" ở cache.
 * Convert: chuỗi rỗng/không phải số → NULL.
 */
const logger = require('../../config/logger');

const COLS = ['leftEyeLevel', 'rightEyeLevel', 'bothEyeLevel'];

module.exports = {
  async up(queryInterface) {
    const sql = queryInterface.sequelize;
    for (const col of COLS) {
      // eslint-disable-next-line no-await-in-loop
      await sql.query(
        `ALTER TABLE "ExamResults" ALTER COLUMN "${col}" TYPE SMALLINT
         USING (CASE WHEN trim("${col}"::text) ~ '^[0-9]+$' THEN trim("${col}"::text)::smallint ELSE NULL END)`
      );
    }
    logger.info('P3: ExamResults level columns → SMALLINT', { columns: COLS });
  },

  async down(queryInterface) {
    const sql = queryInterface.sequelize;
    for (const col of COLS) {
      // eslint-disable-next-line no-await-in-loop
      await sql.query(`ALTER TABLE "ExamResults" ALTER COLUMN "${col}" TYPE VARCHAR(50) USING ("${col}"::varchar)`);
    }
  },
};
