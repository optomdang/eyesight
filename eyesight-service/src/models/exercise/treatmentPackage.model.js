const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

class TreatmentPackage extends Model {
  static async isDuplicateCode(code, centerId, excludeId) {
    const whereClause = { code, centerId, deleted: false };
    if (excludeId != null) {
      whereClause.id = { [Op.ne]: Number(excludeId) };
    }
    return Boolean(await this.findOne({ where: whereClause }));
  }
}

TreatmentPackage.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    centerId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    code: { type: DataTypes.STRING(100), allowNull: false },
    durationDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    exerciseConfigIds: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    packageType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'custom',
    },
    deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
    updatedBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    modelName: 'TreatmentPackage',
    tableName: 'TreatmentPackages',
    timestamps: true,
    indexes: [
      {
        name: 'idx_treatment_packages_center_code',
        fields: ['centerId', 'code'],
        unique: true,
      },
    ],
  }
);

module.exports = TreatmentPackage;
