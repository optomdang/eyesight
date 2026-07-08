module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ExerciseConfigs', 'vtSettings', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment:
        'VT Quest game configuration: modalities, staircase params, stimulus params, gamification theme',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ExerciseConfigs', 'vtSettings');
  },
};
