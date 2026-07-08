/**
 * Migration: Add deleted and deletedAt columns to ExerciseSessions
 *
 * This fixes potential bugs where code queries for 'deleted' column but it doesn't exist.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add deleted column (default false)
    await queryInterface.addColumn('ExerciseSessions', 'deleted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Add deletedAt column (nullable timestamp)
    await queryInterface.addColumn('ExerciseSessions', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });

    // Add index for better query performance
    await queryInterface.addIndex('ExerciseSessions', ['deleted'], {
      name: 'idx_exercise_sessions_deleted',
    });

    console.log('Added deleted and deletedAt columns to ExerciseSessions');
  },

  down: async (queryInterface, _Sequelize) => {
    // Remove index
    await queryInterface.removeIndex('ExerciseSessions', 'idx_exercise_sessions_deleted');

    // Remove columns
    await queryInterface.removeColumn('ExerciseSessions', 'deletedAt');
    await queryInterface.removeColumn('ExerciseSessions', 'deleted');

    console.log('Removed deleted and deletedAt columns from ExerciseSessions');
  },
};
