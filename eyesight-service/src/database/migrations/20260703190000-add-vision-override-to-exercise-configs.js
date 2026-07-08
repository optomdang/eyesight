/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ExerciseConfigs', 'levelOverride', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'When true, use visionLevel as default difficulty for preview and assignment defaults',
    });
    await queryInterface.addColumn('ExerciseConfigs', 'visionLevel', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Default vision level when levelOverride is true (1-based per visionType)',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ExerciseConfigs', 'visionLevel');
    await queryInterface.removeColumn('ExerciseConfigs', 'levelOverride');
  },
};
