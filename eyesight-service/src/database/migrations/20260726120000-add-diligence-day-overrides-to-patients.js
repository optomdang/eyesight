/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Patients', 'diligenceDayOverrides', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
      comment:
        'Doctor/admin overrides for daily diligence calendar: { "YYYY-MM-DD": { status, reason, overriddenBy, overriddenAt } }',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Patients', 'diligenceDayOverrides');
  },
};
