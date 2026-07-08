/** @type {import('sequelize-cli').Migration} */

const hasIndex = (indexes, name) =>
  (indexes || []).some((index) => index.name === name);

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables({ transaction });
      const hasTreatmentPackages = tables.includes('TreatmentPackages');
      const hasPatientTreatmentPackages = tables.includes('PatientTreatmentPackages');

      if (!hasTreatmentPackages) {
        await queryInterface.createTable(
          'TreatmentPackages',
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
            name: {
              type: Sequelize.STRING(255),
              allowNull: false,
            },
            code: {
              type: Sequelize.STRING(100),
              allowNull: false,
            },
            durationDays: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 30,
              comment: 'Số ngày sử dụng gói kể từ ngày gán cho bệnh nhân',
            },
            exerciseConfigIds: {
              type: Sequelize.JSONB,
              allowNull: false,
              defaultValue: [],
              comment: 'Danh sách ID chế độ tập luyện được phép trong gói',
            },
            deleted: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            createdBy: {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            updatedBy: {
              type: Sequelize.INTEGER,
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
      }

      const treatmentPackageIndexes = hasTreatmentPackages
        ? await queryInterface.showIndex('TreatmentPackages', { transaction })
        : [];
      if (!hasIndex(treatmentPackageIndexes, 'idx_treatment_packages_center_code')) {
        await queryInterface.addIndex('TreatmentPackages', ['centerId', 'code'], {
          name: 'idx_treatment_packages_center_code',
          unique: true,
          transaction,
        });
      }

      if (!hasPatientTreatmentPackages) {
        await queryInterface.createTable(
          'PatientTreatmentPackages',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
            },
            patientId: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            treatmentPackageId: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            centerId: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            assignedAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            expiresAt: {
              type: Sequelize.DATE,
              allowNull: false,
            },
            assignedBy: {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            status: {
              type: Sequelize.STRING(20),
              allowNull: false,
              defaultValue: 'active',
              comment: 'active | expired | cancelled',
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
      }

      const patientPackageIndexes = await queryInterface.showIndex('PatientTreatmentPackages', {
        transaction,
      });

      if (!hasIndex(patientPackageIndexes, 'idx_patient_treatment_packages_patient_status')) {
        await queryInterface.addIndex('PatientTreatmentPackages', ['patientId', 'status'], {
          name: 'idx_patient_treatment_packages_patient_status',
          transaction,
        });
      }

      if (!hasIndex(patientPackageIndexes, 'idx_patient_treatment_packages_package')) {
        await queryInterface.addIndex('PatientTreatmentPackages', ['treatmentPackageId'], {
          name: 'idx_patient_treatment_packages_package',
          transaction,
        });
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
      await queryInterface.dropTable('PatientTreatmentPackages', { transaction });
      await queryInterface.dropTable('TreatmentPackages', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
