/** @type {import('sequelize-cli').Migration} */

/**
 * Recreate warranty tables to match current Sequelize models.
 * Safe when tables are empty (dev schema drift from earlier prototype).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('WarrantyAgreementPhases', { transaction });
      await queryInterface.dropTable('WarrantyAgreements', { transaction });

      await queryInterface.createTable(
        'WarrantyAgreements',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          centerId: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          patientId: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          doctorId: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          policyVersion: {
            type: Sequelize.STRING(32),
            allowNull: false,
          },
          status: {
            type: Sequelize.STRING(32),
            allowNull: false,
            defaultValue: 'draft',
          },
          packageSnapshot: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          patientSnapshot: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          deleted: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('WarrantyAgreements', ['patientId'], {
        name: 'idx_warranty_agreements_patient',
        transaction,
      });
      await queryInterface.addIndex('WarrantyAgreements', ['centerId'], {
        name: 'idx_warranty_agreements_center',
        transaction,
      });

      await queryInterface.createTable(
        'WarrantyAgreementPhases',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          agreementId: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          phaseType: {
            type: Sequelize.STRING(20),
            allowNull: false,
          },
          phaseNumber: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
          },
          status: {
            type: Sequelize.STRING(32),
            allowNull: false,
            defaultValue: 'draft',
          },
          clinicalData: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          guardianSignature: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          doctorSignature: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          documentHash: {
            type: Sequelize.STRING(128),
            allowNull: true,
          },
          completedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('WarrantyAgreementPhases', ['agreementId'], {
        name: 'idx_warranty_phases_agreement',
        transaction,
      });
      await queryInterface.addIndex('WarrantyAgreementPhases', ['agreementId', 'phaseNumber'], {
        name: 'idx_warranty_phases_agreement_number',
        unique: true,
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('WarrantyAgreementPhases');
    await queryInterface.dropTable('WarrantyAgreements');
  },
};
