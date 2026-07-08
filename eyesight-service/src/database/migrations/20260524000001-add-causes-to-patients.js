module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Patients', 'causes', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: [],
      allowNull: false,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('Patients', 'causes');
  },
};
