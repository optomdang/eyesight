/** @type {import('sequelize-cli').Migration} */
/**
 * P1 — Bỏ pass/failed cho ExerciseResult: chuẩn hóa status còn `incomplete | completed`.
 *
 * `status` là VARCHAR(20) (không phải PG enum), nên chỉ cần backfill dữ liệu.
 * Mọi lượt đã kết thúc trước đây (passed/failed) → 'completed'.
 * Idempotent: chạy lại an toàn.
 */
const logger = require('../../config/logger');

module.exports = {
  async up(queryInterface) {
    const [, meta] = await queryInterface.sequelize.query(
      `UPDATE "ExerciseResults" SET status = 'completed' WHERE status IN ('passed', 'failed')`
    );
    logger.info('P1 backfill: ExerciseResults passed/failed → completed', { rowCount: meta?.rowCount });
  },

  async down(queryInterface) {
    // Không thể khôi phục chính xác passed/failed (đã mất phân biệt) — đưa về 'passed' để rollback an toàn nhất.
    await queryInterface.sequelize.query(`UPDATE "ExerciseResults" SET status = 'passed' WHERE status = 'completed'`);
    logger.warn('P1 rollback: ExerciseResults completed → passed (không khôi phục được failed)');
  },
};
