const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

class WarrantyAgreementPhase extends Model {}

WarrantyAgreementPhase.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    agreementId: { type: DataTypes.INTEGER, allowNull: false },
    phaseType: { type: DataTypes.STRING(20), allowNull: false },
    phaseNumber: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'draft',
    },
    clinicalData: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    guardianSignature: { type: DataTypes.JSONB, allowNull: true },
    doctorSignature: { type: DataTypes.JSONB, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    documentHash: { type: DataTypes.STRING(128), allowNull: true },
  },
  {
    sequelize,
    modelName: 'WarrantyAgreementPhase',
    tableName: 'WarrantyAgreementPhases',
    timestamps: true,
    indexes: [
      { name: 'idx_warranty_phases_agreement', fields: ['agreementId'] },
      {
        name: 'idx_warranty_phases_agreement_number',
        fields: ['agreementId', 'phaseNumber'],
        unique: true,
      },
    ],
  }
);

module.exports = WarrantyAgreementPhase;
