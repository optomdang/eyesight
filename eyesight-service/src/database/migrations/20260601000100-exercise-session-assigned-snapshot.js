/** @type {import('sequelize-cli').Migration} */
/**
 * P2 — Snapshot "số được giao" vào ExerciseSession.
 *   executionCount     = ExerciseConfig.executionCount (số lần/buổi)
 *   executionDuration  = ExerciseConfig.duration (phút/lượt)
 * Gán 1 lần lúc tạo buổi → khóa lịch sử (sửa config sau không ảnh hưởng buổi cũ).
 * Backfill buổi cũ từ config hiện tại (best-effort).
 */
const logger = require('../../config/logger');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('ExerciseSessions', 'executionCount', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Số lần được giao trong buổi (snapshot từ ExerciseConfig.executionCount)',
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
      logger.info('Column executionCount already exists in ExerciseSessions, skipping');
    }
    try {
      await queryInterface.addColumn('ExerciseSessions', 'executionDuration', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Phút/lượt được giao (snapshot từ ExerciseConfig.duration)',
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
      logger.info('Column executionDuration already exists in ExerciseSessions, skipping');
    }

    // Backfill từ config hiện tại cho các buổi đã có.
    const [, meta] = await queryInterface.sequelize.query(`
      UPDATE "ExerciseSessions" es
      SET "executionCount" = ec."executionCount",
          "executionDuration" = ec."duration"
      FROM "ExerciseAssignments" ea
      JOIN "ExerciseConfigs" ec ON ea."exerciseConfigId" = ec.id
      WHERE es."exerciseAssignmentId" = ea.id
        AND es."executionCount" IS NULL
    `);
    logger.info('P2 backfill: ExerciseSessions assigned snapshot', { rowCount: meta?.rowCount });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ExerciseSessions', 'executionCount');
    await queryInterface.removeColumn('ExerciseSessions', 'executionDuration');
  },
};
