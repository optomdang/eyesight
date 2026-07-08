/**
 * Migration: Add deleted and deletedAt columns to ExerciseAssignments
 *
 * This fixes the bug where code queries for 'deleted' column but it doesn't exist.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add deleted column (default false)
    await queryInterface.addColumn('ExerciseAssignments', 'deleted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Add deletedAt column (nullable timestamp)
    await queryInterface.addColumn('ExerciseAssignments', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });

    // Add index for better query performance
    await queryInterface.addIndex('ExerciseAssignments', ['deleted'], {
      name: 'idx_exercise_assignments_deleted',
    });

    console.log('Added deleted and deletedAt columns to ExerciseAssignments');
  },

  down: async (queryInterface, _Sequelize) => {
    // Remove index
    await queryInterface.removeIndex('ExerciseAssignments', 'idx_exercise_assignments_deleted');

    // Remove columns
    await queryInterface.removeColumn('ExerciseAssignments', 'deletedAt');
    await queryInterface.removeColumn('ExerciseAssignments', 'deleted');

    console.log('Removed deleted and deletedAt columns from ExerciseAssignments');
  },
};
