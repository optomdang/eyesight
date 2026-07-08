/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE "ExerciseConfigs"
      SET "configType" = 'admin'
      WHERE "configType" = 'system';
    `);
  },

  async down(queryInterface) {
    // Cannot reliably restore which rows were originally `system`
  },
};
