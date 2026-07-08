/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ============================================
      // This migration standardizes status naming across all tables
      // Database status: incomplete | completed
      // Exercise result status: incomplete | passed | failed
      // ============================================

      // 1. ExerciseResult: Ensure STRING type and correct values
      // If ENUM type exists from old migration, convert to STRING
      const [exerciseResultColumns] = await queryInterface.sequelize.query(
        `SELECT data_type FROM information_schema.columns 
         WHERE table_name = 'ExerciseResults' AND column_name = 'status'`,
        { transaction }
      );

      if (exerciseResultColumns.length > 0 && exerciseResultColumns[0].data_type === 'USER-DEFINED') {
        // Convert ENUM to STRING
        await queryInterface.addColumn(
          'ExerciseResults',
          'status_new',
          {
            type: Sequelize.STRING(20),
            defaultValue: 'incomplete',
          },
          { transaction }
        );

        // Migrate data: not_completed -> incomplete (for backward compatibility)
        await queryInterface.sequelize.query(
          `UPDATE "ExerciseResults" SET status_new = CASE
            WHEN status::text = 'not_completed' THEN 'incomplete'
            ELSE status::text
          END`,
          { transaction }
        );

        await queryInterface.removeColumn('ExerciseResults', 'status', { transaction });
        await queryInterface.renameColumn('ExerciseResults', 'status_new', 'status', { transaction });

        await queryInterface.changeColumn(
          'ExerciseResults',
          'status',
          {
            type: Sequelize.STRING(20),
            defaultValue: 'incomplete',
            allowNull: false,
          },
          { transaction }
        );

        // Drop old ENUM type
        await queryInterface.sequelize.query(`DROP TYPE IF EXISTS exercise_result_status`, { transaction });
      }

      // 2. ExerciseSession: Normalize status values
      // started/in_progress/not_started -> incomplete
      await queryInterface.sequelize.query(
        `UPDATE "ExerciseSessions" SET status = 'incomplete' WHERE status IN ('started', 'in_progress', 'not_started')`,
        { transaction }
      );

      // 3. ExamSession: Normalize status values
      // not_started/in_progress/started -> incomplete
      await queryInterface.sequelize.query(
        `UPDATE "ExamSessions" SET status = 'incomplete' WHERE status IN ('not_started', 'in_progress', 'started')`,
        { transaction }
      );

      // 4. ExamResult: Normalize to incomplete/completed
      await queryInterface.sequelize.query(
        `UPDATE "ExamResults" SET status = 'incomplete' WHERE status NOT IN ('completed', 'incomplete')`,
        { transaction }
      );

      await transaction.commit();
      console.log('Status naming standardized successfully', {
        migration: '20260104100000',
        databaseStatus: 'incomplete | completed',
        exerciseResultStatus: 'incomplete | passed | failed',
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Note: This rollback is for reference only
      // In practice, you may not want to revert to old status values

      // 1. ExerciseSession: incomplete -> started
      await queryInterface.sequelize.query(`UPDATE "ExerciseSessions" SET status = 'started' WHERE status = 'incomplete'`, {
        transaction,
      });

      // 2. ExamSession: incomplete -> not_started
      await queryInterface.sequelize.query(`UPDATE "ExamSessions" SET status = 'not_started' WHERE status = 'incomplete'`, {
        transaction,
      });

      await transaction.commit();
      console.log('Status naming reverted', { migration: '20260104100000' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
