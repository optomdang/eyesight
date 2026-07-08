/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ExerciseAssignments', 'trainingEye', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Per-patient training eye override: right, left, or both (worse eye). Falls back to exerciseConfig.eye when null.',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ExerciseAssignments', 'trainingEye');
  },
};
