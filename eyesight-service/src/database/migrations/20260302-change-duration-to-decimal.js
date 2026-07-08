module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change duration from INTEGER to DECIMAL(5,2) to support fractional minutes (0.5, 1.5, etc.)
    await queryInterface.changeColumn('ExerciseConfigs', 'duration', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Duration per session in minutes (supports 0.5 increments)',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to INTEGER (data loss warning: fractional values will be truncated)
    await queryInterface.changeColumn('ExerciseConfigs', 'duration', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Duration per session in minutes',
    });
  },
};
