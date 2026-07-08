module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ExerciseResults', 'resultMetrics', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment:
        'VT Quest clinical results: per-modality threshold, trials, accuracy. Persisted permanently (not cleared on complete unlike exerciseState).',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ExerciseResults', 'resultMetrics');
  },
};
