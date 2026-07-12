/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('TreatmentPackages', { transaction });
      if (!table.includesRefundGuarantee) {
        await queryInterface.addColumn(
          'TreatmentPackages',
          'includesRefundGuarantee',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Gói có cam kết hoàn tiền nếu không cải thiện (Ultra/Ultimate)',
          },
          { transaction }
        );
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('TreatmentPackages', { transaction });
      if (table.includesRefundGuarantee) {
        await queryInterface.removeColumn('TreatmentPackages', 'includesRefundGuarantee', { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
