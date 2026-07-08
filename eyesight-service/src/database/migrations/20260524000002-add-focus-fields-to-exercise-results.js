module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ExerciseResults', 'pauseCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });
    await queryInterface.addColumn('ExerciseResults', 'inactivityCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });
    await queryInterface.addColumn('ExerciseResults', 'focusScore', {
      type: Sequelize.INTEGER,
      defaultValue: 100,
      allowNull: false,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ExerciseResults', 'pauseCount');
    await queryInterface.removeColumn('ExerciseResults', 'inactivityCount');
    await queryInterface.removeColumn('ExerciseResults', 'focusScore');
  },
};
