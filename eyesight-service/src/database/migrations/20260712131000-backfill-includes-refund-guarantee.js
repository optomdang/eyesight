/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE "TreatmentPackages"
      SET "includesRefundGuarantee" = true
      WHERE code IN ('AMBLYOPIA_ULTRA', 'AMBLYOPIA_ULTIMATE')
        AND deleted = false;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE "TreatmentPackages"
      SET "includesRefundGuarantee" = false
      WHERE code IN ('AMBLYOPIA_ULTRA', 'AMBLYOPIA_ULTIMATE');
    `);
  },
};
