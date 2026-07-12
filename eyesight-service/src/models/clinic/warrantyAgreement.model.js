const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

class WarrantyAgreement extends Model {}

WarrantyAgreement.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    centerId: { type: DataTypes.INTEGER, allowNull: false },
    patientId: { type: DataTypes.INTEGER, allowNull: false },
    doctorId: { type: DataTypes.INTEGER, allowNull: false },
    policyVersion: { type: DataTypes.STRING(32), allowNull: false },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'draft',
    },
    packageSnapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    patientSnapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    sequelize,
    modelName: 'WarrantyAgreement',
    tableName: 'WarrantyAgreements',
    timestamps: true,
    indexes: [
      { name: 'idx_warranty_agreements_patient', fields: ['patientId'] },
      { name: 'idx_warranty_agreements_center', fields: ['centerId'] },
    ],
  }
);

module.exports = WarrantyAgreement;
