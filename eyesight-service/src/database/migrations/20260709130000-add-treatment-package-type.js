/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('TreatmentPackages');
    if (!table.packageType) {
      await queryInterface.addColumn('TreatmentPackages', 'packageType', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'custom',
        comment: 'system = catalog default (admin-only edit); custom = center-created',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('TreatmentPackages');
    if (table.packageType) {
      await queryInterface.removeColumn('TreatmentPackages', 'packageType');
    }
  },
};
