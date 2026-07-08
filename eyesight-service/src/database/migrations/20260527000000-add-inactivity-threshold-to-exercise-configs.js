module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ExerciseConfigs', 'inactivityThreshold', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 30,
      comment: 'Seconds of no game moves before an inactivity event is recorded. Defaults to 30s.',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ExerciseConfigs', 'inactivityThreshold');
  },
};
