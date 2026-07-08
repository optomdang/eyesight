const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

class PatientTreatmentPackage extends Model {}

PatientTreatmentPackage.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    patientId: { type: DataTypes.INTEGER, allowNull: false },
    treatmentPackageId: { type: DataTypes.INTEGER, allowNull: false },
    centerId: { type: DataTypes.INTEGER, allowNull: false },
    assignedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    assignedBy: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
    },
    deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    sequelize,
    modelName: 'PatientTreatmentPackage',
    tableName: 'PatientTreatmentPackages',
    timestamps: true,
  }
);

module.exports = PatientTreatmentPackage;
