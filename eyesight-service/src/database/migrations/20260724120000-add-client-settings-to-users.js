/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'clientSettings', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
      comment:
        'Per-user client preferences (e.g. screenCalibrations keyed by device fingerprint)',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'clientSettings');
  },
};
