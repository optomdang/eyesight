module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ExerciseSessions', 'pauseCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });
    await queryInterface.addColumn('ExerciseSessions', 'inactivityCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });
    await queryInterface.addColumn('ExerciseSessions', 'focusScore', {
      type: Sequelize.INTEGER,
      defaultValue: 100,
      allowNull: false,
    });
    await queryInterface.addIndex('ExerciseSessions', ['focusScore'], {
      name: 'idx_exercise_sessions_focus_score',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('ExerciseSessions', 'idx_exercise_sessions_focus_score');
    await queryInterface.removeColumn('ExerciseSessions', 'pauseCount');
    await queryInterface.removeColumn('ExerciseSessions', 'inactivityCount');
    await queryInterface.removeColumn('ExerciseSessions', 'focusScore');
  },
};
